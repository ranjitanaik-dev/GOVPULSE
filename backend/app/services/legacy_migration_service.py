"""
GovPulse — Legacy Production Dataset Migration Service
-------------------------------------------------------
Authoritative engine for migrating legacy SQLite-only datasets (#3 MGNREGA, #4 PMAY-G)
into MongoDB Community Server 8.2.1 with:
- Staged dual-database reservation locking (exclusive pre-gate)
- Separation of Initial Bootstrap vs. Interrupted Reclamation CAS
- Write-level fencing and attempt isolation
- Atomic SQLite finalization and reservation release within a single transaction
- Unexpired heartbeat anti-resurrection guards
- Non-destructive status preservation (Dataset.status remains 'processed' in SQLite)
"""

import datetime
import hashlib
import logging
import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

import pymongo
from pymongo.errors import DuplicateKeyError
from pymongo.operations import UpdateOne
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from app.database.mongodb import get_mongo_db
from app.models.models import Dataset, MigrationReservation
from app.services.raw_ingestion_service import (
    DEFAULT_BATCH_SIZE,
    get_scheme_record_parser,
)

logger = logging.getLogger("govpulse.legacy_migration")

LEASE_DURATION_SECONDS = 120
RESERVATION_TTL_SECONDS = 30


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class MigrationError(Exception):
    """Base exception for legacy migration errors."""
    pass


class FencedWorkerError(MigrationError):
    """Raised when a worker's lease, reservation, or attempt has been superseded."""
    pass


class DuplicateDatasetError(MigrationError):
    """Raised when identical dataset file content already exists for a scheme."""
    pass


class DuplicateVersionError(MigrationError):
    """Raised when an identical version number already exists for a scheme."""
    pass


class ConsistencyConflictError(MigrationError):
    """Raised when dual-database state drift requires manual operator review."""
    pass


# ---------------------------------------------------------------------------
# Utility Helpers
# ---------------------------------------------------------------------------

def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def compute_sha256(content: bytes) -> str:
    hasher = hashlib.sha256()
    hasher.update(content)
    return hasher.hexdigest().lower()


def build_catalog_document(
    dataset: Dataset,
    attempt_number: int,
    lease_id: str,
    worker_id: str,
    migration_reservation_id: str,
    source_columns: List[str],
    verified_hash: str,
    verified_size: int,
    now: datetime.datetime,
) -> Dict[str, Any]:
    """
    Constructs an authoritative catalog document matching the Phase 2 contract in
    backend/app/services/dataset_handoff_service.py (lines 343-368), adding migration metadata.
    """
    # Provenance metadata preservation
    reporting_year = dataset.reporting_year
    source_derived_reporting_year = None
    provenance_notes = None

    if dataset.scheme_id.lower() == "mgnrega":
        # SQLite stores '2024-25', source column fin_year verified as '2025-2026'
        source_derived_reporting_year = "2025-2026"
        provenance_notes = (
            "Preserved canonical SQLite reporting_year '2024-25'. "
            "Verified physical source column fin_year is '2025-2026'."
        )

    doc = {
        "dataset_id": dataset.id,
        "scheme_id": dataset.scheme_id,
        "version": dataset.version,
        "file_hash_sha256": verified_hash,
        "original_filename": dataset.file_name,
        "raw_file_path": dataset.file_path,
        "file_size_bytes": verified_size,
        "file_format": dataset.file_format,
        "reporting_year": reporting_year,
        "source": dataset.source,
        "status": "INGESTING",
        "attempt_number": attempt_number,
        "committed_lease_id": lease_id,
        "worker_id": worker_id,
        "migration_reservation_id": migration_reservation_id,
        "source_columns": source_columns,
        "lease": {
            "lease_id": lease_id,
            "worker_id": worker_id,
            "migration_reservation_id": migration_reservation_id,
            "acquired_at": now,
            "last_heartbeat_at": now,
            "lease_timeout_seconds": LEASE_DURATION_SECONDS,
        },
        "registration_type": "LEGACY_PRODUCTION_MIGRATION",
        "registered_at": now,
        "updated_at": now,
    }

    if source_derived_reporting_year:
        doc["source_derived_reporting_year"] = source_derived_reporting_year
    if provenance_notes:
        doc["provenance_notes"] = provenance_notes

    return doc


# ---------------------------------------------------------------------------
# SQLite Staged Reservation & Locking Protocol
# ---------------------------------------------------------------------------

