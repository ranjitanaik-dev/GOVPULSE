"""
GovPulse — Phase 3.2 Production Dataset Migration CLI
-----------------------------------------------------
Command-line tool to bootstrap legacy production datasets (#3 MGNREGA, #4 PMAY-G)
into MongoDB Community Server 8.2.1 using the approved fencing and reservation gate.

Usage:
  python scripts/migrate_production_datasets.py --baseline-check
  python scripts/migrate_production_datasets.py --dry-run --dataset-id 3
  python scripts/migrate_production_datasets.py --dataset-id 3 --verify-spark
  python scripts/migrate_production_datasets.py --dataset-id 4 --verify-spark
  python scripts/migrate_production_datasets.py --all --verify-spark
  python scripts/migrate_production_datasets.py --reconcile --dataset-id 3
"""

import argparse
import hashlib
import os
import sys
import time

# Ensure backend and workspace root are in python path
sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import func, select
from app.database.db import SessionLocal
from app.database.mongodb import get_mongo_db
from app.models.models import Dataset, MigrationReservation, ProcessingJob
from app.services.legacy_migration_service import (
    bootstrap_legacy_migration,
    reconcile_interrupted_migration,
)
from spark_jobs.ingestion import load_committed_raw_dataset
from spark_jobs.spark_session import get_spark_session


TARGET_DATASETS = [3, 4]


def compute_file_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def check_baseline() -> dict:
    """Verifies and reports the current baseline state across SQLite and MongoDB."""
    mongo = get_mongo_db()
    with SessionLocal() as db:
        total_records = db.execute(
            select(func.sum(Dataset.valid_records)).where(Dataset.status == "processed")
        ).scalar() or 0

        completed_jobs = db.execute(
            select(func.count()).select_from(ProcessingJob).where(ProcessingJob.status == "completed")
        ).scalar() or 0

        datasets = {}
        for ds_id in TARGET_DATASETS:
            ds = db.get(Dataset, ds_id)
            if ds:
                datasets[ds_id] = {
                    "id": ds.id,
                    "scheme_id": ds.scheme_id,
                    "status": ds.status,
                    "valid_records": ds.valid_records,
                    "attempt_number": ds.attempt_number,
                    "lease_id": ds.lease_id,
                    "reporting_year": ds.reporting_year,
                    "file_path": ds.file_path,
                    "file_hash": ds.file_hash,
                }

    mongo_catalogs = {}
    for ds_id in TARGET_DATASETS:
        doc = mongo.dataset_catalog.find_one({"dataset_id": ds_id})
        mongo_catalogs[ds_id] = {
            "exists": doc is not None,
            "status": doc.get("status") if doc else None,
            "attempt_number": doc.get("attempt_number") if doc else None,
            "record_count": doc.get("raw_record_count") if doc else None,
        }

    return {
        "sqlite_total_records": total_records,
        "sqlite_completed_jobs": completed_jobs,
        "datasets": datasets,
        "mongo_catalogs": mongo_catalogs,
    }


def dry_run_dataset(dataset_id: int):
    """Performs dry-run checks for a dataset without writing to any database."""
    print(f"\n[DRY RUN] Inspecting Dataset #{dataset_id}...")
    with SessionLocal() as db:
        ds = db.get(Dataset, dataset_id)
        if not ds:
            raise ValueError(f"Dataset #{dataset_id} not found in SQLite.")

        print(f"  Scheme: {ds.scheme_id}")
        print(f"  SQLite Status: {ds.status}")
        print(f"  SQLite Valid Records: {ds.valid_records}")
        print(f"  SQLite Reporting Year: {ds.reporting_year}")
        print(f"  File Path: {ds.file_path}")

        if not os.path.exists(ds.file_path):
            raise FileNotFoundError(f"Source file {ds.file_path} does not exist!")

        file_size = os.path.getsize(ds.file_path)
        sha256 = compute_file_sha256(ds.file_path)
        print(f"  File Size: {file_size} bytes")
        print(f"  File SHA-256: {sha256}")

        # Check existing reservations
        res = db.execute(
            select(MigrationReservation).where(MigrationReservation.dataset_id == dataset_id)
        ).scalar_one_or_none()
        if res:
            print(f"  [WARN] Pending reservation exists: ID={res.reservation_id}, Expires={res.expires_at}")
        else:
            print("  Reservation Gate: CLEAN (no pending reservations)")

    mongo = get_mongo_db()
    cat_doc = mongo.dataset_catalog.find_one({"dataset_id": dataset_id})
    if cat_doc:
        print(f"  MongoDB Catalog: EXISTS (status={cat_doc.get('status')}, attempt={cat_doc.get('attempt_number')})")
    else:
        print("  MongoDB Catalog: NONE (ready for initial bootstrap)")

    raw_count = mongo.raw_records.count_documents({"dataset_id": dataset_id})
    print(f"  MongoDB Raw Records: {raw_count}")
    print(f"[DRY RUN] Dataset #{dataset_id} pre-conditions verified successfully.")


