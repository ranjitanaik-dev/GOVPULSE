"""
GovPulse — UDISE+ Analysis Module
------------------------------------
Unified District Information System for Education

Expected columns:
  state, district, reporting_year,
  total_schools, total_students, total_teachers,
  gross_enrolment_ratio, net_enrolment_ratio
"""

import logging
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from spark_jobs.analytics.common_analytics import save_parquet, register_temp_view, state_summary

logger = logging.getLogger(__name__)
SCHEME_ID = "udise"

NUMERIC_COLS = [
    "total_schools", "total_students", "total_teachers",
    "gross_enrolment_ratio", "net_enrolment_ratio",
]

DEFAULT_COLUMN_MAPPING = {
    "state_name": "state",
    "district_name": "district",
    "no_of_schools": "total_schools",
    "total_enrolment": "total_students",
    "no_of_teachers": "total_teachers",
    "ger": "gross_enrolment_ratio",
    "ner": "net_enrolment_ratio",
}


def run_udise_analysis(spark: SparkSession, df: DataFrame, dataset_id: int, reporting_year: str) -> dict:
    from spark_jobs.preprocessing import cast_numeric_columns, standardise_states, standardise_districts

    present_cols = set(df.columns)
    df = cast_numeric_columns(df, [c for c in NUMERIC_COLS if c in present_cols])
    df = standardise_states(df, "state")
    if "district" in present_cols:
        df = standardise_districts(df, "district")
    df = df.withColumn("reporting_year", F.lit(reporting_year))

    save_parquet(df, SCHEME_ID, f"clean_dataset_{dataset_id}")
    register_temp_view(df, "udise")

    results = {}

    agg_exprs = [F.count("*").alias("total_records"), F.countDistinct("state").alias("states_covered")]
    for col in NUMERIC_COLS:
        if col in present_cols:
            agg_exprs.append(F.sum(col).alias(f"total_{col}"))

    summary = df.agg(*agg_exprs).collect()[0].asDict()

    students = summary.get("total_total_students")
    teachers = summary.get("total_total_teachers")
    summary["pupil_teacher_ratio"] = round(students / teachers, 2) if students and teachers and teachers > 0 else None
    results["summary"] = summary

    if "total_students" in present_cols:
        state_df = state_summary(spark, "udise", "total_students")
        save_parquet(state_df, SCHEME_ID, f"state_performance_{dataset_id}")
        results["state_performance"] = state_df.toPandas().to_dict(orient="records")

    # Pupil-teacher ratio by state
    if "total_students" in present_cols and "total_teachers" in present_cols:
        ptr_df = spark.sql("""
            SELECT state,
                   SUM(total_students) AS students,
                   SUM(total_teachers) AS teachers,
                   CASE WHEN SUM(total_teachers) > 0
                        THEN ROUND(SUM(total_students)/SUM(total_teachers), 2)
                        ELSE NULL END AS pupil_teacher_ratio
            FROM udise
            WHERE state IS NOT NULL
            GROUP BY state
            ORDER BY pupil_teacher_ratio ASC
        """)
        save_parquet(ptr_df, SCHEME_ID, f"ptr_by_state_{dataset_id}")
        results["ptr_by_state"] = ptr_df.toPandas().to_dict(orient="records")

    return results