def stage_sqlite_reservation(
    db: Session,
    dataset_id: int,
    candidate_attempt: int,
    candidate_token: str,
    worker_id: str,
    ttl_seconds: int = RESERVATION_TTL_SECONDS,
) -> Dict[str, Any]:
    """
    Acquire an exclusive pending migration reservation in SQLite.
    Single-owner mutual exclusion gate: rejected immediately if an active unexpired
    reservation exists.
    """
    now = utc_now()
    expires_at = now + datetime.timedelta(seconds=ttl_seconds)
    reservation_id = str(uuid.uuid4())
    lock_owner_token = f"lck-{uuid.uuid4().hex[:16]}"

    # Attempt to insert initial reservation or take over an expired one
    existing = db.execute(
        select(MigrationReservation).where(MigrationReservation.dataset_id == dataset_id)
    ).scalar_one_or_none()

    if not existing:
        try:
            res = MigrationReservation(
                dataset_id=dataset_id,
                reservation_id=reservation_id,
                candidate_attempt=candidate_attempt,
                candidate_token=candidate_token,
                worker_id=worker_id,
                lock_owner_token=lock_owner_token,
                lock_generation=1,
                reserved_at=now,
                expires_at=expires_at,
            )
            db.add(res)
            db.commit()
        except Exception as e:
            db.rollback()
            raise FencedWorkerError(
                f"Failed to stage reservation for dataset {dataset_id}: concurrent conflict ({e})"
            )
    else:
        # Existing reservation: atomically overwrite only if expired
        result = db.execute(
            update(MigrationReservation)
            .where(
                MigrationReservation.dataset_id == dataset_id,
                MigrationReservation.expires_at < now,
            )
            .values(
                reservation_id=reservation_id,
                candidate_attempt=candidate_attempt,
                candidate_token=candidate_token,
                worker_id=worker_id,
                lock_owner_token=lock_owner_token,
                lock_generation=MigrationReservation.lock_generation + 1,
                reserved_at=now,
                expires_at=expires_at,
            )
        )
        db.commit()
        if result.rowcount == 0:
            raise FencedWorkerError(
                f"Cannot acquire reservation: active unexpired reservation exists for dataset {dataset_id}."
            )

    return {
        "reservation_id": reservation_id,
        "candidate_attempt": candidate_attempt,
        "candidate_token": candidate_token,
        "worker_id": worker_id,
        "lock_owner_token": lock_owner_token,
        "expires_at": expires_at,
    }


def renew_reconciliation_lock(
    db: Session,
    dataset_id: int,
    lock_owner_token: str,
    ttl_seconds: int = RESERVATION_TTL_SECONDS,
) -> bool:
    """Extend lock expiry conditional on exact current lock_owner_token."""
    now = utc_now()
    new_expiry = now + datetime.timedelta(seconds=ttl_seconds)

    result = db.execute(
        update(MigrationReservation)
        .where(
            MigrationReservation.dataset_id == dataset_id,
            MigrationReservation.lock_owner_token == lock_owner_token,
            MigrationReservation.expires_at > now,
        )
        .values(expires_at=new_expiry)
    )
    db.commit()
    return result.rowcount == 1


def acquire_reconciliation_lock(
    db: Session,
    dataset_id: int,
    target_res_id: Optional[str] = None,
    ttl_seconds: int = RESERVATION_TTL_SECONDS,
) -> Optional[Dict[str, Any]]:
    """
    Acquire or renew ownership of the reservation lock before inspecting MongoDB.
    Assigns a fresh lock_owner_token and increments lock_generation.
    """
    now = utc_now()
    new_expiry = now + datetime.timedelta(seconds=ttl_seconds)
    new_lock_owner_token = f"lck-{uuid.uuid4().hex[:16]}"

    query = (
        update(MigrationReservation)
        .where(
            MigrationReservation.dataset_id == dataset_id,
            or_(
                MigrationReservation.expires_at < now,
                MigrationReservation.reservation_id == target_res_id,
            )
            if target_res_id
            else MigrationReservation.expires_at < now,
        )
        .values(
            lock_owner_token=new_lock_owner_token,
            lock_generation=MigrationReservation.lock_generation + 1,
            expires_at=new_expiry,
        )
    )
    result = db.execute(query)
    db.commit()

    if result.rowcount == 0:
        return None

    res = db.execute(
        select(MigrationReservation).where(MigrationReservation.dataset_id == dataset_id)
    ).scalar_one_or_none()

    if not res:
        return None

    return {
        "reservation_id": res.reservation_id,
        "candidate_attempt": res.candidate_attempt,
        "candidate_token": res.candidate_token,
        "worker_id": res.worker_id,
        "lock_owner_token": res.lock_owner_token,
        "expires_at": res.expires_at,
    }


