"""
GovPulse — Datasets Router
"""

import asyncio
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database.db import get_db, SessionLocal
from app.models.models import Dataset, ProcessingJob
from app.services.file_handler import save_uploaded_file
from app.services.spark_runner import launch_spark_job

logger = logging.getLogger("govpulse.routes.datasets")
router = APIRouter()


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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    scheme_id: str = Form(...),
    reporting_year: str = Form(...),
    source: str = Form(default=""),
    column_mapping: str = Form(default="{}"),
    db: Session = Depends(get_db),
):
    # Validate scheme
    valid_schemes = ["mgnrega", "pmayg", "pmjay", "udise"]
    if scheme_id not in valid_schemes:
        raise HTTPException(400, detail=f"Invalid scheme_id. Must be one of: {valid_schemes}")

    # Read file
    content = await file.read()
    if not content:
        raise HTTPException(400, detail="Uploaded file is empty.")

    # Save file
    try:
        file_meta = save_uploaded_file(content, file.filename, scheme_id)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    # Parse column mapping
    try:
        col_map = json.loads(column_mapping) if column_mapping else {}
    except json.JSONDecodeError:
        col_map = {}

    # Quick column detection (pandas — not Spark, just for preview)
    detected_cols = []
    try:
        import pandas as pd
        fp = file_meta["file_path"]
        if file_meta["file_format"] == "csv":
            preview = pd.read_csv(fp, nrows=0)
        else:
            preview = pd.read_excel(fp, nrows=0)
        detected_cols = list(preview.columns)
    except Exception:
        detected_cols = []

    # Create Dataset record
    dataset = Dataset(
        scheme_id=scheme_id,
        file_name=file_meta["file_name"],
        file_path=file_meta["file_path"],
        file_size_bytes=file_meta["file_size_bytes"],
        file_format=file_meta["file_format"],
        reporting_year=reporting_year,
        source=source or None,
        column_mapping=col_map or None,
        detected_columns=detected_cols,
        status="uploaded",
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return {
        "dataset_id": dataset.id,
        "file_name": dataset.file_name,
        "scheme_id": scheme_id,
        "reporting_year": reporting_year,
        "file_size_bytes": dataset.file_size_bytes,
        "detected_columns": detected_cols,
        "status": "uploaded",
        "message": "File uploaded successfully. Use POST /api/datasets/{id}/process to start Spark processing.",
    }


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


@router.post("/{dataset_id}/process", summary="Trigger Spark processing for a dataset")
def process_dataset(
    dataset_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    if dataset.status == "processing":
        raise HTTPException(409, detail="Dataset is already being processed.")

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
        column_mapping=dataset.column_mapping or {},
    )

    return {
        "job_id": job.id,
        "dataset_id": dataset_id,
        "status": "queued",
        "message": "Spark processing job queued. Poll GET /api/jobs/{job_id} for status.",
    }