def migrate_single_dataset(dataset_id: int, verify_spark: bool = True):
    """Executes legacy bootstrap migration for a single production dataset."""
    print(f"\n=======================================================")
    print(f"Starting Production Migration: Dataset #{dataset_id}")
    print(f"=======================================================")

    baseline = check_baseline()
    print(f"Pre-migration baseline: total_records={baseline['sqlite_total_records']}, completed_jobs={baseline['sqlite_completed_jobs']}")

    mongo = get_mongo_db()
    start_time = time.time()

    with SessionLocal() as db:
        ds = db.get(Dataset, dataset_id)
        if not ds:
            raise ValueError(f"Dataset #{dataset_id} not found in SQLite.")

        if ds.status != "processed":
            raise ValueError(f"Dataset #{dataset_id} must have status='processed', found '{ds.status}'.")

        # Check existing catalog
        existing_cat = mongo.dataset_catalog.find_one({"dataset_id": dataset_id})
        if existing_cat and existing_cat.get("status") == "INGESTED":
            print(f"[SKIP] Dataset #{dataset_id} already successfully INGESTED in MongoDB (attempt={existing_cat.get('attempt_number')}).")
            return

        worker_id = f"cli-worker-{os.getpid()}"
        print(f"Executing bootstrap_legacy_migration (worker_id={worker_id})...")
        result = bootstrap_legacy_migration(
            db=db,
            mongo_db=mongo,
            dataset_id=dataset_id,
            worker_id=worker_id,
            batch_size=1000,
        )
        print(f"Bootstrap completed: {result}")

    # Post-migration Verification
    elapsed = time.time() - start_time
    print(f"Migration completed in {elapsed:.2f} seconds.")

    # 1. Verify MongoDB Catalog
    cat_doc = mongo.dataset_catalog.find_one({"dataset_id": dataset_id})
    assert cat_doc is not None, "MongoDB catalog document missing!"
    assert cat_doc["status"] == "INGESTED", f"Expected catalog status INGESTED, got {cat_doc['status']}"
    assert cat_doc["raw_ingestion"]["status"] == "VERIFIED_COMPLETE"
    committed_attempt = cat_doc["attempt_number"]
    committed_lease = cat_doc["committed_lease_id"]
    committed_count = cat_doc["raw_record_count"]

    # 2. Verify MongoDB Raw Records Count & Uniqueness
    raw_count = mongo.raw_records.count_documents({
        "dataset_id": dataset_id,
        "attempt_number": committed_attempt,
        "lease_id": committed_lease,
    })
    assert raw_count == committed_count, f"Raw count mismatch: catalog={committed_count}, actual={raw_count}"

    distinct_row_indices = len(mongo.raw_records.distinct("row_index", {
        "dataset_id": dataset_id,
        "attempt_number": committed_attempt,
    }))
    assert distinct_row_indices == committed_count, f"Distinct row_index mismatch: {distinct_row_indices} != {committed_count}"
    print(f"Verified MongoDB Raw Records: {raw_count} rows, {distinct_row_indices} distinct indices.")

    # 3. Verify SQLite Dataset State
    with SessionLocal() as db:
        ds_after = db.get(Dataset, dataset_id)
        assert ds_after.status == "processed", f"CRITICAL: SQLite status changed from 'processed' to '{ds_after.status}'!"
        assert ds_after.attempt_number == committed_attempt
        assert ds_after.lease_id == committed_lease

        # Verify reservation row was cleaned up
        res_after = db.execute(
            select(MigrationReservation).where(MigrationReservation.dataset_id == dataset_id)
        ).scalar_one_or_none()
        assert res_after is None, "CRITICAL: migration_reservation was not deleted in atomic finalization!"
        print(f"Verified SQLite Dataset #{dataset_id}: status='processed', lease_id={ds_after.lease_id}, reservation cleaned.")

    # 4. Verify Spark committed reader
    if verify_spark:
        print(f"Running Spark verification via load_committed_raw_dataset(spark, {dataset_id})...")
        spark = get_spark_session(f"verify_migration_ds_{dataset_id}")
        df = load_committed_raw_dataset(spark, dataset_id)
        spark_count = df.count()
        assert spark_count == committed_count, f"Spark count mismatch: {spark_count} != {committed_count}"
        print(f"Spark verification SUCCESSFUL: read {spark_count} rows matching committed attempt {committed_attempt}.")

    # 5. Verify Dashboard Metrics Baseline
    post_baseline = check_baseline()
    assert post_baseline["sqlite_total_records"] == baseline["sqlite_total_records"], (
        f"Dashboard records changed! {baseline['sqlite_total_records']} -> {post_baseline['sqlite_total_records']}"
    )
    assert post_baseline["sqlite_completed_jobs"] == baseline["sqlite_completed_jobs"], (
        f"Completed jobs changed! {baseline['sqlite_completed_jobs']} -> {post_baseline['sqlite_completed_jobs']}"
    )
    print(f"Dashboard baseline PRESERVED: total_records={post_baseline['sqlite_total_records']}, completed_jobs={post_baseline['sqlite_completed_jobs']}")
    print(f"=======================================================")
    print(f"Dataset #{dataset_id} Migration & Verification PASSED")
    print(f"=======================================================\n")


