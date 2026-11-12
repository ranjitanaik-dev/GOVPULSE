"""
GovPulse — SQLAlchemy ORM Models
"""

import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean,
    ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database.db import Base


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(String, primary_key=True)          # e.g. 'mgnrega'
    name = Column(String, nullable=False)
    description = Column(Text)
    ministry = Column(String)
    supported_indicators = Column(JSON)             # list of indicator codes
    required_columns = Column(JSON)
    optional_columns = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    datasets = relationship("Dataset", back_populates="scheme")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_id = Column(String, ForeignKey("schemes.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer)
    file_format = Column(String)                   # csv / excel
    reporting_year = Column(String)
    source = Column(String)                        # e.g. 'MoRD', 'MGNREGA Portal'
    total_records = Column(Integer)
    valid_records = Column(Integer)
    invalid_records = Column(Integer)
    column_mapping = Column(JSON)
    detected_columns = Column(JSON)
    validation_result = Column(JSON)
    status = Column(String, default="uploaded")    # uploaded/processing/processed/failed
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    processed_at = Column(DateTime)

    scheme = relationship("Scheme", back_populates="datasets")
    jobs = relationship("ProcessingJob", back_populates="dataset")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    status = Column(String, default="queued")      # queued/running/completed/failed
    scheme_id = Column(String)
    reporting_year = Column(String)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    processing_time_seconds = Column(Float)
    raw_records = Column(Integer)
    valid_records = Column(Integer)
    invalid_records = Column(Integer)
    duplicates_removed = Column(Integer)
    output_path = Column(String)
    result_json_path = Column(String)
    error_message = Column(Text)
    log_output = Column(Text)

    dataset = relationship("Dataset", back_populates="jobs")


class AnalyticsResult(Base):
    __tablename__ = "analytics_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    job_id = Column(Integer, ForeignKey("processing_jobs.id"))
    scheme_id = Column(String)
    reporting_year = Column(String)
    result_type = Column(String)                   # summary / state_performance / district_rankings / alerts
    result_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DataQualityResult(Base):
    __tablename__ = "data_quality_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    total_records = Column(Integer)
    valid_records = Column(Integer)
    invalid_records = Column(Integer)
    duplicate_count = Column(Integer)
    missing_required_cols = Column(JSON)
    missing_optional_cols = Column(JSON)
    null_counts = Column(JSON)
    warnings = Column(JSON)
    errors = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
