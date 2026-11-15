"""
GovPulse — Analytics Router
"""

import json
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.db import get_db
from app.models.models import AnalyticsResult, Dataset, ProcessingJob, DataQualityResult

logger = logging.getLogger("govpulse.routes.analytics")
router = APIRouter()

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)


import math

def _sanitize_json(obj):
    """Recursively replace float('nan') and float('inf') with None for clean JSON response."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: _sanitize_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize_json(item) for item in obj]
    return obj


def _load_result(results: list, result_type: str):
    """Extract result_data for a given result_type from a list of AnalyticsResult rows."""
    for r in results:
        if r.result_type == result_type:
            return _sanitize_json(r.result_data)
    return None


@router.get("/scheme/{scheme_id}", summary="Analytics for a specific scheme")
def scheme_analytics(
    scheme_id: str,
    reporting_year: str = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(AnalyticsResult).where(AnalyticsResult.scheme_id == scheme_id)
    if reporting_year and isinstance(reporting_year, str):
        query = query.where(AnalyticsResult.reporting_year == reporting_year)
    query = query.order_by(AnalyticsResult.id.desc())

    result = db.execute(query)
    rows = result.scalars().all()

    if not rows:
        return {
            "scheme_id": scheme_id,
            "reporting_year": reporting_year,
            "has_data": False,
            "summary": None,
            "state_performance": [],
            "district_rankings": {"top": [], "bottom": []},
            "alerts": [],
            "message": "No processed data found for this scheme. Upload and process a dataset first.",
        }

    # Collect the latest result of each type
    seen = set()
    latest = []
    for row in rows:
        if row.result_type not in seen:
            seen.add(row.result_type)
            latest.append(row)

    summary = _load_result(latest, "summary") or {}
    state_perf = _load_result(latest, "state_performance") or []
    rankings = _load_result(latest, "district_rankings") or {"top": [], "bottom": []}
    alerts_data = _load_result(latest, "alerts_count")
    monthly_trends = _load_result(latest, "monthly_trends") or []
    participation = _load_result(latest, "participation")
    work_completion = _load_result(latest, "work_completion")
    expenditure_breakdown = _load_result(latest, "expenditure_breakdown")

    return _sanitize_json({
        "scheme_id": scheme_id,
        "reporting_year": rows[0].reporting_year if rows else None,
        "has_data": True,
        "summary": summary,
        "state_performance": state_perf if isinstance(state_perf, list) else [],
        "district_rankings": rankings if isinstance(rankings, dict) else {"top": [], "bottom": []},
        "monthly_trends": monthly_trends if isinstance(monthly_trends, list) else [],
        "participation": participation,
        "work_completion": work_completion,
        "expenditure_breakdown": expenditure_breakdown,
        "alerts_count": alerts_data,
        "available_result_types": list(seen),
    })


@router.get("/states", summary="State-wise performance across all schemes")
def states_analytics(
    scheme_id: str = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(AnalyticsResult).where(AnalyticsResult.result_type == "state_performance")
    if scheme_id and isinstance(scheme_id, str):
        query = query.where(AnalyticsResult.scheme_id == scheme_id)

    result = db.execute(query.order_by(AnalyticsResult.id.desc()))
    rows = result.scalars().all()

    all_state_data = []
    seen_schemes = set()
    for row in rows:
        if row.scheme_id not in seen_schemes:
            seen_schemes.add(row.scheme_id)
            if isinstance(row.result_data, list):
                for item in row.result_data:
                    item["scheme_id"] = row.scheme_id
                    all_state_data.append(item)

    return {
        "has_data": len(all_state_data) > 0,
        "states": all_state_data,
        "schemes_included": list(seen_schemes),
    }


@router.get("/districts", summary="District-wise rankings")
def districts_analytics(
    scheme_id: str = Query(default=None),
    state: str = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(AnalyticsResult).where(AnalyticsResult.result_type == "district_rankings")
    if scheme_id and isinstance(scheme_id, str):
        query = query.where(AnalyticsResult.scheme_id == scheme_id)

    result = db.execute(query.order_by(AnalyticsResult.id.desc()))
    rows = result.scalars().all()

    target_state = state if isinstance(state, str) else None

    combined_top = []
    combined_bottom = []
    for row in rows:
        data = row.result_data or {}
        if isinstance(data, dict):
            top_items = data.get("top", [])
            bottom_items = data.get("bottom", [])
            for item in top_items:
                item["scheme_id"] = row.scheme_id
                if not target_state or item.get("state", "").lower() == target_state.lower():
                    combined_top.append(item)
            for item in bottom_items:
                item["scheme_id"] = row.scheme_id
                if not target_state or item.get("state", "").lower() == target_state.lower():
                    combined_bottom.append(item)

    return {
        "has_data": len(combined_top) > 0,
        "top_districts": combined_top[:10],
        "bottom_districts": combined_bottom[:10],
    }


@router.get("/trends", summary="Year-wise and month-wise trend data")
def trends_analytics(
    scheme_id: str = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(AnalyticsResult).where(AnalyticsResult.result_type == "summary")
    if scheme_id and isinstance(scheme_id, str):
        query = query.where(AnalyticsResult.scheme_id == scheme_id)

    result = db.execute(query.order_by(AnalyticsResult.id.asc()))
    rows = result.scalars().all()

    trends = []
    for row in rows:
        data = row.result_data or {}
        if isinstance(data, dict):
            trends.append({
                "scheme_id": row.scheme_id,
                "reporting_year": row.reporting_year,
                **{k: v for k, v in data.items() if isinstance(v, (int, float, type(None)))},
            })

    monthly = []
    if scheme_id and isinstance(scheme_id, str):
        m_query = select(AnalyticsResult).where(
            AnalyticsResult.result_type == "monthly_trends",
            AnalyticsResult.scheme_id == scheme_id
        ).order_by(AnalyticsResult.id.desc())
        m_row = db.execute(m_query).scalars().first()
        if m_row and isinstance(m_row.result_data, list):
            monthly = m_row.result_data

    return {
        "has_data": len(trends) > 0 or len(monthly) > 0,
        "trends": trends,
        "monthly_trends": monthly,
    }


@router.get("/rankings", summary="Top and bottom district rankings")
def rankings(
    scheme_id: str = Query(default=None),
    top_n: int = Query(default=10),
    db: Session = Depends(get_db),
):
    query = select(AnalyticsResult).where(AnalyticsResult.result_type == "district_rankings")
    if scheme_id and isinstance(scheme_id, str):
        query = query.where(AnalyticsResult.scheme_id == scheme_id)

    result = db.execute(query.order_by(AnalyticsResult.id.desc()).limit(5))
    rows = result.scalars().all()

    n = top_n if isinstance(top_n, int) else 10
    top = []
    bottom = []
    for row in rows:
        data = row.result_data or {}
        if isinstance(data, dict):
            top.extend(data.get("top", [])[:n])
            bottom.extend(data.get("bottom", [])[:n])

    return {
        "has_data": len(top) > 0,
        "top": top[:n],
        "bottom": bottom[:n],
    }


@router.get("/alerts", summary="Performance alerts and underperforming districts")
def alerts(
    scheme_id: str = Query(default=None),
    band: str = Query(default=None, description="Filter by band: 'Low Achievement', 'Needs Attention', 'On Track'"),
    db: Session = Depends(get_db),
):
    # Load data quality results
    dq_query = select(DataQualityResult).order_by(DataQualityResult.id.desc()).limit(20)
    dq_result = db.execute(dq_query)
    dq_rows = dq_result.scalars().all()

    quality_alerts = []
    for dq in dq_rows:
        if dq.errors:
            quality_alerts.append({
                "type": "validation_error",
                "dataset_id": dq.dataset_id,
                "message": "; ".join(dq.errors),
            })
        if dq.warnings:
            for w in dq.warnings:
                quality_alerts.append({
                    "type": "data_warning",
                    "dataset_id": dq.dataset_id,
                    "message": w,
                })

    # Load performance alerts from result JSON files
    perf_alerts = []
    reports_dir = os.path.join(PROJECT_ROOT, "data", "reports")
    if os.path.exists(reports_dir):
        for fname in os.listdir(reports_dir):
            if fname.startswith("result_job_") and fname.endswith(".json"):
                try:
                    fpath = os.path.join(reports_dir, fname)
                    with open(fpath, "r") as f:
                        data = json.load(f)
                    if scheme_id and data.get("scheme_id") != scheme_id:
                        continue
                    alerts_count = data.get("analytics", {}).get("alerts_count", 0)
                    if alerts_count and alerts_count > 0:
                        perf_alerts.append({
                            "type": "performance_alert",
                            "scheme_id": data.get("scheme_id"),
                            "dataset_id": data.get("dataset_id"),
                            "alerts_count": alerts_count,
                            "message": f"{alerts_count} districts not on track in {data.get('scheme_id', '').upper()}",
                        })
                except Exception:
                    pass

    all_alerts = quality_alerts + perf_alerts
    return {
        "has_data": len(all_alerts) > 0,
        "total_alerts": len(all_alerts),
        "alerts": all_alerts,
    }
