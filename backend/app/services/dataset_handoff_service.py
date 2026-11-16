"""
GovPulse — Dataset Registration, Reservation Leases, and Recoverable Handoff Service
======================================================================================
Implements Phase 2:
1. Canonical SQLite ID allocation & preservation.
2. 120-second reservation leases, heartbeat renewal, and expiry validation.
3. Monotonically increasing attempt_number fencing tokens against zombie workers.
4. Exact recoverable handoff protocol:
   RESERVED -> HANDOFF_PENDING -> MongoDB dataset_catalog -> INGESTING.
5. Scheme-aware SHA-256 duplicate detection and monotonic version allocation.
6. Multi-scenario crash recovery and reconciliation.
7. Complete compensation for concurrent duplicate-key collisions.
"""

import os
import uuid
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import select, update, func
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.models.models import Dataset
from app.database.mongodb import get_mongo_db

logger = logging.getLogger("govpulse.dataset_handoff")

LEASE_DURATION_SECONDS = 120


def utc_now() -> datetime:
    """Return current naive UTC datetime for seamless SQLite compatibility."""
    return datetime.utcnow()


def _to_naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is offset-naive UTC for comparison."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


class DatasetHandoffError(Exception):
    """Base exception for dataset reservation and handoff failures."""
    pass


class LeaseExpiredError(DatasetHandoffError):
    """Raised when a lease has expired."""
    pass


class FencedWorkerError(DatasetHandoffError):
    """Raised when an operation is rejected because the worker has been superseded."""
    pass


class DuplicateDatasetError(DatasetHandoffError):
    """Raised when an identical dataset already exists."""
    pass


def compute_sha256(content: bytes) -> str:
    """Compute 64-character lowercase hexadecimal SHA-256 digest over exact bytes."""
    hasher = hashlib.sha256()
    hasher.update(content)
    return hasher.hexdigest().lower()


def check_existing_duplicate(
    db: Session,
    scheme_id: str,
    file_hash: str,
) -> Optional[Dict[str, Any]]:
    """
    Scheme-aware duplicate check:
    Checks if a dataset with identical (scheme_id, file_hash_sha256) is already ingested or ingesting.
    Returns existing dataset details if found.
    """
    try:
        mongo_db = get_mongo_db()
        existing_doc = mongo_db.dataset_catalog.find_one({
            "scheme_id": scheme_id.lower(),
            "file_hash_sha256": file_hash.lower(),
            "status": {"$in": ["INGESTED", "INGESTING"]},
        })
        if existing_doc:
            dataset_id = existing_doc["dataset_id"]
            sqlite_dataset = db.get(Dataset, dataset_id)
            return {
                "action": "REUSED_EXISTING",
                "dataset_id": dataset_id,
                "scheme_id": scheme_id.lower(),
                "version": existing_doc.get("version", 1),
                "file_hash_sha256": file_hash.lower(),
                "status": existing_doc.get("status", "INGESTED"),
                "file_name": sqlite_dataset.file_name if sqlite_dataset else existing_doc.get("original_filename"),
                "reporting_year": sqlite_dataset.reporting_year if sqlite_dataset else existing_doc.get("reporting_year"),
                "message": f"Identical dataset already registered under dataset_id {dataset_id} (version {existing_doc.get('version', 1)}). Reusing existing registration.",
            }
    except PyMongoError as e:
        logger.warning("MongoDB query error in duplicate check: %s. Falling back to SQLite check.", e)

    # Fallback SQLite check
    existing_sqlite = db.execute(
        select(Dataset).where(
            Dataset.scheme_id == scheme_id.lower(),
            Dataset.file_hash == file_hash.lower(),
            Dataset.status.in_(["uploaded", "processing", "processed", "INGESTING"]),
        )
    ).scalars().first()

    if existing_sqlite:
        return {
            "action": "REUSED_EXISTING",
            "dataset_id": existing_sqlite.id,
            "scheme_id": scheme_id.lower(),
            "version": existing_sqlite.version or 1,
            "file_hash_sha256": file_hash.lower(),
            "status": existing_sqlite.status,
            "file_name": existing_sqlite.file_name,
            "reporting_year": existing_sqlite.reporting_year,
            "message": f"Identical dataset already registered under dataset_id {existing_sqlite.id}. Reusing existing registration.",
        }

    return None