def cancel_sqlite_reservation(
    db: Session,
    dataset_id: int,
    reservation_id: str,
    lock_owner_token: Optional[str] = None,
) -> bool:
    """
    Cancel a pending reservation matching exact reservation_id (and lock token if provided).
    Never deletes another worker's reservation.
    """
    conditions = [
        MigrationReservation.dataset_id == dataset_id,
        MigrationReservation.reservation_id == reservation_id,
    ]
    if lock_owner_token:
        conditions.append(MigrationReservation.lock_owner_token == lock_owner_token)

    result = db.execute(delete(MigrationReservation).where(*conditions))
    db.commit()
    return result.rowcount == 1


def atomic_finalize_sqlite_ownership(
    db: Session,
    dataset_id: int,
    reservation_id: str,
    lock_owner_token: str,
    candidate_attempt: int,
    candidate_token: str,
    worker_id: str,
    source_columns: List[str],
    lease_ttl: int = LEASE_DURATION_SECONDS,
) -> None:
    """
    Finalize dataset ownership and release migration reservation within a SINGLE SQLite transaction.

    Enforcements:
    1. Verifies dataset_id, reservation_id, lock_owner_token and unexpired lock ownership.
    2. Performs the conditional Dataset update (status remains 'processed').
    3. Verifies exactly one row was updated.
    4. Deletes the migration reservation matching exact reservation_id and lock_owner_token.
    5. Verifies exactly one row was deleted.
    6. Commits ONLY when both operations succeed.
    7. Rolls back the entire transaction if either operation fails.
    """
    now = utc_now()
    lease_expires = now + datetime.timedelta(seconds=lease_ttl)

    try:
        # Step 1: Update Dataset conditionally
        update_res = db.execute(
            update(Dataset)
            .where(
                Dataset.id == dataset_id,
                Dataset.status == "processed",
                Dataset.attempt_number <= candidate_attempt,
            )
            .values(
                attempt_number=candidate_attempt,
                lease_id=candidate_token,
                worker_id=worker_id,
                lease_expires_at=lease_expires,
                detected_columns=source_columns,
            )
        )
        if update_res.rowcount != 1:
            raise FencedWorkerError(
                f"Atomic finalization failed: Dataset {dataset_id} update affected {update_res.rowcount} rows (expected 1)."
            )

        # Step 2: Delete MigrationReservation matching exact reservation_id and lock_owner_token
        del_res = db.execute(
            delete(MigrationReservation).where(
                MigrationReservation.dataset_id == dataset_id,
                MigrationReservation.reservation_id == reservation_id,
                MigrationReservation.lock_owner_token == lock_owner_token,
                MigrationReservation.expires_at >= now,
            )
        )
        if del_res.rowcount != 1:
            raise FencedWorkerError(
                f"Atomic finalization failed: Lock release affected {del_res.rowcount} rows (expected 1). Lock may have expired or been taken over."
            )

        # Step 3: Commit transaction atomically
        db.commit()
        logger.info(
            "Atomically finalized SQLite ownership for dataset %s: attempt=%s, lease=%s",
            dataset_id,
            candidate_attempt,
            candidate_token,
        )
    except Exception as e:
        db.rollback()
        logger.error("Transaction rolled back for dataset %s finalization: %s", dataset_id, e)
        raise


# ---------------------------------------------------------------------------
# MongoDB CAS Reclamation and Anti-Resurrection Heartbeats
# ---------------------------------------------------------------------------

