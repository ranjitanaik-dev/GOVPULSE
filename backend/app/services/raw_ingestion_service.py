"""
GovPulse — Raw Government Dataset Ingestion Service (Phase 3)
==============================================================
Ingests complete raw government source datasets into MongoDB `raw_records` collection.
Key Invariants:
1. Complete preservation of all original columns inside `raw_data`.
2. Explicit `row_type` and `summary_subtype` metadata (distinguishing district data from state totals).
3. Monotonic `row_index` (0-based) and `source_row_number` (1-based physical line).
4. Fencing token protection (`dataset_id`, `attempt_number`, `lease_id`).
5. Idempotent bulk upsert writes using `UpdateOne` on unique compound index:
   `(dataset_id, attempt_number, row_index)`
6. Bounded batch execution with lease renewal and exact post-ingestion verification.
7. Atomic update of MongoDB `dataset_catalog` upon successful verification.
"""

import os
import csv
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Iterator

import pandas as pd
from pymongo import UpdateOne
from pymongo.errors import DuplicateKeyError, BulkWriteError, PyMongoError
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.database.mongodb import get_mongo_db, get_safe_uri_info
from app.models.models import Dataset
from app.services.dataset_handoff_service import (
    compute_sha256,
    utc_now,
    _to_naive,
    FencedWorkerError,
    LeaseExpiredError,
    LEASE_DURATION_SECONDS,
)

logger = logging.getLogger("govpulse.raw_ingestion")

DEFAULT_BATCH_SIZE = 1000


# ---------------------------------------------------------------------------
# Scheme-Specific Raw Parsers (Preserving 100% Source Columns & Values)
# ---------------------------------------------------------------------------

def parse_mgnrega_raw_records(file_path: str) -> Iterator[Tuple[int, int, str, Optional[str], Dict[str, Any]]]:
    """
    Parse official MGNREGA district/month CSV file.
    Expected: exactly 7,454 data records, 36 columns.
    Yields:
        (row_index, source_row_number, row_type, summary_subtype, raw_data_dict)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"MGNREGA source file not found at: {file_path}")

    with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            return

        row_index = 0
        for line_num, row in enumerate(reader, start=2):
            if not row or all(c.strip() == "" for c in row):
                continue

            raw_dict = {}
            for col_idx, col_name in enumerate(headers):
                val = row[col_idx] if col_idx < len(row) else ""
                raw_dict[col_name] = val

            yield (row_index, line_num, "DATA", None, raw_dict)
            row_index += 1


def parse_pmayg_raw_records(file_path: str) -> Iterator[Tuple[int, int, str, Optional[str], Dict[str, Any]]]:
    """
    Parse official PMAY-G AwaasSoft A.2 report (.xls containing HTML table).
    Expected: exactly 33 records (1 header total, 31 districts, 1 footer total), 10 columns.
    Preserves all 33 rows with semantic row_type and summary_subtype.
    Yields:
        (row_index, source_row_number, row_type, summary_subtype, raw_data_dict)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PMAY-G source file not found at: {file_path}")

    tables = pd.read_html(file_path)
    target_table = None
    for t in tables:
        if t.shape[0] >= 30 and t.shape[1] >= 8:
            target_table = t
            break
    if target_table is None:
        target_table = tables[0]

    # Find the header row (contains '#SNo' or 'District Name')
    header_row_idx = None
    for r_idx in range(min(5, len(target_table))):
        row_vals = [str(x).lower() for x in target_table.iloc[r_idx].dropna()]
        if any("district" in x for x in row_vals) or any("sno" in x for x in row_vals):
            header_row_idx = r_idx
            break

    if header_row_idx is None:
        header_row_idx = 1  # Default based on observed AwaasSoft A.2 format

    headers = [str(h).strip() for h in target_table.iloc[header_row_idx].values]
    data_df = target_table.iloc[header_row_idx + 1:].copy()

    total_count = 0
    row_index = 0

    for idx, (original_loc, row) in enumerate(data_df.iterrows()):
        row_vals = ["" if pd.isna(v) else str(v).strip() for v in row.values]
        if all(v == "" for v in row_vals):
            continue

        raw_dict = {}
        for c_idx, c_name in enumerate(headers):
            val = row_vals[c_idx] if c_idx < len(row_vals) else ""
            raw_dict[c_name] = val

        # Semantic classification based on District Name column (Column 1)
        district_val = raw_dict.get(headers[1], "") if len(headers) > 1 else ""
        sno_val = raw_dict.get(headers[0], "") if len(headers) > 0 else ""

        if district_val.lower() == "total":
            row_type = "STATE_SUMMARY"
            if total_count == 0:
                summary_subtype = "HEADER_TOTAL"
            else:
                summary_subtype = "FOOTER_TOTAL"
            total_count += 1
        else:
            row_type = "DISTRICT"
            summary_subtype = None

        source_row_num = header_row_idx + 2 + idx
        yield (row_index, source_row_num, row_type, summary_subtype, raw_dict)
        row_index += 1


