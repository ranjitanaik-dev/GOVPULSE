"""
GovPulse — Pydantic Schemas
"""

from __future__ import annotations
import datetime
from typing import Optional, Any
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Scheme
# ---------------------------------------------------------------------------

class SchemeBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    ministry: Optional[str] = None
    is_active: bool = True


class SchemeResponse(SchemeBase):
    supported_indicators: Optional[list] = None
    required_columns: Optional[list] = None
    optional_columns: Optional[list] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

class DatasetCreate(BaseModel):
    scheme_id: str
    reporting_year: str
    source: Optional[str] = None
    column_mapping: Optional[dict] = None


class DatasetResponse(BaseModel):
    id: int
    scheme_id: str
    file_name: str
    file_size_bytes: Optional[int]
    file_format: Optional[str]
    reporting_year: Optional[str]
    source: Optional[str]
    total_records: Optional[int]
    valid_records: Optional[int]
    invalid_records: Optional[int]
    detected_columns: Optional[list]
    validation_result: Optional[dict]
    status: str
    uploaded_at: datetime.datetime
    processed_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Processing Job
# ---------------------------------------------------------------------------

class JobResponse(BaseModel):
    id: int
    dataset_id: int
    status: str
    scheme_id: Optional[str]
    reporting_year: Optional[str]
    started_at: Optional[datetime.datetime]
    completed_at: Optional[datetime.datetime]
    processing_time_seconds: Optional[float]
    raw_records: Optional[int]
    valid_records: Optional[int]
    invalid_records: Optional[int]
    duplicates_removed: Optional[int]
    error_message: Optional[str]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class StatePerformanceItem(BaseModel):
    state: str
    total_value: Optional[float]
    total_target: Optional[float]
    achievement_pct: Optional[float]


class DistrictRankingItem(BaseModel):
    state: str
    district: str
    total_value: Optional[float]
    total_target: Optional[float]
    achievement_pct: Optional[float]


class AlertItem(BaseModel):
    state: str
    district: str
    achievement_pct: Optional[float]
    performance_band: str


class DashboardSummary(BaseModel):
    total_schemes: int
    total_datasets: int
    total_records_processed: int
    states_covered: int
    districts_covered: int
    processing_jobs: int
    completed_jobs: int
    failed_jobs: int
    scheme_summary: list[dict]
    recent_jobs: list[dict]


class AnalyticsResponse(BaseModel):
    scheme_id: str
    reporting_year: Optional[str]
    summary: Optional[dict]
    state_performance: Optional[list[dict]]
    district_rankings: Optional[dict]
    alerts: Optional[list[dict]]
    available_indicators: list[str]
