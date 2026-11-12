"""
GovPulse — Jobs Router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.db import get_db
from app.models.models import ProcessingJob

router = APIRouter()


@router.get("/{job_id}", summary="Get processing job status")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(ProcessingJob, job_id)
    if not job:
        raise HTTPException(404, detail="Job not found")
    return {
        "id": job.id,
        "dataset_id": job.dataset_id,
        "status": job.status,
        "scheme_id": job.scheme_id,
        "reporting_year": job.reporting_year,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "processing_time_seconds": job.processing_time_seconds,
        "raw_records": job.raw_records,
        "valid_records": job.valid_records,
        "invalid_records": job.invalid_records,
        "duplicates_removed": job.duplicates_removed,
        "error_message": job.error_message,
    }


@router.get("", summary="List all processing jobs")
def list_jobs(db: Session = Depends(get_db)):
    result = db.execute(
        select(ProcessingJob).order_by(ProcessingJob.id.desc()).limit(50)
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "dataset_id": j.dataset_id,
            "scheme_id": j.scheme_id,
            "status": j.status,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            "processing_time_seconds": j.processing_time_seconds,
            "raw_records": j.raw_records,
            "valid_records": j.valid_records,
        }
        for j in jobs
    ]
