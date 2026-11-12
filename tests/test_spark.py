"""
GovPulse — Spark Pipeline Tests
=================================
Tests use synthetic fixtures ONLY. These are NOT real government datasets.
Run with: pytest tests/test_spark.py -v

Requires PySpark to be installed.
"""

import os
import sys
import pytest
import tempfile
import shutil

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

FIXTURE_MGNREGA = os.path.join(PROJECT_ROOT, "tests", "fixtures", "sample_mgnrega.csv")
FIXTURE_PMAYG = os.path.join(PROJECT_ROOT, "tests", "fixtures", "sample_pmayg.csv")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def spark():
    """Create a Spark session for the test module."""
    from spark_jobs.spark_session import get_spark_session, stop_spark_session
    spark = get_spark_session("GovPulse-Test")
    yield spark
    stop_spark_session()


@pytest.fixture(scope="module")
def temp_data_dir(tmp_path_factory):
    d = tmp_path_factory.mktemp("data")
    (d / "processed").mkdir()
    (d / "raw").mkdir()
    (d / "quarantine").mkdir()
    return d


# ---------------------------------------------------------------------------
# 1. Spark session tests
# ---------------------------------------------------------------------------

class TestSparkSession:
    def test_spark_session_created(self, spark):
        assert spark is not None
        assert spark.version is not None

    def test_spark_context_active(self, spark):
        assert not spark.sparkContext._jsc.sc().isStopped()

    def test_local_mode(self, spark):
        master = spark.sparkContext.master
        assert "local" in master


# ---------------------------------------------------------------------------
# 2. CSV loading tests
# ---------------------------------------------------------------------------

class TestCSVLoading:
    def test_read_mgnrega_fixture(self, spark):
        from spark_jobs.ingestion import read_dataset
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        assert df is not None
        assert df.count() > 0

    def test_column_normalisation(self, spark):
        from spark_jobs.ingestion import read_dataset
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        # All column names should be lowercase with underscores
        for col in df.columns:
            assert col == col.lower()
            assert " " not in col

    def test_scheme_id_column_added(self, spark):
        from spark_jobs.ingestion import read_dataset
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        assert "scheme_id" in df.columns

    def test_source_file_column_added(self, spark):
        from spark_jobs.ingestion import read_dataset
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        assert "source_file" in df.columns

    def test_pmayg_fixture_loads(self, spark):
        from spark_jobs.ingestion import read_dataset
        df = read_dataset(spark, FIXTURE_PMAYG, "pmayg")
        assert df.count() >= 10


# ---------------------------------------------------------------------------
# 3. Missing value handling
# ---------------------------------------------------------------------------

class TestMissingValues:
    def test_null_handling_no_crash(self, spark):
        """Creating a DF with nulls and running preprocessing should not crash."""
        from spark_jobs.preprocessing import cast_numeric_columns
        data = [("Rajasthan", "Jaipur", "2023-24", None, "5000000", None),
                ("Bihar", "Patna", "2023-24", "100000", None, "44000")]
        df = spark.createDataFrame(data, ["state", "district", "reporting_year",
                                          "households_registered", "person_days_generated",
                                          "total_budget_lakh"])
        df = cast_numeric_columns(df, ["households_registered", "person_days_generated", "total_budget_lakh"])
        assert df.count() == 2

    def test_non_numeric_strings_become_null(self, spark):
        from spark_jobs.preprocessing import cast_numeric_columns
        data = [("State A", "District X", "N/A", "not_a_number")]
        df = spark.createDataFrame(data, ["state", "district", "reporting_year", "value"])
        df = cast_numeric_columns(df, ["value"])
        row = df.first()
        assert row["value"] is None


# ---------------------------------------------------------------------------
# 4. Deduplication
# ---------------------------------------------------------------------------

class TestDeduplication:
    def test_duplicates_removed(self, spark):
        from spark_jobs.preprocessing import remove_duplicates
        data = [("Rajasthan", "Jaipur", "2023-24", 5000000.0)] * 3 + \
               [("Bihar", "Patna", "2023-24", 6800000.0)]
        df = spark.createDataFrame(data, ["state", "district", "reporting_year", "person_days_generated"])
        deduped, count = remove_duplicates(df, ["state", "district", "reporting_year"])
        assert deduped.count() == 2
        assert count == 2


# ---------------------------------------------------------------------------
# 5. Data validation
# ---------------------------------------------------------------------------