def get_next_scheme_version(db: Session, scheme_id: str) -> int:
    """
    Determine the next monotonic version number for a scheme.
    Inspects both SQLite and MongoDB dataset_catalog to guarantee monotonicity.
    """
    # SQLite max version
    sqlite_max = db.execute(
        select(func.max(Dataset.version)).where(Dataset.scheme_id == scheme_id.lower())
    ).scalar() or 0

    # MongoDB max version
    mongo_max = 0
    try:
        mongo_db = get_mongo_db()
        highest = mongo_db.dataset_catalog.find_one(
            {"scheme_id": scheme_id.lower()},
            sort=[("version", -1)],
        )
        if highest and "version" in highest:
            mongo_max = int(highest["version"])
    except Exception as e:
        logger.warning("Could not query MongoDB for max version: %s", e)

    return max(sqlite_max, mongo_max) + 1


def reserve_dataset(
    db: Session,
    scheme_id: str,
    file_name: str,
    file_path: str,
    file_size_bytes: int,
    file_format: str,
    file_hash: str,
    worker_id: str,
    reporting_year: str,
    source: Optional[str] = None,
    column_mapping: Optional[dict] = None,
    detected_columns: Optional[list] = None,
) -> Tuple[Dataset, str, int]:
    """
    Step 1: Allocate canonical SQLite reservation with 120s lease and attempt_number=1.
    Uses SQLite database-generated primary key (autoincrement). Never uses MAX(id)+1.
    """
    lease_id = str(uuid.uuid4())
    attempt_number = 1
    version = get_next_scheme_version(db, scheme_id)
    lease_expires_at = utc_now() + timedelta(seconds=LEASE_DURATION_SECONDS)

    dataset = Dataset(
        scheme_id=scheme_id.lower(),
        file_name=file_name,
        file_path=file_path,
        file_size_bytes=file_size_bytes,
        file_format=file_format,
        file_hash=file_hash.lower(),
        version=version,
        reporting_year=reporting_year,
        source=source or None,
        column_mapping=column_mapping or None,
        detected_columns=detected_columns or [],
        status="RESERVED",
        lease_id=lease_id,
        worker_id=worker_id,
        attempt_number=attempt_number,
        lease_expires_at=lease_expires_at,
        uploaded_at=utc_now(),
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    logger.info(
        "Allocated SQLite reservation: dataset_id=%s, scheme=%s, version=%s, lease_id=%s, attempt=%s",
        dataset.id,
        dataset.scheme_id,
        dataset.version,
        lease_id,
        attempt_number,
    )
    return dataset, lease_id, attempt_number


def renew_reservation_lease(
    db: Session,
    dataset_id: int,
    lease_id: str,
    attempt_number: int,
    extend_seconds: int = LEASE_DURATION_SECONDS,
) -> bool:
    """
    Heartbeat renewal for an active reservation lease.
    Must match dataset_id, attempt_number, lease_id, and unexpired lease.
    """
    now = utc_now()
    new_expiry = now + timedelta(seconds=extend_seconds)

    result = db.execute(
        update(Dataset)
        .where(
            Dataset.id == dataset_id,
            Dataset.lease_id == lease_id,
            Dataset.attempt_number == attempt_number,
            Dataset.status.in_(["RESERVED", "HANDOFF_PENDING"]),
            Dataset.lease_expires_at > now,
        )
        .values(lease_expires_at=new_expiry)
    )
    db.commit()
    renewed = result.rowcount > 0
    if renewed:
        logger.debug("Renewed reservation lease for dataset_id=%s to %s", dataset_id, new_expiry)
    else:
        logger.warning("Failed to renew lease for dataset_id=%s: lease expired or superseded", dataset_id)
    return renewed


def execute_handoff(
    db: Session,
    dataset_id: int,
    lease_id: str,
    attempt_number: int,
    worker_id: str,
    detected_columns: Optional[list] = None,
    preview_rows: Optional[list] = None,
    column_mapping: Optional[dict] = None,
) -> Dict[str, Any]:
    """
    Execute the Recoverable Handoff Protocol (Steps A through F):
    A. Validate worker owns unexpired RESERVED lease.
    B. Transition SQLite: RESERVED -> HANDOFF_PENDING (atomic & conditional).
    C. Register dataset in MongoDB dataset_catalog (handles duplicate-key races).
    D. Verify MongoDB catalog document matches SQLite reservation.
    E. Transition SQLite: HANDOFF_PENDING -> INGESTING (conditional on attempt & lease).
    F. Record audit event.
    """
    now = utc_now()

    # -----------------------------------------------------------------------
    # Step A: Validate worker owns unexpired RESERVED lease
    # -----------------------------------------------------------------------
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise DatasetHandoffError(f"Dataset {dataset_id} does not exist in SQLite.")

    if dataset.attempt_number != attempt_number or dataset.lease_id != lease_id:
        raise FencedWorkerError(
            f"Worker {worker_id} (attempt {attempt_number}, lease {lease_id}) is superseded. "
            f"Current SQLite state: attempt {dataset.attempt_number}, lease {dataset.lease_id}."
        )

    if dataset.status not in ["RESERVED", "HANDOFF_PENDING"]:
        raise DatasetHandoffError(
            f"Cannot execute handoff for dataset {dataset_id} in status '{dataset.status}' (expected 'RESERVED' or 'HANDOFF_PENDING')."
        )

    lease_exp = _to_naive(dataset.lease_expires_at)
    if lease_exp and lease_exp <= now:
        raise LeaseExpiredError(
            f"Reservation lease {lease_id} for dataset {dataset_id} expired at {dataset.lease_expires_at}."
        )

    # -----------------------------------------------------------------------
    # Step B: Atomically transition SQLite: RESERVED -> HANDOFF_PENDING
    # -----------------------------------------------------------------------
    extended_expiry = now + timedelta(seconds=LEASE_DURATION_SECONDS)
    if dataset.status == "RESERVED":
        step_b_result = db.execute(
            update(Dataset)
            .where(
                Dataset.id == dataset_id,
                Dataset.attempt_number == attempt_number,
                Dataset.lease_id == lease_id,
                Dataset.status == "RESERVED",
                Dataset.lease_expires_at > now,
            )
            .values(
                status="HANDOFF_PENDING",
                lease_expires_at=extended_expiry,
                detected_columns=detected_columns if detected_columns is not None else dataset.detected_columns,
                column_mapping=column_mapping if column_mapping is not None else dataset.column_mapping,
            )
        )
        db.commit()

        if step_b_result.rowcount == 0:
            raise FencedWorkerError(
                f"Failed to transition dataset {dataset_id} to HANDOFF_PENDING. Ownership lost during state change."
            )

        logger.info("Dataset %s transitioned: RESERVED -> HANDOFF_PENDING", dataset_id)
    else:
        # Already HANDOFF_PENDING for this active attempt and lease; extend lease expiry
        db.execute(
            update(Dataset)
            .where(
                Dataset.id == dataset_id,
                Dataset.attempt_number == attempt_number,
                Dataset.lease_id == lease_id,
                Dataset.status == "HANDOFF_PENDING",
            )
            .values(lease_expires_at=extended_expiry)
        )
        db.commit()

    # -----------------------------------------------------------------------
    # Step C: Register dataset in MongoDB dataset_catalog (with duplicate-key protection)
    # -----------------------------------------------------------------------
    mongo_db = get_mongo_db()
    catalog_doc = {
        "dataset_id": dataset.id,
        "scheme_id": dataset.scheme_id,
        "version": dataset.version,
        "file_hash_sha256": dataset.file_hash,
        "original_filename": dataset.file_name,
        "raw_file_path": dataset.file_path,
        "file_size_bytes": dataset.file_size_bytes,
        "file_format": dataset.file_format,
        "reporting_year": dataset.reporting_year,
        "source": dataset.source,
        "status": "INGESTING",
        "attempt_number": attempt_number,
        "committed_lease_id": lease_id,
        "worker_id": worker_id,
        "source_columns": detected_columns or dataset.detected_columns or [],
        "lease": {
            "lease_id": lease_id,
            "worker_id": worker_id,
            "acquired_at": now,
            "last_heartbeat_at": now,
            "lease_timeout_seconds": LEASE_DURATION_SECONDS,
        },
        "registered_at": now,
        "updated_at": now,
    }

    try:
        mongo_db.dataset_catalog.insert_one(catalog_doc)
        logger.info(
            "Registered dataset in MongoDB dataset_catalog: dataset_id=%s, attempt=%s, lease=%s",
            dataset.id,
            attempt_number,
            lease_id,
        )
    except DuplicateKeyError as e:
        details = getattr(e, "details", {}) or {}
        key_pattern = details.get("keyPattern", {})
        logger.warning(
            "DuplicateKeyError during MongoDB catalog insert for dataset %s: keyPattern=%s",
            dataset.id,
            key_pattern,
        )

        # Case C.1: Duplicate File Hash within Scheme (scheme_id + file_hash_sha256)
        if "file_hash_sha256" in key_pattern:
            # Another request won the registration for this identical file
            winning_record = mongo_db.dataset_catalog.find_one({
                "scheme_id": dataset.scheme_id,
                "file_hash_sha256": dataset.file_hash,
            })
            # Compensation: clean up losing SQLite reservation and losing staged file (without deleting winner's file)
            _rollback_losing_reservation(
                db,
                losing_dataset_id=dataset.id,
                losing_file_path=dataset.file_path,
                winning_file_path=winning_record.get("raw_file_path") if winning_record else None,
            )
            return {
                "action": "CONCURRENT_DUPLICATE_COMPENSATED",
                "dataset_id": winning_record["dataset_id"],
                "version": winning_record.get("version", 1),
                "file_hash_sha256": dataset.file_hash,
                "status": winning_record.get("status", "INGESTING"),
                "message": (
                    f"Identical file already registered concurrently under dataset_id {winning_record['dataset_id']}. "
                    "Losing reservation rolled back cleanly."
                ),
            }

        # Case C.2: Version Collision (scheme_id + version)
        elif "version" in key_pattern:
            # Two different files uploaded concurrently received the same version number
            # Optimistic retry with incremented version
            return _retry_version_allocation(db, dataset, catalog_doc, lease_id, attempt_number, worker_id)

        # Case C.3: dataset_id Collision (Retry or repeated handoff of an existing dataset)
        elif "dataset_id" in key_pattern:
            existing_cat = mongo_db.dataset_catalog.find_one({"dataset_id": dataset.id})
            if not existing_cat:
                raise

            # Scenario C.3.a: Safe Idempotency — Same attempt and matching lease already registered
            if (
                existing_cat.get("attempt_number") == attempt_number
                and existing_cat.get("committed_lease_id") == lease_id
            ):
                logger.info(
                    "Same-attempt matching registration already exists for dataset %s (attempt %s, lease %s). Verified without overwriting.",
                    dataset.id,
                    attempt_number,
                    lease_id,
                )
                # Safely proceed to Step D without modifying catalog
            elif existing_cat.get("attempt_number", 0) < attempt_number:
                # Scenario C.3.b: Valid Retry with strictly higher attempt_number
                import pymongo
                doc_to_update = {k: v for k, v in catalog_doc.items() if k != "_id"}
                fenced_update = mongo_db.dataset_catalog.find_one_and_update(
                    {
                        "dataset_id": dataset.id,
                        "attempt_number": {"$lt": attempt_number},
                    },
                    {"$set": doc_to_update},
                    return_document=pymongo.ReturnDocument.AFTER,
                )
                if not fenced_update:
                    raise FencedWorkerError(
                        f"Worker attempt {attempt_number} is superseded in MongoDB catalog for dataset {dataset.id}."
                    )
                logger.info("MongoDB catalog successfully updated for retry attempt %s on dataset %s", attempt_number, dataset.id)
            else:
                raise FencedWorkerError(
                    f"Worker attempt {attempt_number} is superseded or conflict on dataset {dataset.id} in MongoDB catalog (catalog attempt: {existing_cat.get('attempt_number')})."
                )
        else:
            raise

    # -----------------------------------------------------------------------
    # Step D: Verify MongoDB catalog document matches SQLite reservation
    # -----------------------------------------------------------------------
    verified_doc = mongo_db.dataset_catalog.find_one({
        "dataset_id": dataset.id,
        "attempt_number": attempt_number,
        "committed_lease_id": lease_id,
    })

    if not verified_doc or verified_doc.get("status") != "INGESTING":
        raise DatasetHandoffError(
            f"Handoff verification failed: MongoDB document for dataset {dataset.id} "
            f"(attempt {attempt_number}, lease {lease_id}) could not be verified."
        )

    # -----------------------------------------------------------------------
    # Step E: Transition SQLite: HANDOFF_PENDING -> INGESTING
    # -----------------------------------------------------------------------
    step_e_result = db.execute(
        update(Dataset)
        .where(
            Dataset.id == dataset_id,
            Dataset.attempt_number == attempt_number,
            Dataset.lease_id == lease_id,
            Dataset.status == "HANDOFF_PENDING",
        )
        .values(
            status="INGESTING",
            lease_expires_at=None,  # Active lease authority now managed via MongoDB catalog
        )
    )
    db.commit()

    if step_e_result.rowcount == 0:
        raise FencedWorkerError(
            f"Failed to transition dataset {dataset_id} to INGESTING. Worker ownership lost before final commit."
        )

    logger.info("Dataset %s transitioned: HANDOFF_PENDING -> INGESTING", dataset_id)

    # -----------------------------------------------------------------------
    # Step F: Record audit event in MongoDB
    # -----------------------------------------------------------------------
    try:
        mongo_db.audit_logs.insert_one({
            "timestamp": utc_now(),
            "action": "HANDOFF_COMPLETED",
            "dataset_id": dataset.id,
            "scheme_id": dataset.scheme_id,
            "version": dataset.version,
            "attempt_number": attempt_number,
            "lease_id": lease_id,
            "worker_id": worker_id,
            "status": "SUCCESS",
            "details": f"Dataset {dataset.id} handoff completed. Ready for Phase 3 ingestion.",
        })
    except Exception as e:
        logger.warning("Audit log recording notice: %s", e)

    return {
        "action": "HANDOFF_SUCCESS",
        "dataset_id": dataset.id,
        "scheme_id": dataset.scheme_id,
        "version": dataset.version,
        "status": "INGESTING",
        "attempt_number": attempt_number,
        "lease_id": lease_id,
        "file_name": dataset.file_name,
        "file_hash_sha256": dataset.file_hash,
        "message": f"Dataset {dataset.id} successfully registered in MongoDB and transitioned to INGESTING.",
    }


def _rollback_losing_reservation(
    db: Session,
    losing_dataset_id: int,
    losing_file_path: str,
    winning_file_path: Optional[str] = None,
):
    """Safely roll back a losing reservation and its staged file after duplicate collision."""
    try:
        db.execute(
            update(Dataset)
            .where(
                Dataset.id == losing_dataset_id,
                Dataset.status.in_(["RESERVED", "HANDOFF_PENDING"]),
            )
            .values(status="ABANDONED_RESERVATION")
        )
        db.commit()
        # Protect winner's file: only delete if losing file path is distinct
        if (
            losing_file_path
            and os.path.exists(losing_file_path)
            and (winning_file_path is None or losing_file_path != winning_file_path)
        ):
            os.remove(losing_file_path)
            logger.info("Deleted losing staged file: %s", losing_file_path)
        else:
            logger.info("Preserved file %s as it matches or is referenced by winning dataset", losing_file_path)
    except Exception as e:
        logger.warning("Error during losing reservation rollback for dataset %s: %s", losing_dataset_id, e)


def _retry_version_allocation(
    db: Session,
    dataset: Dataset,
    catalog_doc: dict,
    lease_id: str,
    attempt_number: int,
    worker_id: str,
    max_retries: int = 5,
) -> Dict[str, Any]:
    """Optimistic retry loop for version allocation collisions."""
    mongo_db = get_mongo_db()
    for retry_idx in range(max_retries):
        # Guarantee strictly increasing candidate version
        candidate_version = max(dataset.version + 1, get_next_scheme_version(db, dataset.scheme_id))
        dataset.version = candidate_version
        db.commit()
        catalog_doc["version"] = candidate_version
        catalog_doc.pop("_id", None)

        try:
            mongo_db.dataset_catalog.insert_one(catalog_doc)
            logger.info(
                "Version collision resolved on retry %s: assigned version %s to dataset %s",
                retry_idx + 1,
                candidate_version,
                dataset.id,
            )
            # Proceed with Step D and E
            db.execute(
                update(Dataset)
                .where(Dataset.id == dataset.id, Dataset.status == "HANDOFF_PENDING")
                .values(status="INGESTING", version=candidate_version, lease_expires_at=None)
            )
            db.commit()
            return {
                "action": "HANDOFF_SUCCESS",
                "dataset_id": dataset.id,
                "scheme_id": dataset.scheme_id,
                "version": candidate_version,
                "status": "INGESTING",
                "attempt_number": attempt_number,
                "lease_id": lease_id,
                "file_name": dataset.file_name,
                "file_hash_sha256": dataset.file_hash,
                "message": f"Version collision resolved. Dataset {dataset.id} registered under version {candidate_version}.",
            }
        except DuplicateKeyError as e:
            if "version" in (getattr(e, "details", {}) or {}).get("keyPattern", {}):
                continue
            raise

    raise DatasetHandoffError(f"Exceeded max retries allocating version for scheme '{dataset.scheme_id}'")


def reconcile_handoffs(db: Session, max_stale_seconds: int = LEASE_DURATION_SECONDS) -> Dict[str, Any]:
    """
    Reconciliation function for interrupted handoffs and crashed workers:
    - Crash before SQLite enters HANDOFF_PENDING (stale RESERVED).
    - Crash after HANDOFF_PENDING but before MongoDB registration.
    - Crash after MongoDB registration but before SQLite reaches INGESTING.
    - Safe self-healing: if matching MongoDB catalog entry exists for HANDOFF_PENDING, promotes SQLite to INGESTING.
    - If abandoned, cleans up only staged uncommitted files, never preserved original uploads.
    - Safe to run repeatedly.
    """
    now = utc_now()
    summary = {
        "scanned": 0,
        "self_healed_to_ingesting": 0,
        "abandoned_reservations": 0,
        "orphans_cleaned": 0,
        "details": [],
    }

    stale_records = db.execute(
        select(Dataset).where(
            Dataset.status.in_(["RESERVED", "HANDOFF_PENDING"]),
            Dataset.lease_expires_at <= now,
        )
    ).scalars().all()

    summary["scanned"] = len(stale_records)

    mongo_db = None
    try:
        mongo_db = get_mongo_db()
        from app.database.mongodb import get_mongo_client
        client = get_mongo_client()
        client.admin.command("ping")
    except Exception as e:
        logger.warning(
            "MongoDB unavailable during reconciliation: %s. Reconciliation deferred to preserve valid uploads.",
            e,
        )
        return {
            "scanned": len(stale_records),
            "self_healed_to_ingesting": 0,
            "abandoned_reservations": 0,
            "orphans_cleaned": 0,
            "details": [{"status": "deferred", "reason": f"MongoDB offline: {e}"}],
        }

    for item in stale_records:
        dataset_id = item.id
        status = item.status

        # -------------------------------------------------------------------
        # Case 1: HANDOFF_PENDING with expired lease
        # -------------------------------------------------------------------
        if status == "HANDOFF_PENDING":
            matched_mongo = None
            if mongo_db is not None:
                try:
                    matched_mongo = mongo_db.dataset_catalog.find_one({
                        "dataset_id": dataset_id,
                        "attempt_number": item.attempt_number,
                        "committed_lease_id": item.lease_id,
                        "file_hash_sha256": item.file_hash,
                    })
                except Exception as e:
                    logger.warning("Error checking MongoDB catalog during reconciliation: %s", e)

            if matched_mongo and matched_mongo.get("status") == "INGESTING":
                # Safe Self-Healing: MongoDB registration completed; SQLite missed final commit
                db.execute(
                    update(Dataset)
                    .where(Dataset.id == dataset_id, Dataset.status == "HANDOFF_PENDING")
                    .values(status="INGESTING", lease_expires_at=None)
                )
                db.commit()
                summary["self_healed_to_ingesting"] += 1
                summary["details"].append({
                    "dataset_id": dataset_id,
                    "action": "SELF_HEALED_TO_INGESTING",
                    "reason": "Matched verified MongoDB catalog entry.",
                })
                logger.info("Reconciliation self-healed dataset %s: HANDOFF_PENDING -> INGESTING", dataset_id)
            else:
                # MongoDB registration is missing or unverified: safely abandon reservation
                db.execute(
                    update(Dataset)
                    .where(Dataset.id == dataset_id, Dataset.status == "HANDOFF_PENDING")
                    .values(status="ABANDONED_RESERVATION")
                )
                db.commit()
                # Clean up staged orphan file only if unreferenced
                if item.file_path and os.path.exists(item.file_path):
                    try:
                        os.remove(item.file_path)
                        summary["orphans_cleaned"] += 1
                    except Exception as e:
                        logger.warning("Error removing orphan file: %s", e)
                summary["abandoned_reservations"] += 1
                summary["details"].append({
                    "dataset_id": dataset_id,
                    "action": "ABANDONED_RESERVATION",
                    "reason": "Expired HANDOFF_PENDING with missing MongoDB catalog entry.",
                })

        # -------------------------------------------------------------------
        # Case 2: RESERVED with expired lease
        # -------------------------------------------------------------------
        elif status == "RESERVED":
            db.execute(
                update(Dataset)
                .where(Dataset.id == dataset_id, Dataset.status == "RESERVED")
                .values(status="ABANDONED_RESERVATION")
            )
            db.commit()
            if item.file_path and os.path.exists(item.file_path):
                try:
                    os.remove(item.file_path)
                    summary["orphans_cleaned"] += 1
                except Exception as e:
                    logger.warning("Error removing orphan file: %s", e)
            summary["abandoned_reservations"] += 1
            summary["details"].append({
                "dataset_id": dataset_id,
                "action": "ABANDONED_RESERVATION",
                "reason": "Expired RESERVED lease without handoff.",
            })

    # -------------------------------------------------------------------
    # Case 3: Offline 'uploaded' records needing MongoDB handoff
    # -------------------------------------------------------------------
    if mongo_db is not None:
        offline_uploads = db.execute(
            select(Dataset).where(
                Dataset.status == "uploaded",
            )
        ).scalars().all()

        for item in offline_uploads:
            if item.file_path and os.path.exists(item.file_path):
                existing_cat = mongo_db.dataset_catalog.find_one({"dataset_id": item.id})
                if existing_cat and existing_cat.get("status") in ["INGESTED", "INGESTING"]:
                    db.execute(
                        update(Dataset)
                        .where(Dataset.id == item.id, Dataset.status == "uploaded")
                        .values(status="INGESTING", lease_expires_at=None)
                    )
                    db.commit()
                    summary["self_healed_to_ingesting"] += 1
                else:
                    try:
                        retried_ds, lease_id, attempt = retry_handoff(
                            db=db,
                            dataset_id=item.id,
                            worker_id="reconcile-worker",
                        )
                        execute_handoff(
                            db=db,
                            dataset_id=item.id,
                            lease_id=lease_id,
                            attempt_number=attempt,
                            worker_id="reconcile-worker",
                        )
                        summary["self_healed_to_ingesting"] += 1
                        summary["details"].append({
                            "dataset_id": item.id,
                            "action": "RECONCILED_UPLOAD_TO_MONGODB",
                            "reason": "Registered offline upload into MongoDB catalog.",
                        })
                    except Exception as e:
                        logger.warning("Error reconciling offline upload for dataset %s: %s", item.id, e)

    return summary


def retry_handoff(
    db: Session,
    dataset_id: int,
    worker_id: str,
) -> Tuple[Dataset, str, int]:
    """
    Retry an abandoned or failed dataset handoff:
    - Reuses the canonical dataset_id and canonical metadata.
    - Increments attempt_number (monotonic fencing token).
    - Allocates new UUID lease_id with 120s expiry.
    - Transitions status back to RESERVED.
    - Note: 'INGESTING' is strictly NOT eligible to prevent disrupting active jobs.
    """
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise DatasetHandoffError(f"Dataset {dataset_id} does not exist.")

    status_upper = (dataset.status or "").upper()
    if status_upper not in ["ABANDONED_RESERVATION", "FAILED", "RESERVED", "UPLOADED"]:
        raise DatasetHandoffError(
            f"Cannot retry dataset {dataset_id} in status '{dataset.status}'. "
            "Only FAILED, ABANDONED_RESERVATION, RESERVED, or UPLOADED datasets may be retried."
        )

    new_lease_id = str(uuid.uuid4())
    new_attempt = (dataset.attempt_number or 0) + 1
    new_expiry = utc_now() + timedelta(seconds=LEASE_DURATION_SECONDS)

    result = db.execute(
        update(Dataset)
        .where(
            Dataset.id == dataset_id,
            func.upper(Dataset.status).in_(["ABANDONED_RESERVATION", "FAILED", "RESERVED", "UPLOADED"]),
        )
        .values(
            status="RESERVED",
            lease_id=new_lease_id,
            attempt_number=new_attempt,
            worker_id=worker_id,
            lease_expires_at=new_expiry,
        )
    )
    db.commit()

    if result.rowcount == 0:
        raise FencedWorkerError(f"Concurrent claim on dataset {dataset_id} retry. Retry rejected.")

    db.refresh(dataset)
    logger.info(
        "Claimed retry for dataset %s: attempt_number=%s, lease_id=%s, worker_id=%s",
        dataset_id,
        new_attempt,
        new_lease_id,
        worker_id,
    )
    return dataset, new_lease_id, new_attempt
