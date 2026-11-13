"""
GovPulse — Main Pipeline Runner
---------------------------------
Entry point for running a Spark processing job for a dataset.
Called by the FastAPI backend as a subprocess.

Usage:
    python run_pipeline.py --dataset_id 1 --file_path /path/to/file.csv
                           --scheme_id mgnrega --reporting_year 2023-24
                           --column_mapping '{"state_name":"state"}'
"""

import sys
import os
import json
import argparse
import logging
import time
import traceback

# Ensure spark_jobs is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from spark_jobs.spark_session import get_spark_session, stop_spark_session
from spark_jobs.ingestion import read_dataset, apply_column_mapping, detect_columns
from spark_jobs.preprocessing import (
    remove_duplicates, add_processing_metadata, split_valid_invalid
)
from spark_jobs.data_validation import validate_dataset, get_scheme_config
from spark_jobs.analytics.mgnrega_analysis import run_mgnrega_analysis, DEFAULT_COLUMN_MAPPING as MGNREGA_MAP
from spark_jobs.analytics.pmay_analysis import run_pmayg_analysis, DEFAULT_COLUMN_MAPPING as PMAYG_MAP
from spark_jobs.analytics.pmjay_analysis import run_pmjay_analysis, DEFAULT_COLUMN_MAPPING as PMJAY_MAP
from spark_jobs.analytics.udise_analysis import run_udise_analysis, DEFAULT_COLUMN_MAPPING as UDISE_MAP

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("govpulse.pipeline")

SCHEME_RUNNERS = {
    "mgnrega": (run_mgnrega_analysis, MGNREGA_MAP),
    "pmayg": (run_pmayg_analysis, PMAYG_MAP),
    "pmjay": (run_pmjay_analysis, PMJAY_MAP),
    "udise": (run_udise_analysis, UDISE_MAP),
}

OUTPUT_FILE = None  # Set via --output_file argument


def run_pipeline(dataset_id: int, file_path: str, scheme_id: str, reporting_year: str,
                 column_mapping: dict = None, output_file: str = None):
    start_time = time.time()
    result = {
        "status": "started",
        "dataset_id": dataset_id,
        "scheme_id": scheme_id,
        "reporting_year": reporting_year,
        "file_path": file_path,
    }

    spark = None
    try:
        logger.info(f"=== GovPulse Pipeline Start: dataset_id={dataset_id}, scheme={scheme_id} ===")
        spark = get_spark_session(f"GovPulse-{scheme_id}-{dataset_id}")

        # 1. Read data
        logger.info("Step 1: Reading dataset...")
        df = read_dataset(spark, file_path, scheme_id)
        raw_count = df.count()
        logger.info(f"  Raw records: {raw_count:,}")
        logger.info(f"  Columns: {df.columns}")

        # 2. Apply column mapping
        logger.info("Step 2: Applying column mapping...")
        scheme_runner, default_map = SCHEME_RUNNERS.get(scheme_id, (None, {}))
        # User explicit mapping overrides default mapping
        combined_map = {**default_map, **(column_mapping or {})}
        df = apply_column_mapping(df, combined_map)
        logger.info(f"  Columns after mapping: {df.columns}")

        # 3. Validate
        logger.info("Step 3: Validating dataset against scheme requirements...")
        validation = validate_dataset(df, scheme_id)
        logger.info(f"  Validation: valid={validation.is_valid}, errors={validation.errors}")
        result["validation"] = validation.to_dict()

        if not validation.is_valid:
            error_details = "; ".join(validation.errors)
            logger.error(f"Dataset validation FAILED: {error_details}")
            raise ValueError(f"Dataset validation failed: {error_details}. Please map all required columns before processing.")

        # 4. Remove duplicates
        logger.info("Step 4: Deduplicating...")
        config = get_scheme_config(scheme_id)
        dedup_keys = config.get("dedup_keys", ["state"])
        df, dup_count = remove_duplicates(df, dedup_keys)
        result["duplicates_removed"] = dup_count

        # 5. Add metadata
        df = add_processing_metadata(df, dataset_id, reporting_year)

        # 6. Run scheme analysis
        if scheme_runner:
            logger.info(f"Step 5: Running {scheme_id.upper()} analytics...")
            analytics = scheme_runner(spark, df, dataset_id, reporting_year)
            result["analytics"] = analytics
        else:
            logger.warning(f"No runner found for scheme '{scheme_id}'")
            result["analytics"] = {}

        elapsed = time.time() - start_time
        result.update({
            "status": "completed",
            "raw_records": raw_count,
            "valid_records": validation.valid_records,
            "invalid_records": validation.invalid_records,
            "duplicates_removed": dup_count,
            "processing_time_seconds": round(elapsed, 2),
        })
        logger.info(f"=== Pipeline Completed in {elapsed:.1f}s ===")

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Pipeline FAILED: {e}")
        logger.error(traceback.format_exc())
        result.update({
            "status": "failed",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "processing_time_seconds": round(elapsed, 2),
        })

    finally:
        if spark:
            stop_spark_session()

    # Write output JSON for FastAPI to pick up
    if output_file:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, default=str)
        logger.info(f"Results written to: {output_file}")

    return result


def main():
    parser = argparse.ArgumentParser(description="GovPulse Spark Pipeline Runner")
    parser.add_argument("--dataset_id", type=int, required=True)
    parser.add_argument("--file_path", type=str, required=True)
    parser.add_argument("--scheme_id", type=str, required=True)
    parser.add_argument("--reporting_year", type=str, required=True)
    parser.add_argument("--column_mapping", type=str, default="{}")
    parser.add_argument("--output_file", type=str, default=None)
    args = parser.parse_args()

    col_map = json.loads(args.column_mapping)
    result = run_pipeline(
        dataset_id=args.dataset_id,
        file_path=args.file_path,
        scheme_id=args.scheme_id,
        reporting_year=args.reporting_year,
        column_mapping=col_map,
        output_file=args.output_file,
    )

    print(json.dumps(result, indent=2, default=str))
    sys.exit(0 if result["status"] == "completed" else 1)


if __name__ == "__main__":
    main()