class TestDataValidation:
    def test_validation_mgnrega_fixture(self, spark):
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.data_validation import validate_dataset
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        result = validate_dataset(df, "mgnrega")
        assert result.total_records > 0
        assert result.valid_records >= 0

    def test_missing_required_col_detected(self, spark):
        from spark_jobs.data_validation import validate_dataset
        # DF without 'state' column
        data = [("Jaipur", "2023-24")]
        df = spark.createDataFrame(data, ["district", "reporting_year"])
        result = validate_dataset(df, "mgnrega")
        assert "state" in result.missing_required_cols

    def test_validation_result_serialisable(self, spark):
        import json
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.data_validation import validate_dataset
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        result = validate_dataset(df, "mgnrega")
        d = result.to_dict()
        json.dumps(d)  # Should not raise


# ---------------------------------------------------------------------------
# 6. Spark SQL aggregation
# ---------------------------------------------------------------------------

class TestSparkSQL:
    def test_state_aggregation(self, spark):
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.preprocessing import cast_numeric_columns
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        df = cast_numeric_columns(df, ["person_days_generated", "person_days_target"])
        df.createOrReplaceTempView("test_mgnrega")
        result = spark.sql("""
            SELECT state, SUM(person_days_generated) AS total_pd
            FROM test_mgnrega
            WHERE state IS NOT NULL
            GROUP BY state
            ORDER BY total_pd DESC
        """)
        assert result.count() > 0

    def test_achievement_pct_calculation(self, spark):
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.preprocessing import cast_numeric_columns
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        df = cast_numeric_columns(df, ["person_days_generated", "person_days_target"])
        df.createOrReplaceTempView("test_achievement")
        result = spark.sql("""
            SELECT
                state,
                CASE
                    WHEN SUM(person_days_target) > 0
                    THEN ROUND(SUM(person_days_generated) / SUM(person_days_target) * 100, 2)
                    ELSE NULL
                END AS achievement_pct
            FROM test_achievement
            WHERE state IS NOT NULL
            GROUP BY state
        """)
        rows = result.collect()
        assert len(rows) > 0
        for row in rows:
            if row.achievement_pct is not None:
                # Achievement should be a reasonable percentage (not division error)
                assert row.achievement_pct >= 0

    def test_no_division_by_zero(self, spark):
        from pyspark.sql import functions as F
        # Create a DF with zero target
        data = [("StateX", "DistrictY", 0.0, 500000.0)]
        df = spark.createDataFrame(data, ["state", "district", "person_days_target", "person_days_generated"])
        df.createOrReplaceTempView("test_zero_div")
        result = spark.sql("""
            SELECT
                CASE WHEN SUM(person_days_target) > 0
                     THEN SUM(person_days_generated) / SUM(person_days_target) * 100
                     ELSE NULL
                END AS achievement_pct
            FROM test_zero_div
        """)
        row = result.first()
        # Should be NULL, not an error or infinity
        assert row.achievement_pct is None


# ---------------------------------------------------------------------------
# 7. MGNREGA analysis
# ---------------------------------------------------------------------------

class TestMGNREGAAnalysis:
    def test_mgnrega_pipeline_runs(self, spark):
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.analytics.mgnrega_analysis import run_mgnrega_analysis
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        result = run_mgnrega_analysis(spark, df, dataset_id=9999, reporting_year="2023-24")
        assert "summary" in result
        assert isinstance(result["summary"], dict)

    def test_mgnrega_summary_has_records(self, spark):
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.analytics.mgnrega_analysis import run_mgnrega_analysis
        df = read_dataset(spark, FIXTURE_MGNREGA, "mgnrega")
        result = run_mgnrega_analysis(spark, df, dataset_id=9998, reporting_year="2023-24")
        summary = result["summary"]
        assert summary.get("total_records", 0) > 0
        assert summary.get("states_covered", 0) > 0


# ---------------------------------------------------------------------------
# 8. PMAY-G analysis
# ---------------------------------------------------------------------------

class TestPMAYGAnalysis:
    def test_pmayg_pipeline_runs(self, spark):
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.analytics.pmay_analysis import run_pmayg_analysis
        df = read_dataset(spark, FIXTURE_PMAYG, "pmayg")
        result = run_pmayg_analysis(spark, df, dataset_id=9997, reporting_year="2023-24")
        assert "summary" in result

    def test_pmayg_completion_pct_valid(self, spark):
        from spark_jobs.ingestion import read_dataset
        from spark_jobs.analytics.pmay_analysis import run_pmayg_analysis
        df = read_dataset(spark, FIXTURE_PMAYG, "pmayg")
        result = run_pmayg_analysis(spark, df, dataset_id=9996, reporting_year="2023-24")
        pct = result["summary"].get("completion_pct")
        if pct is not None:
            assert 0 <= pct <= 200  # Allow > 100 for overachievement
