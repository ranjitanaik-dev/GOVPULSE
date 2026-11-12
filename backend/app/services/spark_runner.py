"""
GovPulse — Spark Job Runner Service
--------------------------------------
Launches run_pipeline.py as a subprocess so FastAPI stays non-blocking.
"""

import os
import sys
import json
import asyncio
import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy import update, select

from app.models.models import ProcessingJob, Dataset, AnalyticsResult, DataQualityResult

logger = logging.getLogger("govpulse.spark_runner")

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
PIPELINE_SCRIPT = os.path.join(PROJECT_ROOT, "spark_jobs", "run_pipeline.py")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "data", "reports")


async def launch_spark_job(
    db: Session,
    job_id: int,
    dataset_id: int,
    file_path: str,
    scheme_id: str,
    reporting_year: str,
    column_mapping: dict = None,
):
    """
    Launch the Spark pipeline as a background subprocess.
    Updates ProcessingJob status in SQLite throughout.
    """
    output_file = os.path.join(RESULTS_DIR, f"result_job_{job_id}.json")
    os.makedirs(RESULTS_DIR, exist_ok=True)

    col_map_str = json.dumps(column_mapping or {})

    cmd = [
        sys.executable,
        PIPELINE_SCRIPT,
        "--dataset_id", str(dataset_id),
        "--file_path", file_path,
        "--scheme_id", scheme_id,
        "--reporting_year", reporting_year,
        "--column_mapping", col_map_str,
        "--output_file", output_file,
    ]

    logger.info(f"Launching Spark job {job_id}: {' '.join(cmd)}")

    # Mark job as running
    db.execute(
        update(ProcessingJob)
        .where(ProcessingJob.id == job_id)
        .values(status="running", started_at=datetime.datetime.utcnow())
    )
    db.execute(
        update(Dataset)
        .where(Dataset.id == dataset_id)
        .values(status="processing")
    )
    db.commit()

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=PROJECT_ROOT,
        )
        stdout, _ = await process.communicate()
        log_output = stdout.decode("utf-8", errors="replace") if stdout else ""

        # Read result JSON
        result = {}
        if os.path.exists(output_file):
            with open(output_file, "r", encoding="utf-8") as f:
                result = json.load(f)

        status = result.get("status", "failed")
        completed_at = datetime.datetime.utcnow()

        db.execute(
            update(ProcessingJob)
            .where(ProcessingJob.id == job_id)
            .values(
                status=status,
                completed_at=completed_at,
                processing_time_seconds=result.get("processing_time_seconds"),
                raw_records=result.get("raw_records"),
                valid_records=result.get("valid_records"),
                invalid_records=result.get("invalid_records"),
                duplicates_removed=result.get("duplicates_removed"),
                result_json_path=output_file,
                error_message=result.get("error") if status == "failed" else None,
                log_output=log_output[-10000:] if log_output else None,  # Truncate
            )
        )

        dataset_status = "processed" if status == "completed" else "failed"
        db.execute(
            update(Dataset)
            .where(Dataset.id == dataset_id)
            .values(
                status=dataset_status,
                processed_at=completed_at,
                valid_records=result.get("valid_records"),
                invalid_records=result.get("invalid_records"),
                total_records=result.get("raw_records"),
            )
        )

        # Store analytics results
        analytics = result.get("analytics", {})
        if analytics and status == "completed":
            for result_type, data in analytics.items():
                ar = AnalyticsResult(
                    dataset_id=dataset_id,
                    job_id=job_id,
                    scheme_id=scheme_id,
                    reporting_year=reporting_year,
                    result_type=result_type,
                    result_data=data if isinstance(data, (dict, list)) else {"value": data},
                )
                db.add(ar)

            # Store validation/quality results
            validation = result.get("validation", {})
            if validation:
                dq = DataQualityResult(
                    dataset_id=dataset_id,
                    total_records=validation.get("total_records"),
                    valid_records=validation.get("valid_records"),
                    invalid_records=validation.get("invalid_records"),
                    duplicate_count=result.get("duplicates_removed", 0),
                    missing_required_cols=validation.get("missing_required_cols"),
                    missing_optional_cols=validation.get("missing_optional_cols"),
                    null_counts=validation.get("null_counts"),
                    warnings=validation.get("warnings"),
                    errors=validation.get("errors"),
                )
                db.add(dq)

        db.commit()
        logger.info(f"Spark job {job_id} finished with status: {status}")
        return result

    except Exception as e:
        logger.error(f"Spark job {job_id} failed with exception: {e}")
        db.execute(
            update(ProcessingJob)
            .where(ProcessingJob.id == job_id)
            .values(status="failed", error_message=str(e), completed_at=datetime.datetime.utcnow())
        )
        db.execute(
            update(Dataset)
            .where(Dataset.id == dataset_id)
            .values(status="failed")
        )
        db.commit()
        raise