def reconcile_dataset(dataset_id: int):
    """Runs reconciliation on any interrupted reservation for a dataset."""
    print(f"\nReconciling Dataset #{dataset_id}...")
    mongo = get_mongo_db()
    with SessionLocal() as db:
        result = reconcile_interrupted_migration(db, mongo, dataset_id)
        print(f"Reconciliation result: {result}")


def main():
    parser = argparse.ArgumentParser(description="GovPulse Phase 3.2 Legacy Migration CLI")
    parser.add_argument("--dataset-id", type=int, choices=[3, 4], help="Target dataset ID (3 for MGNREGA, 4 for PMAY-G)")
    parser.add_argument("--all", action="store_true", help="Migrate all legacy datasets (3 first, then 4)")
    parser.add_argument("--dry-run", action="store_true", help="Inspect without modifying databases")
    parser.add_argument("--baseline-check", action="store_true", help="Report baseline stats and exit")
    parser.add_argument("--reconcile", action="store_true", help="Reconcile interrupted migration reservation")
    parser.add_argument("--verify-spark", action="store_true", default=True, help="Verify Spark load_committed_raw_dataset after migration")
    parser.add_argument("--no-verify-spark", dest="verify_spark", action="store_false")

    args = parser.parse_args()

    if args.baseline_check:
        base = check_baseline()
        print("\n--- GOVPULSE BASELINE SUMMARY ---")
        print(f"SQLite Valid Records (processed): {base['sqlite_total_records']}")
        print(f"SQLite Completed Jobs:            {base['sqlite_completed_jobs']}")
        for ds_id, info in base["datasets"].items():
            print(f"Dataset #{ds_id} ({info['scheme_id']}): status={info['status']}, valid_records={info['valid_records']}, lease={info['lease_id']}")
        for ds_id, info in base["mongo_catalogs"].items():
            print(f"MongoDB Dataset #{ds_id}: exists={info['exists']}, status={info['status']}, attempt={info['attempt_number']}, records={info['record_count']}")
        print("---------------------------------\n")
        return

    if args.dry_run:
        targets = [args.dataset_id] if args.dataset_id else TARGET_DATASETS
        for target in targets:
            dry_run_dataset(target)
        return

    if args.reconcile:
        if not args.dataset_id:
            print("Error: --reconcile requires --dataset-id")
            sys.exit(1)
        reconcile_dataset(args.dataset_id)
        return

    if args.all:
        targets = [3, 4]  # Strict order: 3 first, then 4
    elif args.dataset_id:
        targets = [args.dataset_id]
    else:
        parser.print_help()
        sys.exit(1)

    for target in targets:
        migrate_single_dataset(target, verify_spark=args.verify_spark)


if __name__ == "__main__":
    main()
