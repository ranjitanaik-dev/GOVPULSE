"""
GovPulse — Reports Router
"""

import os
import io
import csv
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.db import get_db
from app.models.models import AnalyticsResult, Dataset

logger = logging.getLogger("govpulse.routes.reports")
router = APIRouter()

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)


@router.get("/export", summary="Export analytics as CSV")
def export_csv(
    scheme_id: str = Query(..., description="Scheme to export"),
    result_type: str = Query(default="state_performance", description="Result type to export"),
    db: Session = Depends(get_db),
):
    query = select(AnalyticsResult).where(
        AnalyticsResult.scheme_id == scheme_id,
        AnalyticsResult.result_type == result_type,
    ).order_by(AnalyticsResult.id.desc()).limit(1)

    result = db.execute(query)
    row = result.scalar_one_or_none()

    if not row or not row.result_data:
        raise HTTPException(404, detail=f"No '{result_type}' data found for scheme '{scheme_id}'.")

    data = row.result_data
    if not isinstance(data, list):
        data = [data] if isinstance(data, dict) else []

    if not data:
        raise HTTPException(404, detail="No data rows to export.")

    # Build CSV
    output = io.StringIO()
    fieldnames = list(data[0].keys()) if data else []
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(data)
    output.seek(0)

    filename = f"govpulse_{scheme_id}_{result_type}_{row.reporting_year or 'all'}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
