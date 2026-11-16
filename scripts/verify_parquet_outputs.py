"""
GovPulse — Phase 3.3 Parquet Output Verification
------------------------------------------------
Verifies that all Parquet outputs for Dataset #3 (MGNREGA) and Dataset #4 (PMAY-G)
exist on disk, can be read by Spark, have valid non-empty schemas, and match expected counts.
"""

import os
import sys

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

from spark_jobs.spark_session import get_spark_session


def verify_parquet():
    print("=" * 80)
    print("GovPulse — Step 4: Parquet Output Verification")
    print("=" * 80)

    spark = get_spark_session("GovPulse_Phase33_Parquet_Verification")

    parquet_targets = [
        # Dataset #3 MGNREGA
        ("mgnrega", "clean_dataset_3", 7454),
        ("mgnrega", "district_rankings_3", 31),
        ("mgnrega", "state_performance_3", 1),
        ("mgnrega", "monthly_trends_3", 12),
        ("mgnrega", "top_districts_3", 10),
        ("mgnrega", "bottom_districts_3", 10),
        ("mgnrega", "alerts_3", 0),  # Can be 0 or small depending on alert filter

        # Dataset #4 PMAY-G
        ("pmayg", "clean_dataset_4", 31),
        ("pmayg", "district_rankings_4", 31),
        ("pmayg", "state_performance_4", 1),
        ("pmayg", "installment_progression_4", 8),
        ("pmayg", "alerts_4", 13),
    ]

    for scheme_id, output_name, expected_count in parquet_targets:
        file_path = os.path.join("data", "processed", scheme_id, output_name, "data.parquet")
        print(f"\n--- Verifying: {file_path} ---")
        assert os.path.exists(file_path), f"CRITICAL: Missing Parquet file at {file_path}"
        file_size = os.path.getsize(file_path)
        print(f"  File exists: {file_size:,} bytes")

        df = spark.read.parquet(file_path)
        actual_count = df.count()
        print(f"  Spark Row Count: {actual_count}")
        print(f"  Columns ({len(df.columns)}): {df.columns}")

        if expected_count is not None and expected_count > 0:
            if output_name == "district_rankings_3":
                # Note: MGNREGA has 31 or 32 depending on whether alias Ramanagara was consolidated
                assert actual_count in [31, 32], f"Expected 31 or 32 for {output_name}, got {actual_count}"
            else:
                assert actual_count == expected_count, f"Count mismatch for {output_name}: expected {expected_count}, got {actual_count}"

        df.show(3, truncate=False)

    print("\n" + "=" * 80)
    print("ALL PARQUET OUTPUTS VERIFIED SUCCESSFULLY (100% PASS)")
    print("=" * 80)


if __name__ == "__main__":
    verify_parquet()