def heartbeat_migration_worker(
    db: Session,
    mongo_db,
    dataset_id: int,
    attempt_number: int,
    worker_lease_token: str,
) -> None:
    """
    Dual heartbeat verification across SQLite and MongoDB.
    Enforces that previous MongoDB heartbeat is strictly unexpired (< 120s old).
    """
    now = utc_now()
    heartbeat_cutoff = now - datetime.timedelta(seconds=LEASE_DURATION_SECONDS)

    # 1. MongoDB Heartbeat Update
    mongo_res = mongo_db.dataset_catalog.update_one(
        {
            "dataset_id": dataset_id,
            "attempt_number": attempt_number,
            "committed_lease_id": worker_lease_token,
            "status": "INGESTING",
            "lease.last_heartbeat_at": {"$gte": heartbeat_cutoff},
        },
        {
            "$set": {
                "lease.last_heartbeat_at": now,
                "updated_at": now,
            }
        },
    )

    if mongo_res.matched_count == 0:
        raise FencedWorkerError(
            f"Fenced out: MongoDB lease expired or superseded for dataset {dataset_id} (attempt {attempt_number})."
        )

    # 2. SQLite Lease Renewal (in MigrationReservation while in-flight, or Dataset if finalized)
    new_expiry = now + datetime.timedelta(seconds=LEASE_DURATION_SECONDS)
    sql_res = db.execute(
        update(MigrationReservation)
        .where(
            MigrationReservation.dataset_id == dataset_id,
            MigrationReservation.candidate_attempt == attempt_number,
            MigrationReservation.candidate_token == worker_lease_token,
            MigrationReservation.expires_at > now,
        )
        .values(expires_at=new_expiry)
    )
    if sql_res.rowcount == 0:
        sql_res = db.execute(
            update(Dataset)
            .where(
                Dataset.id == dataset_id,
                Dataset.attempt_number == attempt_number,
                Dataset.lease_id == worker_lease_token,
                Dataset.status == "processed",
                Dataset.lease_expires_at > now,
            )
            .values(lease_expires_at=new_expiry)
        )
    db.commit()

    if sql_res.rowcount == 0:
        raise FencedWorkerError(
            f"Fenced out: SQLite lease expired or superseded for dataset {dataset_id}."
        )


def resume_unexpired_migration(
    db: Session,
    mongo_db,
    dataset_id: int,
    attempt_number: int,
    worker_lease_token: str,
) -> bool:
    """
    Path A: Resume an unexpired in-flight migration using existing token and attempt.
    Anti-resurrection guard: strictly requires last_heartbeat_at >= (now - 120s).
    """
    now = utc_now()
    heartbeat_cutoff = now - datetime.timedelta(seconds=LEASE_DURATION_SECONDS)

    resumed_doc = mongo_db.dataset_catalog.find_one_and_update(
        {
            "dataset_id": dataset_id,
            "attempt_number": attempt_number,
            "committed_lease_id": worker_lease_token,
            "status": "INGESTING",
            "lease.last_heartbeat_at": {"$gte": heartbeat_cutoff},
        },
        {
            "$set": {
                "lease.last_heartbeat_at": now,
                "updated_at": now,
            }
        },
        return_document=pymongo.ReturnDocument.AFTER,
    )

    if not resumed_doc:
        raise FencedWorkerError(
            f"Cannot resume dataset {dataset_id}: lease token {worker_lease_token} has expired. Reclamation required."
        )

    return True


