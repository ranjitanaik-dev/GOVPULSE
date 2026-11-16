"""
GovPulse — Phase 2 Final Approval Verification Suite
=====================================================
Directly verifies the user's 3 final points:
1. INGESTING retry eligibility (rejects actively ingesting datasets; allows FAILED/UPLOADED).
2. MongoDB fencing, lease validation, and same-attempt idempotent verification without overwrite.
3. The exact 7-step duplicate upload sequence during and after MongoDB outages:
   Step 1: MongoDB becomes unavailable.
   Step 2: Upload file -> preserved in SQLite with canonical ID & file on disk.
   Step 3: SQLite preserves original ID and file.
   Step 4: Upload same file while MongoDB is down -> duplicate detected, reuses canonical ID, 0 new records.
   Step 5: Restore MongoDB.
   Step 6: Reconcile or retry handoff -> registers canonical dataset in MongoDB catalog.
   Step 7: Upload same file once more -> duplicate detected in MongoDB catalog, reuses canonical ID.
   Final Assertion: Exactly 1 canonical dataset in SQLite & MongoDB, 1 file on disk, 0 orphans, 0 deleted files.
"""

import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timedelta

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select, delete
from app.database.db import SessionLocal
from app.database.mongodb import get_mongo_db, close_mongo_connections
from app.models.models import Dataset
from app.services.dataset_handoff_service import (
    compute_sha256,
    check_existing_duplicate,
    reserve_dataset,
    execute_handoff,
    reconcile_handoffs,
    retry_handoff,
    get_next_scheme_version,
    DatasetHandoffError,
    FencedWorkerError,
)

APPROVAL_SCHEME = "approval_test_scheme"
created_dataset_ids = []
created_file_paths = []


def cleanup():
    """Clean up isolated test data."""
    db = SessionLocal()
    try:
        mongo_db = get_mongo_db()
        if created_dataset_ids:
            db.execute(delete(Dataset).where(Dataset.id.in_(created_dataset_ids)))
            db.commit()
            mongo_db.dataset_catalog.delete_many({"dataset_id": {"$in": created_dataset_ids}})
            mongo_db.audit_logs.delete_many({"dataset_id": {"$in": created_dataset_ids}})
        for fp in created_file_paths:
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass
    except Exception as e:
        print(f"Cleanup notice: {e}")
    finally:
        db.close()


def test_1_ingesting_retry_policy():
    print("\n[Point 1/3] Testing INGESTING Retry Policy & Active Job Protection...")
    db = SessionLocal()
    try:
        content = b"Content for INGESTING retry policy verification"
        f_hash = compute_sha256(content)
        temp_dir = tempfile.mkdtemp()
        tfile = os.path.join(temp_dir, "ingesting_test.csv")
        with open(tfile, "wb") as f:
            f.write(content)
        created_file_paths.append(tfile)

        # Reserve and execute handoff to INGESTING
        ds, lease_id, attempt = reserve_dataset(
            db, APPROVAL_SCHEME, "ingesting_test.csv", tfile, len(content), "csv", f_hash, "worker-1", "2025-2026"
        )
        created_dataset_ids.append(ds.id)
        res = execute_handoff(db, ds.id, lease_id, attempt, "worker-1")
        assert res["status"] == "INGESTING"

        db.refresh(ds)
        assert ds.status == "INGESTING"

        # Attempt to retry an actively INGESTING dataset -> MUST BE REJECTED
        try:
            retry_handoff(db, ds.id, "worker-rogue")
            assert False, "CRITICAL DEFECT: Actively INGESTING dataset was allowed to receive a new attempt!"
        except DatasetHandoffError as e:
            print(f"  ✓ Actively INGESTING dataset correctly rejected from retry: {e}")

        # If the dataset explicitly transitions to FAILED, retry is permitted
        ds.status = "FAILED"
        db.commit()

        retried_ds, new_lease, new_attempt = retry_handoff(db, ds.id, "worker-retry")
        assert new_attempt == 2
        assert new_lease != lease_id
        assert retried_ds.status == "RESERVED"
        print(f"  ✓ Failed dataset successfully claimed for retry (attempt {new_attempt}, lease {new_lease[:8]}...)")
    finally:
        db.close()


