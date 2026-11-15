"""
GovPulse Data Preprocessing Module
-------------------------------------
Cleans and standardises raw Spark DataFrames before analytics.
"""

import logging
from pyspark.sql import DataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType, IntegerType, LongType

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# State / District name standardisation maps
# ---------------------------------------------------------------------------

STATE_NAME_MAP = {
    "andaman & nicobar islands": "Andaman and Nicobar Islands",
    "andaman and nicobar": "Andaman and Nicobar Islands",
    "ap": "Andhra Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chandigarh": "Chandigarh",
    "chhattisgarh": "Chhattisgarh",
    "chattisgarh": "Chhattisgarh",
    "dadra & nagar haveli and daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "hp": "Himachal Pradesh",
    "jammu & kashmir": "Jammu and Kashmir",
    "jammu and kashmir": "Jammu and Kashmir",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "ladakh": "Ladakh",
    "lakshadweep": "Lakshadweep",
    "madhya pradesh": "Madhya Pradesh",
    "mp": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "tn": "Tamil Nadu",
    "telangana": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "up": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
    "uttaranchal": "Uttarakhand",
    "west bengal": "West Bengal",
    "wb": "West Bengal",
}


def _build_state_mapping_expr(col_name: str):
    """Build a Spark CASE WHEN expression for state name standardisation."""
    expr_parts = []
    for raw, standard in STATE_NAME_MAP.items():
        expr_parts.append(
            f"WHEN lower(trim({col_name})) = '{raw}' THEN '{standard}'"
        )
    fallback = f"ELSE initcap(trim({col_name}))"
    return f"CASE {' '.join(expr_parts)} {fallback} END"


# ---------------------------------------------------------------------------
# Core preprocessing functions
# ---------------------------------------------------------------------------

def standardise_states(df: DataFrame, state_col: str = "state") -> DataFrame:
    """Standardise state names to official Indian names."""
    if state_col not in df.columns:
        return df
    mapping_expr = _build_state_mapping_expr(state_col)
    return df.withColumn(state_col, F.expr(mapping_expr))


def standardise_districts(df: DataFrame, district_col: str = "district") -> DataFrame:
    """Basic district name standardisation — capitalise and trim."""
    if district_col not in df.columns:
        return df
    return df.withColumn(
        district_col,
        F.initcap(F.trim(F.col(district_col)))
    )


def cast_numeric_columns(df: DataFrame, numeric_cols: list[str]) -> DataFrame:
    """
    Cast specified columns to DoubleType.
    Invalid values (non-numeric strings) become null.
    """
    for col in numeric_cols:
        if col in df.columns:
            # Remove commas from Indian number format before casting
            df = df.withColumn(
                col,
                F.regexp_replace(F.col(col), r"[,\s]", "").cast(DoubleType())
            )
    return df


def handle_missing_values(
    df: DataFrame,
    fill_string: str = "Unknown",
    fill_numeric: float = None,
) -> DataFrame:
    """
    Fill null string columns with a placeholder.
    Numeric nulls are left as null by default (downstream analytics skip them).
    """
    string_cols = [f.name for f in df.schema.fields if isinstance(f.dataType, type(F.col("x").cast("string").expr))]
    # Simpler: get all column types
    for field in df.schema.fields:
        dtype = field.dataType.typeName()
        if dtype == "string":
            df = df.fillna({field.name: fill_string})
    return df


def remove_duplicates(df: DataFrame, subset: list[str]) -> tuple[DataFrame, int]:
    """
    Remove true duplicate rows without blindly dropping valid periodic snapshots.
    If multiple snapshots exist per district (e.g. periodic/daily updates),
    deduplication operates on exact full-row equality so all valid records are preserved.
    """
    original_count = df.count()
    valid_cols = [c for c in subset if c in df.columns]

    # Check if this is a multi-snapshot dataset (multiple records per geographic unit)
    if "district" in df.columns and "state" in df.columns:
        geo_count = df.select("state", "district").distinct().count()
        if original_count > geo_count * 2:
            # Multi-snapshot dataset: only remove true identical rows across all columns
            df_dedup = df.dropDuplicates()
            duplicates_removed = original_count - df_dedup.count()
            if duplicates_removed > 0:
                logger.info(f"Removed {duplicates_removed:,} exact duplicate rows.")
            return df_dedup, duplicates_removed

    df_dedup = df.dropDuplicates(subset=valid_cols) if valid_cols else df.dropDuplicates()
    dedup_count = df_dedup.count()
    duplicates_removed = original_count - dedup_count
    if duplicates_removed > 0:
        logger.info(f"Removed {duplicates_removed:,} duplicate rows.")
    return df_dedup, duplicates_removed


def add_processing_metadata(df: DataFrame, dataset_id: int, reporting_year: str) -> DataFrame:
    """Add metadata columns used in the common observation schema."""
    return (
        df
        .withColumn("dataset_id", F.lit(dataset_id))
        .withColumn("reporting_year", F.lit(reporting_year))
        .withColumn("processed_at", F.current_timestamp())
    )


def split_valid_invalid(
    df: DataFrame,
    required_numeric_cols: list[str],
) -> tuple[DataFrame, DataFrame]:
    """
    Split DataFrame into valid and invalid rows.
    A row is invalid if ALL required numeric columns are null.
    """
    if not required_numeric_cols:
        return df, df.filter(F.lit(False))

    present = [c for c in required_numeric_cols if c in df.columns]
    if not present:
        return df, df.filter(F.lit(False))

    null_condition = F.lit(True)
    for col in present:
        null_condition = null_condition & F.col(col).isNull()

    invalid_df = df.filter(null_condition)
    valid_df = df.filter(~null_condition)
    return valid_df, invalid_df
