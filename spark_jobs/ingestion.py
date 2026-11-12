"""
GovPulse Data Ingestion Module
--------------------------------
Reads uploaded CSV / Excel files into Spark DataFrames.
Excel files are first converted to CSV using pandas so Spark
can process them without requiring a Hadoop Excel connector.
"""

import os
import logging
import pandas as pd
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import StringType

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Column name normalisation helpers
# ---------------------------------------------------------------------------

def _normalise_col_name(name: str) -> str:
    """Lowercase, strip, replace spaces/special chars with underscores."""
    import re
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = name.strip("_")
    return name


def normalise_column_names(df: DataFrame) -> DataFrame:
    """Return a new DataFrame with all column names normalised."""
    for col in df.columns:
        new_col = _normalise_col_name(col)
        if new_col != col:
            df = df.withColumnRenamed(col, new_col)
    return df


# ---------------------------------------------------------------------------
# File reading
# ---------------------------------------------------------------------------

def excel_to_csv(excel_path: str, sheet_index: int = 0) -> str:
    """
    Convert an Excel file to CSV using pandas and save alongside the source.
    Returns the path to the generated CSV file.
    """
    csv_path = os.path.splitext(excel_path)[0] + "_converted.csv"
    logger.info(f"Converting Excel to CSV: {excel_path} -> {csv_path}")
    df = pd.read_excel(excel_path, sheet_name=sheet_index, dtype=str)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    logger.info(f"Conversion complete. Rows: {len(df)}")
    return csv_path


def read_dataset(
    spark: SparkSession,
    file_path: str,
    scheme_id: str,
    file_format: str = "auto",
    delimiter: str = ",",
) -> DataFrame:
    """
    Load a government dataset file into a Spark DataFrame.

    Parameters
    ----------
    spark       : Active SparkSession
    file_path   : Absolute path to the uploaded file
    scheme_id   : e.g. 'mgnrega', 'pmayg'
    file_format : 'csv', 'excel', or 'auto' (detected from extension)
    delimiter   : CSV column delimiter (default comma)

    Returns
    -------
    Spark DataFrame with normalised column names and an added 'source_file'
    column.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if file_format == "auto":
        file_format = "excel" if ext in (".xls", ".xlsx") else "csv"

    if file_format == "excel":
        file_path = excel_to_csv(file_path)
        file_format = "csv"

    logger.info(f"Reading {file_format.upper()} file for scheme '{scheme_id}': {file_path}")

    df = (
        spark.read
        .option("header", "true")
        .option("inferSchema", "false")          # Keep everything as string; cast later
        .option("multiLine", "true")
        .option("escape", '"')
        .option("encoding", "UTF-8")
        .option("sep", delimiter)
        .option("nullValue", "")
        .option("nanValue", "NA")
        .csv(file_path)
    )

    df = normalise_column_names(df)
    df = df.withColumn("source_file", F.lit(os.path.basename(file_path)))
    df = df.withColumn("scheme_id", F.lit(scheme_id))

    record_count = df.count()
    logger.info(f"Loaded {record_count:,} records with {len(df.columns)} columns.")
    return df


# ---------------------------------------------------------------------------
# Column mapping
# ---------------------------------------------------------------------------

def apply_column_mapping(df: DataFrame, mapping: dict) -> DataFrame:
    """
    Rename columns according to a user-supplied mapping dict:
        { "original_col_name": "canonical_col_name", ... }
    Missing columns are silently skipped.
    """
    for original, canonical in mapping.items():
        norm_original = _normalise_col_name(original)
        if norm_original in df.columns:
            df = df.withColumnRenamed(norm_original, canonical)
    return df


def detect_columns(df: DataFrame, required: list[str], optional: list[str] = None) -> dict:
    """
    Check which required/optional columns are present.

    Returns
    -------
    dict with:
        present        : columns found
        missing_required : required columns not found
        missing_optional : optional columns not found
        extra          : columns in df not in required or optional
    """
    optional = optional or []
    present = set(df.columns)
    required_set = set(required)
    optional_set = set(optional)

    return {
        "present": sorted(present),
        "missing_required": sorted(required_set - present),
        "missing_optional": sorted(optional_set - present),
        "extra": sorted(present - required_set - optional_set - {"source_file", "scheme_id"}),
    }