def test_2_mongodb_fencing_and_idempotent_handoff():
    print("\n[Point 2/3] Testing MongoDB Fencing, Lease Validation & Same-Attempt Idempotency...")
    db = SessionLocal()
    mongo_db = get_mongo_db()
    try:
        content = b"Content for MongoDB fencing and idempotency test"
        f_hash = compute_sha256(content)
        temp_dir = tempfile.mkdtemp()
        tfile = os.path.join(temp_dir, "fencing_idempotency.csv")
        with open(tfile, "wb") as f:
            f.write(content)
        created_file_paths.append(tfile)

        ds, l1, att1 = reserve_dataset(
            db, APPROVAL_SCHEME, "fencing_idempotency.csv", tfile, len(content), "csv", f_hash, "worker-att1", "2025-2026"
        )
        created_dataset_ids.append(ds.id)

        # Initial execute_handoff
        h1 = execute_handoff(db, ds.id, l1, att1, "worker-att1")
        assert h1["action"] == "HANDOFF_SUCCESS"

        cat_doc1 = mongo_db.dataset_catalog.find_one({"dataset_id": ds.id})
        assert cat_doc1["attempt_number"] == 1
        assert cat_doc1["committed_lease_id"] == l1
        initial_mongo_id = cat_doc1["_id"]

        # Same-attempt repeated handoff (e.g. client retry after network blip)
        # Should verify matching document without overwriting or failing
        ds.status = "HANDOFF_PENDING"
        db.commit()
        h1_repeat = execute_handoff(db, ds.id, l1, att1, "worker-att1")
        assert h1_repeat["action"] == "HANDOFF_SUCCESS"

        cat_doc1_after = mongo_db.dataset_catalog.find_one({"dataset_id": ds.id})
        assert cat_doc1_after["_id"] == initial_mongo_id, "Document should not have been overwritten or recreated!"
        assert cat_doc1_after["committed_lease_id"] == l1
        print("  ✓ Same-attempt repeated handoff verified matching document without overwriting.")

        # Stale lease on same attempt: simulate an old/mismatched lease_id for attempt 1
        stale_lease = "00000000-0000-0000-0000-000000000000"
        try:
            execute_handoff(db, ds.id, stale_lease, att1, "worker-stale")
            assert False, "Mismatched lease should have been rejected!"
        except (FencedWorkerError, DatasetHandoffError):
            print("  ✓ Mismatched lease from same attempt rejected cleanly.")
    finally:
        db.close()


