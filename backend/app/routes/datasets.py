"""
GovPulse — Datasets Router
----------------------------
Handles dataset upload, preview of actual rows & columns, interactive
column mapping, schema validation, and Spark processing trigger.
"""

import os
import asyncio
import logging
import json
import pandas as pd
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database.db import get_db, SessionLocal
from app.models.models import Dataset, ProcessingJob
from app.services.file_handler import save_uploaded_file
from app.services.spark_runner import launch_spark_job
from app.services.scheme_config import (
    SCHEMES_SEED,
    SCHEME_INDICATOR_METADATA,
    suggest_mapping,
    validate_column_mapping,
)
from app.services.dataset_handoff_service import (
    compute_sha256,
    check_existing_duplicate,
    reserve_dataset,
    execute_handoff,
    reconcile_handoffs,
    renew_reservation_lease,
)
from app.services.raw_ingestion_service import ingest_raw_dataset

logger = logging.getLogger("govpulse.routes.datasets")
router = APIRouter()


class MappingPayload(BaseModel):
    column_mapping: dict[str, str]


def _read_file_preview(file_path: str, file_format: str, n_rows: int = 10) -> tuple[list[str], list[dict], int]:
    """Helper to read column names and top N rows as clean dicts using pandas."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found on disk: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    is_excel = file_format == "excel" or ext in (".xls", ".xlsx")

    try:
        if is_excel:
            try:
                df = pd.read_excel(file_path, nrows=n_rows, dtype=str)
            except Exception:
                # Government portals (e.g. AwaasSoft) frequently export HTML tables with a .xls extension
                dfs = pd.read_html(file_path)
                if dfs:
                    df = dfs[0].head(n_rows).astype(str)
                else:
                    raise
        else:
            df = pd.read_csv(file_path, nrows=n_rows, dtype=str, skipinitialspace=True)
    except Exception as e:
        logger.error(f"Failed to read file preview for {file_path}: {e}")
        # Try fallback encoding for CSV
        if not is_excel:
            df = pd.read_csv(file_path, nrows=n_rows, dtype=str, encoding="latin1")
        else:
            raise

    # Clean column names (strip whitespace)
    columns = [str(c).strip() for c in df.columns]
    df.columns = columns

    # Replace NaN / None with empty strings for clean JSON
    df = df.fillna("")
    rows = df.to_dict(orient="records")

    return columns, rows, len(rows)


def _run_spark_background(job_id, dataset_id, file_path, scheme_id, reporting_year, column_mapping):
    """Worker function for background spark job with its own dedicated session."""
    db = SessionLocal()
    try:
        asyncio.run(
            launch_spark_job(
                db=db,
                job_id=job_id,
                dataset_id=dataset_id,
                file_path=file_path,
                scheme_id=scheme_id,
                reporting_year=reporting_year,
                column_mapping=column_mapping or {},
            )
        )
    finally:
        db.close()


@router.post("/upload", summary="Upload a government dataset file")
async def upload_dataset(
    file: UploadFile = File(...),
    scheme_id: str = Form(...),
    reporting_year: str = Form(...),
    source: str = Form(default=""),
    column_mapping: str = Form(default="{}"),
    db: Session = Depends(get_db),
):
    # Validate scheme
    valid_schemes = ["mgnrega", "pmayg", "pmjay", "udise"]
    if scheme_id.lower() not in valid_schemes:
        raise HTTPException(400, detail=f"Invalid scheme_id. Must be one of: {valid_schemes}")

    # Read file content and compute exact SHA-256 byte digest
    content = await file.read()
    if not content:
        raise HTTPException(400, detail="Uploaded file is empty.")

    file_hash = compute_sha256(content)

    # Scheme-aware duplicate check (before creating reservations or files)
    existing_dup = check_existing_duplicate(db, scheme_id, file_hash)
    if existing_dup:
        existing_id = existing_dup["dataset_id"]
        existing_dataset = db.get(Dataset, existing_id)
        detected_cols = existing_dataset.detected_columns if existing_dataset else []
        preview_rows = []
        if existing_dataset and os.path.exists(existing_dataset.file_path):
            try:
                _, preview_rows, _ = _read_file_preview(
                    existing_dataset.file_path, existing_dataset.file_format, n_rows=10
                )
            except Exception:
                pass

        logger.info(
            "Duplicate upload detected: scheme=%s, file_hash=%s. Reusing dataset_id=%s (version=%s).",
            scheme_id,
            file_hash,
            existing_id,
            existing_dup.get("version", 1),
        )
        return {
            "dataset_id": existing_id,
            "file_name": existing_dataset.file_name if existing_dataset else file.filename,
            "scheme_id": scheme_id.lower(),
            "version": existing_dup.get("version", 1),
            "reporting_year": existing_dataset.reporting_year if existing_dataset else reporting_year,
            "file_size_bytes": len(content),
            "file_hash_sha256": file_hash,
            "detected_columns": detected_cols,
            "preview_rows": preview_rows,
            "suggested_mapping": existing_dataset.column_mapping if existing_dataset else {},
            "status": existing_dup.get("status", "uploaded"),
            "action": "REUSED_EXISTING",
            "message": existing_dup["message"],
        }

    # Save file to preserved raw storage byte-for-byte
    try:
        file_meta = save_uploaded_file(content, file.filename, scheme_id.lower())
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    # Parse initial column mapping if provided
    try:
        col_map = json.loads(column_mapping) if column_mapping else {}
    except json.JSONDecodeError:
        col_map = {}

    # Read preview rows & detect columns
    try:
        detected_cols, preview_rows, _ = _read_file_preview(
            file_meta["file_path"], file_meta["file_format"], n_rows=10
        )
    except Exception as e:
        logger.error(f"Error reading preview for uploaded file: {e}")
        detected_cols = []
        preview_rows = []

    # If no custom mapping supplied, generate smart suggested mapping
    if not col_map and detected_cols:
        col_map = suggest_mapping(detected_cols, scheme_id.lower())

    # Step 1: Allocate canonical SQLite reservation
    worker_id = f"worker-{os.getpid()}"
    dataset, lease_id, attempt_number = reserve_dataset(
        db=db,
        scheme_id=scheme_id.lower(),
        file_name=file_meta["file_name"],
        file_path=file_meta["file_path"],
        file_size_bytes=file_meta["file_size_bytes"],
        file_format=file_meta["file_format"],
        file_hash=file_hash,
        worker_id=worker_id,
        reporting_year=reporting_year,
        source=source or None,
        column_mapping=col_map or None,
        detected_columns=detected_cols,
    )

    # Step 2: Execute Recoverable Handoff Protocol (RESERVED -> HANDOFF_PENDING -> Mongo -> INGESTING)
    handoff_status = "uploaded"
    try:
        handoff_result = execute_handoff(
            db=db,
            dataset_id=dataset.id,
            lease_id=lease_id,
            attempt_number=attempt_number,
            worker_id=worker_id,
            detected_columns=detected_cols,
            preview_rows=preview_rows,
            column_mapping=col_map,
        )
        handoff_status = handoff_result.get("status", "INGESTING")
    except Exception as e:
        logger.warning(
            "Recoverable handoff notice for dataset %s: %s. Preserving upload in SQLite fallback mode.",
            dataset.id,
            e,
        )
        # MongoDB unavailable: preserve dataset as valid "uploaded" in SQLite fallback
        # Clear lease_expires_at so reconciliation does not treat it as an expired reservation
        dataset.status = "uploaded"
        dataset.lease_expires_at = None
        db.commit()
        handoff_status = "uploaded"

    return {
        "dataset_id": dataset.id,
        "file_name": dataset.file_name,
        "scheme_id": dataset.scheme_id,
        "version": dataset.version,
        "file_hash_sha256": file_hash,
        "reporting_year": dataset.reporting_year,
        "file_size_bytes": dataset.file_size_bytes,
        "detected_columns": detected_cols,
        "preview_rows": preview_rows,
        "suggested_mapping": col_map,
        "status": handoff_status,
        "message": "File uploaded and preserved. Recoverable handoff verified." if handoff_status == "INGESTING" else "File uploaded and preserved in local storage. Local processing ready.",
    }


@router.post("/reconcile", summary="Trigger handoff crash recovery & reconciliation")
def trigger_reconciliation(db: Session = Depends(get_db)):
    """Run reconciliation sweep to self-heal interrupted handoffs and clean stale reservations."""
    summary = reconcile_handoffs(db)
    return {
        "status": "success",
        "reconciliation_summary": summary,
    }


@router.post("/{dataset_id}/ingest-raw", summary="Ingest raw records into MongoDB")
def trigger_raw_ingestion(
    dataset_id: int,
    batch_size: int = 1000,
    db: Session = Depends(get_db),
):
    """Trigger bounded batch ingestion of raw source records into MongoDB raw_records."""
    try:
        summary = ingest_raw_dataset(db, dataset_id, batch_size=batch_size)
        return {
            "status": "success",
            "ingestion_summary": summary,
        }
    except Exception as e:
        logger.error("Raw ingestion error for dataset %s: %s", dataset_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", summary="List all uploaded datasets")
def list_datasets(
    scheme_id: str = None,
    db: Session = Depends(get_db),
):
    query = select(Dataset).order_by(Dataset.uploaded_at.desc())
    if scheme_id:
        query = query.where(Dataset.scheme_id == scheme_id)
    result = db.execute(query)
    datasets = result.scalars().all()
    return [
        {
            "id": d.id,
            "scheme_id": d.scheme_id,
            "file_name": d.file_name,
            "reporting_year": d.reporting_year,
            "source": d.source,
            "total_records": d.total_records,
            "valid_records": d.valid_records,
            "status": d.status,
            "column_mapping": d.column_mapping,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
        }
        for d in datasets
    ]


@router.get("/{dataset_id}", summary="Get dataset details")
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(404, detail="Dataset not found")
    return {
        "id": dataset.id,
        "scheme_id": dataset.scheme_id,
        "file_name": dataset.file_name,
        "file_size_bytes": dataset.file_size_bytes,
        "file_format": dataset.file_format,
        "reporting_year": dataset.reporting_year,
        "source": dataset.source,
        "total_records": dataset.total_records,
        "valid_records": dataset.valid_records,
        "invalid_records": dataset.invalid_records,
        "detected_columns": dataset.detected_columns,
        "column_mapping": dataset.column_mapping,
        "validation_result": dataset.validation_result,
        "status": dataset.status,
        "uploaded_at": dataset.uploaded_at.isoformat() if dataset.uploaded_at else None,
        "processed_at": dataset.processed_at.isoformat() if dataset.processed_at else None,
    }


@router.get("/{dataset_id}/preview", summary="Preview first 10 rows and schema requirements for mapping")
def get_dataset_preview(dataset_id: int, db: Session = Depends(get_db)):
    """
    Returns actual column names, first 10 preview rows, scheme indicator requirements
    (mandatory vs optional), current mapping, and smart suggested mapping.
    """
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    try:
        columns, preview_rows, total_preview = _read_file_preview(
            dataset.file_path, dataset.file_format, n_rows=10
        )
    except Exception as e:
        logger.error(f"Failed to generate preview for dataset {dataset_id}: {e}")
        raise HTTPException(500, detail=f"Could not read dataset file preview: {str(e)}")

    scheme_id = dataset.scheme_id.lower()
    indicator_meta = SCHEME_INDICATOR_METADATA.get(scheme_id, {})

    required_cols = [k for k, v in indicator_meta.items() if v.get("required")]
    optional_cols = [k for k, v in indicator_meta.items() if not v.get("required")]

    # Suggest mapping
    suggested = suggest_mapping(columns, scheme_id)
    current = dataset.column_mapping or suggested

    # Perform initial validation on current mapping
    validation = validate_column_mapping(scheme_id, current, columns, preview_rows)

    return {
        "dataset_id": dataset.id,
        "file_name": dataset.file_name,
        "file_format": dataset.file_format,
        "file_size_bytes": dataset.file_size_bytes,
        "scheme_id": scheme_id,
        "reporting_year": dataset.reporting_year,
        "source": dataset.source,
        "status": dataset.status,
        "detected_columns": columns,
        "preview_rows": preview_rows,
        "total_preview_rows": total_preview,
        "required_columns": required_cols,
        "optional_columns": optional_cols,
        "indicators": indicator_meta,
        "suggested_mapping": suggested,
        "current_mapping": current,
        "validation": validation,
    }


@router.post("/{dataset_id}/validate-mapping", summary="Validate column mapping against scheme schema")
def validate_mapping(dataset_id: int, payload: MappingPayload, db: Session = Depends(get_db)):
    """
    Validates user's column mapping before launching Spark processing.
    Checks mandatory columns, column existence, duplicate mapping, and preview data types.
    """
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    try:
        columns, preview_rows, _ = _read_file_preview(
            dataset.file_path, dataset.file_format, n_rows=10
        )
    except Exception:
        columns = dataset.detected_columns or []
        preview_rows = []

    validation = validate_column_mapping(
        dataset.scheme_id,
        payload.column_mapping,
        columns,
        sample_rows=preview_rows
    )

    return validation


@router.put("/{dataset_id}/mapping", summary="Save column mapping for a dataset")
def save_mapping(dataset_id: int, payload: MappingPayload, db: Session = Depends(get_db)):
    """Save the user-configured column mapping."""
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    try:
        columns, preview_rows, _ = _read_file_preview(
            dataset.file_path, dataset.file_format, n_rows=10
        )
    except Exception:
        columns = dataset.detected_columns or []
        preview_rows = []

    validation = validate_column_mapping(
        dataset.scheme_id,
        payload.column_mapping,
        columns,
        sample_rows=preview_rows
    )

    dataset.column_mapping = payload.column_mapping
    db.commit()
    db.refresh(dataset)

    return {
        "message": "Column mapping updated successfully.",
        "dataset_id": dataset.id,
        "column_mapping": dataset.column_mapping,
        "validation": validation,
    }


@router.post("/{dataset_id}/process", summary="Validate mapping and trigger Spark processing")
def process_dataset(
    dataset_id: int,
    background_tasks: BackgroundTasks,
    payload: Optional[MappingPayload] = None,
    db: Session = Depends(get_db),
):
    """
    Triggers Spark processing after strictly validating mandatory column mappings.
    Rejects processing if required indicators are missing or incompatible.
    """
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    if dataset.status == "processing":
        raise HTTPException(409, detail="Dataset is already being processed.")

    # Determine mapping to use
    mapping_to_use = (payload.column_mapping if payload and payload.column_mapping else dataset.column_mapping) or {}

    # Read preview to validate
    try:
        columns, preview_rows, _ = _read_file_preview(
            dataset.file_path, dataset.file_format, n_rows=10
        )
    except Exception:
        columns = dataset.detected_columns or []
        preview_rows = []

    # Strict pre-validation: never silently assign or process invalid data
    validation = validate_column_mapping(
        dataset.scheme_id,
        mapping_to_use,
        columns,
        sample_rows=preview_rows
    )

    if not validation["is_valid"]:
        error_msg = "; ".join(validation["errors"])
        raise HTTPException(
            status_code=400,
            detail=f"Cannot process dataset: {error_msg}. Please map all mandatory columns correctly."
        )

    # Save mapping if updated
    dataset.column_mapping = mapping_to_use
    db.commit()

    # Create job record
    job = ProcessingJob(
        dataset_id=dataset_id,
        scheme_id=dataset.scheme_id,
        reporting_year=dataset.reporting_year,
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch Spark job in background with its own DB session
    background_tasks.add_task(
        _run_spark_background,
        job_id=job.id,
        dataset_id=dataset_id,
        file_path=dataset.file_path,
        scheme_id=dataset.scheme_id,
        reporting_year=dataset.reporting_year,
        column_mapping=mapping_to_use,
    )

    return {
        "job_id": job.id,
        "dataset_id": dataset_id,
        "status": "queued",
        "validation": validation,
        "message": "Spark processing job queued. Poll GET /api/jobs/{job_id} for status.",
    }
