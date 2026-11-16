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
    Convert an Excel file (or HTML table disguised as .xls) to CSV using pandas
    and save alongside the source.
    Returns the path to the generated CSV file.
    """
    csv_path = os.path.splitext(excel_path)[0] + "_converted.csv"
    logger.info(f"Converting Excel / HTML report to CSV: {excel_path} -> {csv_path}")

    is_html = False
    try:
        with open(excel_path, "rb") as f:
            first_chunk = f.read(512).strip().lower()
            if b"<html" in first_chunk or b"<table" in first_chunk or b"<div" in first_chunk:
                is_html = True
    except Exception:
        pass

    if is_html:
        tables = pd.read_html(excel_path)
        target_table = None
        for t in tables:
            if t.shape[0] >= 30 and t.shape[1] >= 8:
                target_table = t
                break
        if target_table is None:
            target_table = tables[0]

        # Promote header row if needed (e.g. row contains 'District Name' or '#SNo')
        header_row_idx = None
        for r_idx in range(min(5, len(target_table))):
            row_vals = [str(x).lower() for x in target_table.iloc[r_idx].dropna()]
            if any("district" in x for x in row_vals) or any("sno" in x for x in row_vals):
                header_row_idx = r_idx
                break

        if header_row_idx is not None:
            headers = [str(h).strip() for h in target_table.iloc[header_row_idx].values]
            df = target_table.iloc[header_row_idx + 1:].copy()
            df.columns = headers
        else:
            df = target_table
    else:
        try:
            df = pd.read_excel(excel_path, sheet_name=sheet_index, dtype=str)
        except Exception as e:
            logger.info(f"read_excel failed ({e}), falling back to read_html...")
            tables = pd.read_html(excel_path)
            df = tables[0]

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


def load_committed_raw_dataset(
    spark: SparkSession,
    dataset_id: int,
) -> DataFrame:
    """
    Authoritative public production entry point for reading committed raw records in Spark.

    Enforcements:
    1. Strictly accepts only spark and dataset_id (non-bypassable).
    2. Uses application environment configuration from get_mongo_uri().
    3. Validates catalog document exists, status == 'INGESTED', and raw_ingestion status == 'VERIFIED_COMPLETE'.
    4. Extracts authoritative committed attempt_number and committed_lease_id.
    5. Calls internal reader with strict attempt-isolated fencing tokens.
    """
    from app.database.mongodb import get_mongo_uri
    return _load_committed_raw_dataset_impl(
        spark=spark,
        dataset_id=dataset_id,
        mongo_uri=get_mongo_uri(),
        database="govpulse_db",
    )


def _load_committed_raw_dataset_impl(
    spark: SparkSession,
    dataset_id: int,
    mongo_uri: str,
    database: str,
) -> DataFrame:
    """Internal implementation supporting isolated test harnesses."""
    from pymongo import MongoClient

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        db = client[database]
        catalog_doc = db.dataset_catalog.find_one({"dataset_id": dataset_id})
    finally:
        client.close()

    if not catalog_doc:
        raise ValueError(f"Dataset {dataset_id} is not registered in MongoDB dataset_catalog.")

    status = catalog_doc.get("status")
    if status == "INGESTING":
        raise ValueError(f"Dataset {dataset_id} is currently INGESTING and not yet committed.")
    if status != "INGESTED":
        raise ValueError(f"Dataset {dataset_id} has invalid status '{status}' (expected 'INGESTED').")

    raw_ingestion = catalog_doc.get("raw_ingestion") or {}
    if raw_ingestion.get("status") != "VERIFIED_COMPLETE":
        raise ValueError(f"Dataset {dataset_id} raw_ingestion status is not VERIFIED_COMPLETE.")

    committed_attempt = catalog_doc.get("attempt_number")
    committed_lease = catalog_doc.get("committed_lease_id")

    # Strict type checking: reject bool explicitly (bool is a subclass of int in Python)
    if isinstance(committed_attempt, bool) or not isinstance(committed_attempt, int) or committed_attempt < 1:
        raise ValueError(
            f"Dataset {dataset_id} has invalid committed attempt_number: {committed_attempt} "
            f"(type: {type(committed_attempt).__name__})"
        )

    if not committed_lease or not isinstance(committed_lease, str):
        raise ValueError(f"Dataset {dataset_id} has missing or invalid committed_lease_id: {committed_lease}")

    return _read_mongodb_raw_dataset_internal(
        spark=spark,
        dataset_id=dataset_id,
        attempt_number=committed_attempt,
        lease_id=committed_lease,
        mongo_uri=mongo_uri,
        database=database,
        collection="raw_records",
    )


def _read_mongodb_raw_dataset_internal(
    spark: SparkSession,
    dataset_id: int,
    attempt_number: int,
    lease_id: str,
    mongo_uri: str = "mongodb://127.0.0.1:27017",
    database: str = "govpulse_db",
    collection: str = "raw_records",
) -> DataFrame:
    """Internal reader executing Spark MongoDB Connector load with attempt-isolated fencing filters."""
    safe_uri = mongo_uri.split("@")[-1] if "@" in mongo_uri else mongo_uri
    logger.info(
        "Reading MongoDB raw records: db=%s, coll=%s, dataset_id=%s, attempt=%s, host=%s",
        database,
        collection,
        dataset_id,
        attempt_number,
        safe_uri,
    )

    pipeline_expr = f'[{{"$match": {{"dataset_id": {dataset_id}, "attempt_number": {attempt_number}, "lease_id": "{lease_id}"}}}}]'
    df = (
        spark.read.format("mongodb")
        .option("connection.uri", mongo_uri)
        .option("database", database)
        .option("collection", collection)
        .option("aggregation.pipeline", pipeline_expr)
        .load()
    )

    filtered_df = df.filter(
        (F.col("dataset_id") == dataset_id) &
        (F.col("attempt_number") == attempt_number) &
        (F.col("lease_id") == lease_id)
    )

    return filtered_df


# Backward-compatible alias
read_mongodb_raw_dataset = _read_mongodb_raw_dataset_internal



# ---------------------------------------------------------------------------
# Column mapping
# ---------------------------------------------------------------------------

def apply_column_mapping(df: DataFrame, mapping: dict) -> DataFrame:
    """
    Rename columns according to a user-supplied mapping dict.
    Supports both orientations:
        { "original_col_name": "canonical_col_name" }
        or { "canonical_col_name": "original_col_name" }
    Matches case-insensitively using normalised column names.
    """
    if not mapping:
        return df

    # First, build a lookup of normalised current column names in df -> actual df column name
    df_col_map = {_normalise_col_name(c): c for c in df.columns}

    # Standardize mapping to { original_col: canonical_col }
    standardized = {}
    known_canonicals = {
        "state", "district", "financial_year", "month",
        "persondays_central_liability", "person_days_generated", "person_days_target",
        "expenditure_lakh", "wages_lakh", "material_lakh", "admin_expenditure_lakh", "total_budget_lakh",
        "households_registered", "households_employed", "individuals_worked",
        "completed_works", "ongoing_works", "total_works_takenup",
        "women_persondays", "sc_persondays", "st_persondays", "active_job_cards",
        "houses_target", "houses_sanctioned", "houses_completed", "houses_in_progress", "expenditure_cr",
        "sanctions_geotagged", "sanctions_verified_accounts",
        "installment_1", "installment_2", "installment_3", "installment_4",
        "completed_verified", "completed_houses",
        "beneficiaries_identified", "cards_issued", "hospitalisations", "claims_submitted", "claims_settled",
        "total_schools", "total_students", "total_teachers", "gross_enrolment_ratio", "net_enrolment_ratio",
    }

    for k, v in mapping.items():
        if not k or not v:
            continue
        # Case A: k is canonical indicator, v is original dataset column
        if k in known_canonicals and v not in known_canonicals:
            orig = v
            canon = k
        # Case B: v is canonical indicator, k is original dataset column
        elif v in known_canonicals:
            orig = k
            canon = v
        else:
            # Fallback assumption: k is original, v is target
            orig = k
            canon = v

        norm_orig = _normalise_col_name(orig)
        if norm_orig in df_col_map:
            actual_col_in_df = df_col_map[norm_orig]
            if actual_col_in_df != canon:
                df = df.withColumnRenamed(actual_col_in_df, canon)
                # Update df_col_map in case subsequent mappings refer to it
                del df_col_map[norm_orig]
                df_col_map[_normalise_col_name(canon)] = canon

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