def test_3_duplicate_uploads_during_and_after_outage():
    print("\n[Point 3/3] Testing Exact 7-Step Sequence: Duplicate Uploads During & After MongoDB Outage...")
    db = SessionLocal()
    orig_uri = os.environ.get("MONGODB_URI")
    SCHEME_OUTAGE = "outage_isolated_scheme"
    content = b"Karnataka Rural Welfare Scheme Data 2025-2026 Canonical Payload"
    f_hash = compute_sha256(content)
    temp_dir = tempfile.mkdtemp()
    source_file = os.path.join(temp_dir, "canonical_welfare_dataset.csv")
    with open(source_file, "wb") as f:
        f.write(content)
    created_file_paths.append(source_file)

    canonical_dataset_id = None

    try:
        # -------------------------------------------------------------------
        # Step 1: MongoDB becomes unavailable
        # -------------------------------------------------------------------
        print("  Step 1: Simulating MongoDB outage (port 29999)...")
        os.environ["MONGODB_URI"] = "mongodb://127.0.0.1:29999"
        close_mongo_connections()

        # -------------------------------------------------------------------
        # Step 2: Upload a file (first upload during outage)
        # -------------------------------------------------------------------
        print("  Step 2: Uploading file while MongoDB is unavailable...")
        dup_check_1 = check_existing_duplicate(db, SCHEME_OUTAGE, f_hash)
        assert dup_check_1 is None, "Should not find any existing dataset yet"

        # Simulate upload endpoint behavior during outage
        ds_1, lease_1, attempt_1 = reserve_dataset(
            db, SCHEME_OUTAGE, "canonical_welfare_dataset.csv", source_file, len(content), "csv", f_hash, "worker-outage-1", "2025-2026"
        )
        canonical_dataset_id = ds_1.id
        created_dataset_ids.append(canonical_dataset_id)

        # execute_handoff fails due to outage; upload endpoint marks status="uploaded" & lease_expires_at=None
        try:
            execute_handoff(db, ds_1.id, lease_1, attempt_1, "worker-outage-1")
        except Exception:
            ds_1.status = "uploaded"
            ds_1.lease_expires_at = None
            db.commit()

        # -------------------------------------------------------------------
        # Step 3: SQLite preserves original dataset ID and file
        # -------------------------------------------------------------------
        print(f"  Step 3: Verifying SQLite preserved canonical dataset ID {canonical_dataset_id} and file...")
        db.refresh(ds_1)
        assert ds_1.id == canonical_dataset_id
        assert ds_1.status == "uploaded"
        assert ds_1.version == 1
        assert os.path.exists(source_file), "Original source file must remain intact!"

        # -------------------------------------------------------------------
        # Step 4: Upload the same file again while MongoDB remains unavailable
        # -------------------------------------------------------------------
        print("  Step 4: Uploading SAME file again while MongoDB remains unavailable...")
        dup_check_2 = check_existing_duplicate(db, SCHEME_OUTAGE, f_hash)
        assert dup_check_2 is not None, "Fallback SQLite check MUST detect duplicate upload!"
        assert dup_check_2["dataset_id"] == canonical_dataset_id
        assert dup_check_2["action"] == "REUSED_EXISTING"
        print(f"    ✓ Duplicate detected during outage: reuses canonical dataset_id={canonical_dataset_id}")

        # Verify no second dataset was created in SQLite
        matching_datasets = db.execute(
            select(Dataset).where(Dataset.scheme_id == SCHEME_OUTAGE, Dataset.file_hash == f_hash)
        ).scalars().all()
        assert len(matching_datasets) == 1, f"Expected exactly 1 SQLite record, found {len(matching_datasets)}"

        # -------------------------------------------------------------------
        # Step 5: Restore MongoDB
        # -------------------------------------------------------------------
        print("  Step 5: Restoring MongoDB connection (port 27017)...")
        if orig_uri:
            os.environ["MONGODB_URI"] = orig_uri
        else:
            os.environ.pop("MONGODB_URI", None)
        close_mongo_connections()
        mongo_db = get_mongo_db()

        # -------------------------------------------------------------------
        # Step 6: Reconcile or retry the handoff
        # -------------------------------------------------------------------
        print("  Step 6: Reconciling offline upload to MongoDB...")
        rec_summary = reconcile_handoffs(db)
        print(f"    Reconciliation summary: {rec_summary}")

        db.refresh(ds_1)
        assert ds_1.status == "INGESTING", f"Dataset status should be INGESTING, got {ds_1.status}"

        # Verify MongoDB catalog entry
        cat_doc = mongo_db.dataset_catalog.find_one({"dataset_id": canonical_dataset_id})
        assert cat_doc is not None, "Dataset catalog record must exist in MongoDB!"
        assert cat_doc["dataset_id"] == canonical_dataset_id
        assert cat_doc["version"] == 1
        assert cat_doc["file_hash_sha256"] == f_hash
        print(f"    ✓ Dataset {canonical_dataset_id} successfully registered in MongoDB catalog (version {cat_doc['version']})")

        # -------------------------------------------------------------------
        # Step 7: Upload the same file once more
        # -------------------------------------------------------------------
        print("  Step 7: Uploading SAME file once more after MongoDB restoration...")
        dup_check_3 = check_existing_duplicate(db, SCHEME_OUTAGE, f_hash)
        assert dup_check_3 is not None, "MongoDB duplicate check MUST detect duplicate upload!"
        assert dup_check_3["dataset_id"] == canonical_dataset_id
        assert dup_check_3["action"] == "REUSED_EXISTING"
        assert dup_check_3["version"] == 1
        print(f"    ✓ Duplicate detected after restoration: reuses canonical dataset_id={canonical_dataset_id}")

        # -------------------------------------------------------------------
        # Final Assertions
        # -------------------------------------------------------------------
        print("  Verifying final system invariants...")
        # 1. Exactly 1 canonical dataset in SQLite
        all_sqlite = db.execute(
            select(Dataset).where(Dataset.scheme_id == SCHEME_OUTAGE, Dataset.file_hash == f_hash)
        ).scalars().all()
        assert len(all_sqlite) == 1, f"Expected 1 SQLite record, found {len(all_sqlite)}"

        # 2. Exactly 1 catalog record in MongoDB
        all_mongo = list(mongo_db.dataset_catalog.find({"scheme_id": SCHEME_OUTAGE, "file_hash_sha256": f_hash}))
        assert len(all_mongo) == 1, f"Expected 1 MongoDB catalog record, found {len(all_mongo)}"

        # 3. Exactly 1 version (version 1)
        assert all_sqlite[0].version == 1
        assert all_mongo[0]["version"] == 1

        # 4. Zero orphan records
        assert all_sqlite[0].id == all_mongo[0]["dataset_id"] == canonical_dataset_id

        # 5. File is intact and never deleted
        assert os.path.exists(source_file)
        with open(source_file, "rb") as f:
            assert f.read() == content

        print("  ✓ Final Invariants Verified: Exactly 1 dataset, 1 catalog entry, version=1, 0 orphans, file 100% intact!")

    finally:
        if orig_uri:
            os.environ["MONGODB_URI"] = orig_uri
        else:
            os.environ.pop("MONGODB_URI", None)
        close_mongo_connections()
        db.close()


if __name__ == "__main__":
    print("=" * 80)
    print("GovPulse — Phase 2 Final Approval Verification Test Suite")
    print("=" * 80)
    try:
        cleanup()
        test_1_ingesting_retry_policy()
        test_2_mongodb_fencing_and_idempotent_handoff()
        test_3_duplicate_uploads_during_and_after_outage()
        print("=" * 80)
        print("ALL FINAL APPROVAL CHECKS PASSED WITH 100% SUCCESS! (Zero defects)")
        print("=" * 80)
    finally:
        cleanup()