def execute_mongodb_reclamation_cas(
    mongo_db,
    dataset_id: int,
    obs_attempt: int,
    obs_lease: str,
    candidate_attempt: int,
    candidate_token: str,
    reservation_id: str,
    worker_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Path B: Atomic Compare-and-Swap (CAS) reclamation for an expired attempt.
    Requires exact match on previous attempt, previous lease, and expired/missing heartbeat.
    """
    now = utc_now()
    expiration_cutoff = now - datetime.timedelta(seconds=LEASE_DURATION_SECONDS)

    reclaimed_doc = mongo_db.dataset_catalog.find_one_and_update(
        {
            "dataset_id": dataset_id,
            "status": "INGESTING",
            "attempt_number": obs_attempt,
            "committed_lease_id": obs_lease,
            "$or": [
                {"lease.last_heartbeat_at": {"$lt": expiration_cutoff}},
                {"lease.last_heartbeat_at": None},
                {"lease.last_heartbeat_at": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "attempt_number": candidate_attempt,
                "committed_lease_id": candidate_token,
                "worker_id": worker_id,
                "migration_reservation_id": reservation_id,
                "lease.lease_id": candidate_token,
                "lease.worker_id": worker_id,
                "lease.migration_reservation_id": reservation_id,
                "lease.acquired_at": now,
                "lease.last_heartbeat_at": now,
                "lease.lease_timeout_seconds": LEASE_DURATION_SECONDS,
                "updated_at": now,
            }
        },
        return_document=pymongo.ReturnDocument.AFTER,
    )

    return reclaimed_doc


# ---------------------------------------------------------------------------
# Structured DuplicateKeyError Classification
# ---------------------------------------------------------------------------

def classify_duplicate_key_error(
    e: DuplicateKeyError,
    dataset: Dataset,
    mongo_db,
) -> Exception:
    """Classifies DuplicateKeyError by structured key pattern and database inspection."""
    details = getattr(e, "details", {}) or {}
    key_pattern = details.get("keyPattern") or {}
    key_value = details.get("keyValue") or {}

    if "dataset_id" in key_pattern:
        return FencedWorkerError(
            f"Concurrent bootstrap race: dataset_id {dataset.id} already registered in catalog."
        )

    if "file_hash_sha256" in key_pattern:
        return DuplicateDatasetError(
            f"Integrity violation: Duplicate file hash for scheme '{dataset.scheme_id}' ({key_value.get('file_hash_sha256')})."
        )

    if "version" in key_pattern and "scheme_id" in key_pattern:
        return DuplicateVersionError(
            f"Integrity violation: Version {dataset.version} already registered for scheme '{dataset.scheme_id}'."
        )

    # Fallback to direct catalog document check
    existing_id = mongo_db.dataset_catalog.find_one({"dataset_id": dataset.id})
    if existing_id:
        return FencedWorkerError(
            f"Concurrent bootstrap race: dataset_id {dataset.id} confirmed registered in catalog."
        )

    existing_hash = mongo_db.dataset_catalog.find_one({
        "scheme_id": dataset.scheme_id,
        "file_hash_sha256": dataset.file_hash,
    })
    if existing_hash:
        return DuplicateDatasetError(
            f"Integrity violation: Duplicate file content confirmed registered for scheme '{dataset.scheme_id}'."
        )

    return MigrationError(f"Unclassified MongoDB uniqueness conflict: {details}")


# ---------------------------------------------------------------------------
# Workflow A: Initial Legacy Migration Bootstrap
# ---------------------------------------------------------------------------

def bootstrap_legacy_migration(
    db: Session,
    mongo_db,
    dataset_id: int,
    worker_id: str = "legacy-migration-worker-1",
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> Dict[str, Any]:
    """
    Workflow A: Initial migration bootstrap for legacy datasets with NO MongoDB catalog document.
    """
    now = utc_now()

    # 1. Verify SQLite dataset exists and status == 'processed'
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise ValueError(f"Dataset {dataset_id} does not exist in SQLite.")
    if dataset.status != "processed":
        raise ValueError(f"Cannot bootstrap dataset {dataset_id}: status is '{dataset.status}' (expected 'processed').")

    # 2. Check if catalog document already exists
    catalog_doc = mongo_db.dataset_catalog.find_one({"dataset_id": dataset_id})
    if catalog_doc:
        if catalog_doc.get("status") == "INGESTED":
            return {"status": "SUCCESS", "message": "Dataset already migrated and INGESTED."}
        raise FencedWorkerError(
            f"Dataset {dataset_id} already has a catalog document in status '{catalog_doc.get('status')}'. Use reclamation workflow."
        )

    # 3. Verify physical file bytes and compute actual SHA-256
    file_path = dataset.file_path
    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError(f"Source file not found at: {file_path}")

    file_size = os.path.getsize(file_path)
    with open(file_path, "rb") as f:
        verified_hash = compute_sha256(f.read())

    # Update SQLite file_hash if missing
    if not dataset.file_hash:
        db.execute(
            update(Dataset).where(Dataset.id == dataset_id).values(file_hash=verified_hash)
        )
        db.commit()
        dataset.file_hash = verified_hash

    # 4. Stage exclusive initial reservation in SQLite (attempt 1)
    candidate_attempt = 1
    candidate_token = f"tok-boot-{uuid.uuid4().hex[:16]}"
    res_info = stage_sqlite_reservation(
        db, dataset_id, candidate_attempt, candidate_token, worker_id, ttl_seconds=RESERVATION_TTL_SECONDS
    )
    reservation_id = res_info["reservation_id"]
    lock_owner_token = res_info["lock_owner_token"]

    # 5. Obtain parser and sample headers
    parser = get_scheme_record_parser(dataset.scheme_id)
    records_iter = parser(file_path)
    records_list = list(records_iter)
    total_parsed = len(records_list)
    source_columns = list(records_list[0][4].keys()) if total_parsed > 0 else []

    # 6. Build and atomically insert catalog document
    catalog_payload = build_catalog_document(
        dataset=dataset,
        attempt_number=candidate_attempt,
        lease_id=candidate_token,
        worker_id=worker_id,
        migration_reservation_id=reservation_id,
        source_columns=source_columns,
        verified_hash=verified_hash,
        verified_size=file_size,
        now=now,
    )

    try:
        mongo_db.dataset_catalog.insert_one(catalog_payload)
        logger.info("Successfully registered initial catalog document for dataset %s", dataset_id)
    except DuplicateKeyError as e:
        cancel_sqlite_reservation(db, dataset_id, reservation_id, lock_owner_token)
        classified = classify_duplicate_key_error(e, dataset, mongo_db)
        raise classified

    # 7. Stream raw record batches with dual heartbeat
    try:
        _stream_and_write_batches(
            db=db,
            mongo_db=mongo_db,
            dataset=dataset,
            attempt_number=candidate_attempt,
            worker_lease_token=candidate_token,
            records_list=records_list,
            verified_hash=verified_hash,
            batch_size=batch_size,
        )

        # 8. Verify exact count
        committed_count = mongo_db.raw_records.count_documents({
            "dataset_id": dataset_id,
            "attempt_number": candidate_attempt,
            "lease_id": candidate_token,
        })
        if committed_count != total_parsed:
            raise ValueError(
                f"Count mismatch: parsed {total_parsed} records, but committed count in MongoDB is {committed_count}."
            )

        # 9. Finalize MongoDB catalog atomically
        completed_time = utc_now()
        mongo_db.dataset_catalog.update_one(
            {
                "dataset_id": dataset_id,
                "attempt_number": candidate_attempt,
                "committed_lease_id": candidate_token,
                "migration_reservation_id": reservation_id,
                "status": "INGESTING",
            },
            {
                "$set": {
                    "status": "INGESTED",
                    "raw_record_count": committed_count,
                    "source_columns": source_columns,
                    "raw_ingestion": {
                        "completed_at": completed_time,
                        "batches_executed": (total_parsed + batch_size - 1) // batch_size,
                        "total_parsed": total_parsed,
                        "committed_count": committed_count,
                        "status": "VERIFIED_COMPLETE",
                    },
                    "updated_at": completed_time,
                }
            },
        )

        # 10. Atomic SQLite finalization & lock release
        atomic_finalize_sqlite_ownership(
            db=db,
            dataset_id=dataset_id,
            reservation_id=reservation_id,
            lock_owner_token=lock_owner_token,
            candidate_attempt=candidate_attempt,
            candidate_token=candidate_token,
            worker_id=worker_id,
            source_columns=source_columns,
        )

        # 11. Audit log
        mongo_db.audit_logs.insert_one({
            "timestamp": completed_time,
            "action": "LEGACY_PRODUCTION_MIGRATION_COMPLETED",
            "dataset_id": dataset_id,
            "scheme_id": dataset.scheme_id,
            "attempt_number": candidate_attempt,
            "lease_id": candidate_token,
            "record_count": committed_count,
            "status": "SUCCESS",
        })

        return {
            "status": "SUCCESS",
            "dataset_id": dataset_id,
            "attempt_number": candidate_attempt,
            "token": candidate_token,
            "committed_count": committed_count,
        }
    except Exception as e:
        logger.error("Error during raw ingestion for dataset %s: %s", dataset_id, e)
        raise


# ---------------------------------------------------------------------------
# Workflow B: Interrupted Migration Reclamation
# ---------------------------------------------------------------------------

def reclaim_expired_migration(
    db: Session,
    mongo_db,
    dataset_id: int,
    worker_id: str = "legacy-recovery-worker-1",
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> Dict[str, Any]:
    """
    Workflow B: CAS reclamation for an interrupted migration whose lease expired.
    """
    now = utc_now()

    # 1. Inspect existing MongoDB catalog
    catalog_doc = mongo_db.dataset_catalog.find_one({"dataset_id": dataset_id})
    if not catalog_doc:
        raise FencedWorkerError(f"No catalog document exists for dataset {dataset_id}. Use bootstrap workflow.")

    if catalog_doc.get("status") == "INGESTED":
        return {"status": "SUCCESS", "message": "Dataset already migrated and INGESTED."}

    obs_attempt = catalog_doc.get("attempt_number", 1)
    obs_lease = catalog_doc.get("committed_lease_id")

    # 2. Check lease expiry
    last_hb = catalog_doc.get("lease", {}).get("last_heartbeat_at")
    if last_hb and (now - last_hb).total_seconds() < LEASE_DURATION_SECONDS:
        raise FencedWorkerError(
            f"Dataset {dataset_id} is currently held by an active live worker (heartbeat {(now - last_hb).total_seconds():.1f}s ago)."
        )

    # 3. Stage SQLite reclamation reservation for candidate_attempt
    dataset = db.get(Dataset, dataset_id)
    candidate_attempt = max(obs_attempt, dataset.attempt_number or 0) + 1
    candidate_token = f"tok-rec-{uuid.uuid4().hex[:16]}"

    res_info = stage_sqlite_reservation(
        db, dataset_id, candidate_attempt, candidate_token, worker_id, ttl_seconds=RESERVATION_TTL_SECONDS
    )
    reservation_id = res_info["reservation_id"]
    lock_owner_token = res_info["lock_owner_token"]

    # 4. Atomic MongoDB CAS Reclamation
    reclaimed_doc = execute_mongodb_reclamation_cas(
        mongo_db=mongo_db,
        dataset_id=dataset_id,
        obs_attempt=obs_attempt,
        obs_lease=obs_lease,
        candidate_attempt=candidate_attempt,
        candidate_token=candidate_token,
        reservation_id=reservation_id,
        worker_id=worker_id,
    )

    if not reclaimed_doc:
        cancel_sqlite_reservation(db, dataset_id, reservation_id, lock_owner_token)
        raise FencedWorkerError(f"Reclamation CAS failed for dataset {dataset_id}; old worker renewed or superseded.")

    # 5. Parse source file and stream raw records
    file_path = dataset.file_path
    parser = get_scheme_record_parser(dataset.scheme_id)
    records_iter = parser(file_path)
    records_list = list(records_iter)
    total_parsed = len(records_list)
    source_columns = list(records_list[0][4].keys()) if total_parsed > 0 else []

    with open(file_path, "rb") as f:
        verified_hash = compute_sha256(f.read())

    _stream_and_write_batches(
        db=db,
        mongo_db=mongo_db,
        dataset=dataset,
        attempt_number=candidate_attempt,
        worker_lease_token=candidate_token,
        records_list=records_list,
        verified_hash=verified_hash,
        batch_size=batch_size,
    )

    # 6. Verify count
    committed_count = mongo_db.raw_records.count_documents({
        "dataset_id": dataset_id,
        "attempt_number": candidate_attempt,
        "lease_id": candidate_token,
    })
    if committed_count != total_parsed:
        raise ValueError(f"Count mismatch: parsed {total_parsed}, committed {committed_count}.")

    # 7. Finalize MongoDB catalog atomically
    completed_time = utc_now()
    mongo_db.dataset_catalog.update_one(
        {
            "dataset_id": dataset_id,
            "attempt_number": candidate_attempt,
            "committed_lease_id": candidate_token,
            "migration_reservation_id": reservation_id,
            "status": "INGESTING",
        },
        {
            "$set": {
                "status": "INGESTED",
                "raw_record_count": committed_count,
                "source_columns": source_columns,
                "raw_ingestion": {
                    "completed_at": completed_time,
                    "batches_executed": (total_parsed + batch_size - 1) // batch_size,
                    "total_parsed": total_parsed,
                    "committed_count": committed_count,
                    "status": "VERIFIED_COMPLETE",
                },
                "updated_at": completed_time,
            }
        },
    )

    # 8. Atomic SQLite finalization & lock release
    atomic_finalize_sqlite_ownership(
        db=db,
        dataset_id=dataset_id,
        reservation_id=reservation_id,
        lock_owner_token=lock_owner_token,
        candidate_attempt=candidate_attempt,
        candidate_token=candidate_token,
        worker_id=worker_id,
        source_columns=source_columns,
    )

    return {
        "status": "SUCCESS",
        "dataset_id": dataset_id,
        "attempt_number": candidate_attempt,
        "token": candidate_token,
        "committed_count": committed_count,
    }


# ---------------------------------------------------------------------------
# Reconciliation Protocol
# ---------------------------------------------------------------------------

def reconcile_interrupted_migration(
    db: Session,
    mongo_db,
    dataset_id: int,
    target_res_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exclusive reconciliation locking protocol:
    1. Acquires/renews exclusive reservation lock in SQLite before inspecting MongoDB.
    2. Reads MongoDB under lock.
    3. Evaluates 6 distinct outcomes.
    4. Conditionally finalizes SQLite or clears stale reservation safely.
    """
    now = utc_now()

    # Step 1: Pre-lock in SQLite
    lock_info = acquire_reconciliation_lock(db, dataset_id, target_res_id=target_res_id)
    if not lock_info:
        return {"status": "LOCKED_BY_ACTIVE_WORKER", "action": "YIELD"}

    reservation_id = lock_info["reservation_id"]
    candidate_attempt = lock_info["candidate_attempt"]
    candidate_token = lock_info["candidate_token"]
    lock_owner_token = lock_info["lock_owner_token"]
    worker_id = lock_info["worker_id"]

    # Step 2: Read MongoDB catalog under lock
    catalog_doc = mongo_db.dataset_catalog.find_one({"dataset_id": dataset_id})
    dataset = db.get(Dataset, dataset_id)

    # Outcome 6: Missing catalog
    if not catalog_doc:
        cancel_sqlite_reservation(db, dataset_id, reservation_id, lock_owner_token)
        return {"status": "MISSING_METADATA_HANDLED", "action": "CLEARED_UNREGISTERED"}

    mongo_attempt = catalog_doc.get("attempt_number")
    mongo_lease = catalog_doc.get("committed_lease_id")
    mongo_res_id = catalog_doc.get("migration_reservation_id")
    mongo_status = catalog_doc.get("status")

    # Outcome 1: Already Finalized (Idempotent Success)
    if dataset.attempt_number == candidate_attempt and dataset.lease_id == candidate_token:
        cancel_sqlite_reservation(db, dataset_id, reservation_id, lock_owner_token)
        return {"status": "IDEMPOTENT_SUCCESS", "attempt_number": dataset.attempt_number}

    # Outcome 4: Consistency Conflict (SQLite ahead)
    if (dataset.attempt_number or 0) > (mongo_attempt or 0):
        return {
            "status": "CONSISTENCY_CONFLICT_SQLITE_AHEAD",
            "sqlite_attempt": dataset.attempt_number,
            "mongo_attempt": mongo_attempt,
        }

    # Outcome 3: Stale Reservation (MongoDB advanced to newer generation)
    if (mongo_attempt or 0) > candidate_attempt or mongo_res_id != reservation_id:
        cancel_sqlite_reservation(db, dataset_id, reservation_id, lock_owner_token)
        return {
            "status": "STALE_RESERVATION_DISCARDED",
            "mongo_attempt": mongo_attempt,
            "stale_attempt": candidate_attempt,
        }

    # Outcome 5: Ownership Token Conflict
    if mongo_attempt == candidate_attempt and mongo_lease != candidate_token:
        return {
            "status": "OWNERSHIP_TOKEN_CONFLICT",
            "attempt": mongo_attempt,
            "expected_token": candidate_token,
            "actual_token": mongo_lease,
        }

    # Outcome 2: Safe Finalization (All 3 tokens match and MongoDB successfully INGESTED)
    if (
        mongo_attempt == candidate_attempt
        and mongo_lease == candidate_token
        and mongo_res_id == reservation_id
    ):
        if mongo_status == "INGESTED":
            source_columns = catalog_doc.get("source_columns", [])
            atomic_finalize_sqlite_ownership(
                db=db,
                dataset_id=dataset_id,
                reservation_id=reservation_id,
                lock_owner_token=lock_owner_token,
                candidate_attempt=candidate_attempt,
                candidate_token=candidate_token,
                worker_id=worker_id,
                source_columns=source_columns,
            )
            return {"status": "SAFE_FINALIZATION", "attempt_number": candidate_attempt}
        elif mongo_status == "INGESTING":
            return {
                "status": "INTERRUPTED_IN_FLIGHT",
                "attempt_number": candidate_attempt,
                "token": candidate_token,
                "reservation_id": reservation_id,
            }

    return {"status": "UNKNOWN_INCONSISTENCY"}


# ---------------------------------------------------------------------------
# Internal Batch Streaming Helper
# ---------------------------------------------------------------------------

def _stream_and_write_batches(
    db: Session,
    mongo_db,
    dataset: Dataset,
    attempt_number: int,
    worker_lease_token: str,
    records_list: List[Tuple[int, int, str, Optional[str], Dict[str, Any]]],
    verified_hash: str,
    batch_size: int,
) -> None:
    now = utc_now()
    current_batch = []

    for row_index, source_row_num, row_type, summary_subtype, raw_dict in records_list:
        doc_filter = {
            "dataset_id": dataset.id,
            "attempt_number": attempt_number,
            "row_index": row_index,
        }

        set_fields = {
            "scheme_id": dataset.scheme_id,
            "lease_id": worker_lease_token,
            "source_row_number": source_row_num,
            "row_type": row_type,
            "raw_data": raw_dict,
            "provenance.source_file": dataset.file_name,
            "provenance.file_hash_sha256": verified_hash,
            "provenance.updated_at": now,
        }
        if summary_subtype:
            set_fields["summary_subtype"] = summary_subtype

        update_op = UpdateOne(
            doc_filter,
            {
                "$set": set_fields,
                "$setOnInsert": {
                    "provenance.ingested_at": now,
                },
            },
            upsert=True,
        )
        current_batch.append(update_op)

        if len(current_batch) >= batch_size:
            heartbeat_migration_worker(db, mongo_db, dataset.id, attempt_number, worker_lease_token)
            mongo_db.raw_records.bulk_write(current_batch, ordered=False)
            current_batch = []

    if current_batch:
        heartbeat_migration_worker(db, mongo_db, dataset.id, attempt_number, worker_lease_token)
        mongo_db.raw_records.bulk_write(current_batch, ordered=False)