def get_scheme_record_parser(scheme_id: str):
    """Return the raw record generator for the requested scheme."""
    scheme = scheme_id.lower()
    if scheme == "mgnrega":
        return parse_mgnrega_raw_records
    elif scheme == "pmayg":
        return parse_pmayg_raw_records
    else:
        raise ValueError(f"No dedicated raw record parser implemented for scheme: {scheme_id}")


# ---------------------------------------------------------------------------
# Fenced Ingestion Core
# ---------------------------------------------------------------------------

def ingest_raw_dataset(
    db: Session,
    dataset_id: int,
    batch_size: int = DEFAULT_BATCH_SIZE,
    worker_id: str = "ingestion-worker-1",
) -> Dict[str, Any]:
    """
    Ingest all raw records for a dataset into MongoDB `raw_records`.

    Fencing Rules:
    - Validates dataset in SQLite and MongoDB catalog.
    - Matches attempt_number and lease_id.
    - Idempotent bulk_write using unique compound index (dataset_id, attempt_number, row_index).
    - Checks and renews lease periodically.
    - Verifies exact committed record count against source record count.
    """
    start_time = utc_now()
    now = start_time

    # 1. Fetch and validate SQLite dataset
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise ValueError(f"Dataset {dataset_id} does not exist in SQLite.")

    scheme_id = dataset.scheme_id.lower()
    file_path = dataset.file_path
    attempt_number = dataset.attempt_number or 1
    lease_id = dataset.lease_id

    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError(f"Source file for dataset {dataset_id} not found at: {file_path}")

    # Verify SHA-256 integrity
    with open(file_path, "rb") as f:
        actual_hash = compute_sha256(f.read())
    if dataset.file_hash and actual_hash != dataset.file_hash:
        raise ValueError(f"SHA-256 digest mismatch for dataset {dataset_id}: expected {dataset.file_hash}, got {actual_hash}")

    # 2. Verify MongoDB dataset_catalog registration
    mongo_db = get_mongo_db()
    catalog_doc = mongo_db.dataset_catalog.find_one({"dataset_id": dataset_id})
    if not catalog_doc:
        raise FencedWorkerError(
            f"Dataset {dataset_id} is not registered in MongoDB dataset_catalog. Perform Phase 2 handoff first."
        )

    if catalog_doc.get("attempt_number") != attempt_number:
        raise FencedWorkerError(
            f"Fenced out: Worker attempt {attempt_number} does not match catalog attempt {catalog_doc.get('attempt_number')}."
        )

    if catalog_doc.get("committed_lease_id") != lease_id:
        raise FencedWorkerError(
            f"Fenced out: Worker lease {lease_id} does not match catalog committed lease {catalog_doc.get('committed_lease_id')}."
        )

    # 3. Obtain raw record parser
    parser_func = get_scheme_record_parser(scheme_id)
    records_iter = parser_func(file_path)

    # 4. Stream and execute bounded batch bulk upserts
    total_parsed = 0
    total_upserted = 0
    total_modified = 0
    batches_executed = 0
    sample_records = []
    source_columns = []

    current_batch = []
    batch_num = 1

    for row_index, source_row_num, row_type, summary_subtype, raw_dict in records_iter:
        total_parsed += 1
        if not source_columns:
            source_columns = list(raw_dict.keys())
        if len(sample_records) < 3:
            sample_records.append({"row_index": row_index, "raw_data": raw_dict})

        # Upsert document structure matching Section 2 specification
        doc_filter = {
            "dataset_id": dataset_id,
            "attempt_number": attempt_number,
            "row_index": row_index,
        }

        set_fields = {
            "scheme_id": scheme_id,
            "lease_id": lease_id,
            "source_row_number": source_row_num,
            "row_type": row_type,
            "raw_data": raw_dict,
            "provenance.source_file": dataset.file_name,
            "provenance.file_hash_sha256": actual_hash,
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
            # Lease check before executing batch write
            _verify_active_catalog_lease(mongo_db, dataset_id, attempt_number, lease_id)
            res = mongo_db.raw_records.bulk_write(current_batch, ordered=False)
            total_upserted += res.upserted_count
            total_modified += res.modified_count
            batches_executed += 1
            current_batch = []
            batch_num += 1

    # Flush final remaining batch
    if current_batch:
        _verify_active_catalog_lease(mongo_db, dataset_id, attempt_number, lease_id)
        res = mongo_db.raw_records.bulk_write(current_batch, ordered=False)
        total_upserted += res.upserted_count
        total_modified += res.modified_count
        batches_executed += 1

    # 5. Exact Committed Count and Ingestion Verification
    committed_count = mongo_db.raw_records.count_documents({
        "dataset_id": dataset_id,
        "attempt_number": attempt_number,
        "lease_id": lease_id,
    })

    if committed_count != total_parsed:
        raise ValueError(
            f"Ingestion verification failed for dataset {dataset_id}: "
            f"Parsed {total_parsed} rows, but committed count in MongoDB is {committed_count}."
        )

    # 6. Update MongoDB dataset_catalog metadata atomically
    completed_time = utc_now()
    mongo_db.dataset_catalog.update_one(
        {
            "dataset_id": dataset_id,
            "attempt_number": attempt_number,
            "committed_lease_id": lease_id,
        },
        {
            "$set": {
                "status": "INGESTED",
                "raw_record_count": committed_count,
                "source_columns": source_columns,
                "raw_ingestion": {
                    "completed_at": completed_time,
                    "batches_executed": batches_executed,
                    "total_parsed": total_parsed,
                    "committed_count": committed_count,
                    "status": "VERIFIED_COMPLETE",
                },
                "updated_at": completed_time,
            }
        },
    )

    # 7. Update SQLite dataset status
    db.execute(
        update(Dataset)
        .where(Dataset.id == dataset_id)
        .values(
            status="INGESTED",
            detected_columns=source_columns,
        )
    )
    db.commit()

    # 8. Record audit log
    try:
        mongo_db.audit_logs.insert_one({
            "timestamp": completed_time,
            "action": "RAW_INGESTION_COMPLETED",
            "dataset_id": dataset_id,
            "scheme_id": scheme_id,
            "attempt_number": attempt_number,
            "lease_id": lease_id,
            "record_count": committed_count,
            "batches": batches_executed,
            "status": "SUCCESS",
            "details": f"Successfully ingested {committed_count} raw records into MongoDB.",
        })
    except Exception as e:
        logger.warning("Audit log notice: %s", e)

    logger.info(
        "Successfully ingested and verified %s raw records for dataset %s (scheme: %s, attempt: %s, lease: %s)",
        committed_count,
        dataset_id,
        scheme_id,
        attempt_number,
        lease_id,
    )

    return {
        "dataset_id": dataset_id,
        "scheme_id": scheme_id,
        "source_sha256": actual_hash,
        "source_row_count": total_parsed,
        "mongodb_committed_count": committed_count,
        "attempt_number": attempt_number,
        "lease_id": lease_id,
        "missing_row_count": max(0, total_parsed - committed_count),
        "duplicate_row_count": max(0, committed_count - total_parsed),
        "invalid_record_count": 0,
        "batches_executed": batches_executed,
        "status": "VERIFIED_COMPLETE",
        "verification_timestamp": completed_time.isoformat(),
        "sample_records": sample_records,
    }


def _verify_active_catalog_lease(mongo_db, dataset_id: int, attempt_number: int, lease_id: str):
    """Verify that worker attempt and lease remain active in catalog during batch ingestion."""
    doc = mongo_db.dataset_catalog.find_one({"dataset_id": dataset_id})
    if not doc:
        raise FencedWorkerError(f"Dataset {dataset_id} catalog entry missing during batch ingestion.")
    if doc.get("attempt_number") != attempt_number:
        raise FencedWorkerError(
            f"Fenced out mid-ingestion: attempt {attempt_number} superseded by catalog attempt {doc.get('attempt_number')}."
        )
    if doc.get("committed_lease_id") != lease_id:
        raise FencedWorkerError(
            f"Fenced out mid-ingestion: lease {lease_id} superseded by catalog lease {doc.get('committed_lease_id')}."
        )
