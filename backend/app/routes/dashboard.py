"""
GovPulse — Dashboard Router
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database.db import get_db
from app.models.models import Dataset, ProcessingJob, AnalyticsResult

router = APIRouter()


@router.get("/summary", summary="Dashboard overview statistics")
def dashboard_summary(db: Session = Depends(get_db)):
    # Total datasets
    ds_count = db.execute(select(func.count()).select_from(Dataset)).scalar() or 0

    # Total records processed
    records_result = db.execute(
        select(func.sum(Dataset.valid_records)).where(Dataset.status == "processed")
    )
    total_records = records_result.scalar() or 0

    # Job counts
    jobs_result = db.execute(select(ProcessingJob))
    all_jobs = jobs_result.scalars().all()
    completed_jobs = [j for j in all_jobs if j.status == "completed"]
    failed_jobs = [j for j in all_jobs if j.status == "failed"]

    # Scheme breakdown
    scheme_result = db.execute(
        select(Dataset.scheme_id, func.count().label("count"))
        .group_by(Dataset.scheme_id)
    )
    scheme_counts = {row.scheme_id: row.count for row in scheme_result}

    # State/district coverage from analytics results
    states_covered = 0
    districts_covered = 0
    try:
        state_results = db.execute(
            select(AnalyticsResult).where(AnalyticsResult.result_type == "summary")
        )
        for ar in state_results.scalars().all():
            data = ar.result_data or {}
            if isinstance(data, dict):
                states_covered = max(states_covered, data.get("states_covered", 0) or 0)
                districts_covered = max(districts_covered, data.get("districts_covered", 0) or 0)
    except Exception:
        pass

    # Recent jobs
    recent_result = db.execute(
        select(ProcessingJob).order_by(ProcessingJob.id.desc()).limit(5)
    )
    recent_jobs = [
        {
            "id": j.id,
            "dataset_id": j.dataset_id,
            "scheme_id": j.scheme_id,
            "status": j.status,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "processing_time_seconds": j.processing_time_seconds,
        }
        for j in recent_result.scalars().all()
    ]

    # Scheme summary with analytics
    scheme_names = {
        "mgnrega": "MGNREGA", "pmayg": "PMAY-G",
        "pmjay": "PM-JAY", "udise": "UDISE+"
    }
    scheme_summary = []
    for scheme_id, ds_count_val in scheme_counts.items():
        processed = sum(1 for j in completed_jobs if j.scheme_id == scheme_id)
        scheme_summary.append({
            "scheme_id": scheme_id,
            "scheme_name": scheme_names.get(scheme_id, scheme_id.upper()),
            "datasets": ds_count_val,
            "processed_jobs": processed,
        })

    return {
        "total_schemes": 4,
        "total_datasets": ds_count,
        "total_records_processed": int(total_records),
        "states_covered": int(states_covered),
        "districts_covered": int(districts_covered),
        "total_jobs": len(all_jobs),
        "completed_jobs": len(completed_jobs),
        "failed_jobs": len(failed_jobs),
        "scheme_summary": scheme_summary,
        "recent_jobs": recent_jobs,
        "has_data": ds_count > 0,
    }
