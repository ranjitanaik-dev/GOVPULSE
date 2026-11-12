"""
GovPulse — PMAY-G Analysis Module
------------------------------------
Pradhan Mantri Awaas Yojana - Gramin (Rural Housing)

Expected columns (after preprocessing):
  state, district, reporting_year,
  houses_target, houses_sanctioned, houses_completed,
  houses_in_progress, expenditure_cr
"""

import logging
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F

from spark_jobs.analytics.common_analytics import (
    save_parquet, register_temp_view, state_summary,
    district_rankings, underperformance_alerts
)

logger = logging.getLogger(__name__)
SCHEME_ID = "pmayg"

NUMERIC_COLS = [
    "houses_target", "houses_sanctioned", "houses_completed",
    "houses_in_progress", "expenditure_cr",
]

DEFAULT_COLUMN_MAPPING = {
    "state_name": "state",
    "district_name": "district",
    "target": "houses_target",
    "no_of_houses_targeted": "houses_target",
    "sanctioned": "houses_sanctioned",
    "houses_grounded": "houses_in_progress",
    "completed": "houses_completed",
    "houses_grounded_for_construction": "houses_in_progress",
    "total_expenditure_cr": "expenditure_cr",
}


def run_pmayg_analysis(spark: SparkSession, df: DataFrame, dataset_id: int, reporting_year: str) -> dict:
    from spark_jobs.preprocessing import cast_numeric_columns, standardise_states, standardise_districts

    present_cols = set(df.columns)
    cols_to_cast = [c for c in NUMERIC_COLS if c in present_cols]

    df = cast_numeric_columns(df, cols_to_cast)
    df = standardise_states(df, "state")
    df = standardise_districts(df, "district")
    df = df.withColumn("reporting_year", F.lit(reporting_year))

    save_parquet(df, SCHEME_ID, f"clean_dataset_{dataset_id}")
    register_temp_view(df, "pmayg")

    results = {}

    # Summary
    agg_exprs = [F.count("*").alias("total_records"), F.countDistinct("state").alias("states_covered")]
    if "district" in present_cols:
        agg_exprs.append(F.countDistinct("district").alias("districts_covered"))
    for col in NUMERIC_COLS:
        if col in present_cols:
            agg_exprs.append(F.sum(col).alias(f"total_{col}"))

    summary = df.agg(*agg_exprs).collect()[0].asDict()

    target = summary.get("total_houses_target")
    completed = summary.get("total_houses_completed")
    sanctioned = summary.get("total_houses_sanctioned")

    summary["completion_pct"] = round(completed / target * 100, 2) if completed and target and target > 0 else None
    summary["sanction_pct"] = round(sanctioned / target * 100, 2) if sanctioned and target and target > 0 else None
    results["summary"] = summary

    # State performance
    if "houses_completed" in present_cols and "houses_target" in present_cols:
        state_df = state_summary(spark, "pmayg", "houses_completed", "houses_target")
        save_parquet(state_df, SCHEME_ID, f"state_performance_{dataset_id}")
        results["state_performance"] = state_df.toPandas().to_dict(orient="records")

        # Stage-wise breakdown
        stage_sql = """
            SELECT
                state,
                SUM(houses_target) AS target,
                SUM(houses_sanctioned) AS sanctioned,
                SUM(houses_in_progress) AS in_progress,
                SUM(houses_completed) AS completed,
                CASE WHEN SUM(houses_target) > 0
                     THEN ROUND(SUM(houses_completed)/SUM(houses_target)*100, 2)
                     ELSE NULL END AS completion_pct
            FROM pmayg
            WHERE state IS NOT NULL
            GROUP BY state
            ORDER BY completion_pct DESC NULLS LAST
        """
        # Build dynamically based on available cols
        available = [c for c in ["houses_target", "houses_sanctioned", "houses_in_progress", "houses_completed"] if c in present_cols]
        if len(available) >= 2:
            stage_df = spark.sql(stage_sql) if all(c in present_cols for c in ["houses_target", "houses_sanctioned", "houses_in_progress", "houses_completed"]) else state_df
            results["stage_breakdown"] = stage_df.toPandas().to_dict(orient="records") if hasattr(stage_df, 'toPandas') else []

    # District rankings
    if "houses_completed" in present_cols and "houses_target" in present_cols and "district" in present_cols:
        rankings = district_rankings(spark, "pmayg", "houses_completed", "houses_target")
        results["district_rankings"] = rankings

    # Alerts
    if "houses_completed" in present_cols and "houses_target" in present_cols and "district" in present_cols:
        alerts_df = underperformance_alerts(spark, "pmayg", "houses_completed", "houses_target")
        save_parquet(alerts_df, SCHEME_ID, f"alerts_{dataset_id}")
        results["alerts_count"] = alerts_df.filter(F.col("performance_band") != "On Track").count()

    logger.info("=== SPARK EXECUTION PLAN (PMAY-G State Summary) ===")
    df.groupBy("state").agg(F.count("*")).explain(extended=False)

    return results
