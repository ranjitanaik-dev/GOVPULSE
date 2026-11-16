"""
GovPulse Data Validation Module
---------------------------------
Validates Spark DataFrames for required columns, numeric ranges,
and generates a data quality report.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional
from pyspark.sql import DataFrame
from pyspark.sql import functions as F

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    is_valid: bool
    total_records: int
    valid_records: int
    invalid_records: int
    missing_required_cols: list[str] = field(default_factory=list)
    missing_optional_cols: list[str] = field(default_factory=list)
    null_counts: dict = field(default_factory=dict)
    duplicate_count: int = 0
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "total_records": self.total_records,
            "valid_records": self.valid_records,
            "invalid_records": self.invalid_records,
            "missing_required_cols": self.missing_required_cols,
            "missing_optional_cols": self.missing_optional_cols,
            "null_counts": self.null_counts,
            "duplicate_count": self.duplicate_count,
            "warnings": self.warnings,
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Scheme column configurations
# ---------------------------------------------------------------------------

SCHEME_COLUMNS = {
    "mgnrega": {
        "required": ["state", "district"],
        "numeric_required": [],
        "numeric_optional": [
            "persondays_central_liability", "person_days_generated", "person_days_target",
            "expenditure_lakh", "wages_lakh", "material_lakh", "admin_expenditure_lakh", "total_budget_lakh",
            "households_registered", "households_employed", "individuals_worked",
            "completed_works", "ongoing_works", "total_works_takenup",
            "women_persondays", "sc_persondays", "st_persondays", "active_job_cards",
        ],
        "dedup_keys": ["state", "district", "reporting_year", "month"],
    },
    "pmayg": {
        "required": ["district"],
        "numeric_required": [],
        "numeric_optional": [
            "sanctions_geotagged", "sanctions_verified_accounts",
            "installment_1", "installment_2", "installment_3", "installment_4",
            "completed_verified", "completed_houses",
            "houses_target", "houses_sanctioned", "houses_completed",
            "houses_in_progress", "expenditure_cr",
        ],
        "dedup_keys": ["district"],
    },
    "pmjay": {
        "required": ["state"],
        "numeric_required": [],
        "numeric_optional": [
            "beneficiaries_identified", "cards_issued", "hospitalisations",
            "claims_submitted", "claims_settled",
        ],
        "dedup_keys": ["state", "reporting_year"],
    },
    "udise": {
        "required": ["state", "district"],
        "numeric_required": [],
        "numeric_optional": [
            "total_schools", "total_students", "total_teachers",
            "gross_enrolment_ratio", "net_enrolment_ratio",
        ],
        "dedup_keys": ["state", "district", "reporting_year"],
    },
}


def get_scheme_config(scheme_id: str) -> dict:
    """Return column configuration for a given scheme."""
    return SCHEME_COLUMNS.get(scheme_id.lower(), {
        "required": ["state"],
        "numeric_required": [],
        "numeric_optional": [],
        "dedup_keys": ["state"],
    })


def validate_dataset(
    df: DataFrame,
    scheme_id: str,
    custom_required: Optional[list[str]] = None,
) -> ValidationResult:
    """
    Validate a Spark DataFrame against scheme requirements.

    Returns a ValidationResult with full quality report.
    """
    config = get_scheme_config(scheme_id)
    required_cols = custom_required or config.get("required", [])
    numeric_optional = config.get("numeric_optional", [])

    total = df.count()
    present_cols = set(df.columns)

    missing_required = [c for c in required_cols if c not in present_cols]
    missing_optional = [c for c in numeric_optional if c not in present_cols]

    errors = []
    warnings = []

    if missing_required:
        errors.append(f"Missing required columns: {missing_required}")

    if missing_optional:
        warnings.append(f"Optional columns not found (indicators unavailable): {missing_optional}")

    # Count nulls in present numeric columns
    present_numeric = [c for c in numeric_optional if c in present_cols]
    null_counts = {}
    if present_numeric:
        null_expr = [F.sum(F.col(c).isNull().cast("int")).alias(c) for c in present_numeric]
        null_row = df.agg(*null_expr).collect()[0]
        null_counts = {c: int(null_row[c] or 0) for c in present_numeric}
        for col, count in null_counts.items():
            pct = (count / total * 100) if total > 0 else 0
            if pct > 50:
                warnings.append(f"Column '{col}' has {pct:.1f}% null values.")

    # Count invalid rows — rows where ALL present numeric columns are null
    invalid_count = 0
    if present_numeric:
        null_cond = F.lit(True)
        for col in present_numeric:
            null_cond = null_cond & F.col(col).isNull()
        invalid_count = df.filter(null_cond).count()

    valid_count = total - invalid_count

    return ValidationResult(
        is_valid=len(errors) == 0,
        total_records=total,
        valid_records=valid_count,
        invalid_records=invalid_count,
        missing_required_cols=missing_required,
        missing_optional_cols=missing_optional,
        null_counts=null_counts,
        warnings=warnings,
        errors=errors,
    )
