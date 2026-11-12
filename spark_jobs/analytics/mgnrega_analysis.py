"""
GovPulse — MGNREGA Analysis Module
--------------------------------------
Spark SQL analytics for Mahatma Gandhi National Rural Employment Guarantee Act.

Expected columns (after preprocessing):
  state, district, reporting_year,
  households_registered, households_employed, person_days_generated,
  person_days_target, expenditure_lakh, total_budget_lakh
"""

import logging
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F

from spark_jobs.analytics.common_analytics import (
    save_parquet, load_parquet, register_temp_view,
    state_summary, district_rankings, underperformance_alerts
)

logger = logging.getLogger(__name__)

SCHEME_ID = "mgnrega"

NUMERIC_COLS = [
    "households_registered",
    "households_employed",
    "person_days_generated",
    "person_days_target",
    "expenditure_lakh",
    "total_budget_lakh",
]

# Default column mapping: maps common alternate column names → canonical names
DEFAULT_COLUMN_MAPPING = {
    # state variations
    "state_name": "state",
    "statename": "state",
    "state_ut": "state",
    # district variations
    "district_name": "district",
    "districtname": "district",
    # employment
    "no_of_households_demanded_employment": "households_registered",
    "households_demanded": "households_registered",
    "no_of_households_offered_employment": "households_employed",
    "households_provided_employment": "households_employed",
    # person days
    "total_person_days_generated": "person_days_generated",
    "persondays_generated": "person_days_generated",
    "total_person_days_in_lakh": "person_days_generated",
    "persondays_target": "person_days_target",
    "person_days_offered_as_of_date": "person_days_generated",
    # expenditure
    "total_expenditure": "expenditure_lakh",
    "expenditure_incurred_lakh": "expenditure_lakh",
    "total_exp_lakh": "expenditure_lakh",
    "approved_labour_budget": "person_days_target",
}


def run_mgnrega_analysis(spark: SparkSession, df: DataFrame, dataset_id: int, reporting_year: str) -> dict:
    """
    Full MGNREGA analytics pipeline.
    1. Cast numeric columns
    2. Register temp view
    3. Run Spark SQL queries
    4. Save to Parquet
    5. Return summary dict
    """
    from spark_jobs.preprocessing import cast_numeric_columns, standardise_states, standardise_districts

    present_cols = set(df.columns)
    cols_to_cast = [c for c in NUMERIC_COLS if c in present_cols]

    df = cast_numeric_columns(df, cols_to_cast)
    df = standardise_states(df, "state")
    df = standardise_districts(df, "district")
    df = df.withColumn("reporting_year", F.lit(reporting_year))

    # Save cleaned data
    save_parquet(df, SCHEME_ID, f"clean_dataset_{dataset_id}")

    # Register SQL view
    register_temp_view(df, "mgnrega")

    results = {}

    # --- 1. Overall summary
    summary_cols = [
        F.sum("households_registered").alias("total_hh_registered") if "households_registered" in present_cols else F.lit(None).alias("total_hh_registered"),
        F.sum("households_employed").alias("total_hh_employed") if "households_employed" in present_cols else F.lit(None).alias("total_hh_employed"),
        F.sum("person_days_generated").alias("total_person_days") if "person_days_generated" in present_cols else F.lit(None).alias("total_person_days"),
        F.sum("person_days_target").alias("total_person_days_target") if "person_days_target" in present_cols else F.lit(None).alias("total_person_days_target"),
        F.sum("expenditure_lakh").alias("total_expenditure_lakh") if "expenditure_lakh" in present_cols else F.lit(None).alias("total_expenditure_lakh"),
        F.sum("total_budget_lakh").alias("total_budget_lakh") if "total_budget_lakh" in present_cols else F.lit(None).alias("total_budget_lakh"),
        F.countDistinct("state").alias("states_covered"),
        F.countDistinct("district").alias("districts_covered"),
        F.count("*").alias("total_records"),
    ]
    summary = df.agg(*summary_cols).collect()[0]
    summary_dict = summary.asDict()

    # Compute ratios safely
    pd_gen = summary_dict.get("total_person_days")
    pd_target = summary_dict.get("total_person_days_target")
    exp = summary_dict.get("total_expenditure_lakh")
    budget = summary_dict.get("total_budget_lakh")

    summary_dict["employment_achievement_pct"] = (
        round(pd_gen / pd_target * 100, 2) if pd_gen and pd_target and pd_target > 0 else None
    )
    summary_dict["budget_utilisation_pct"] = (
        round(exp / budget * 100, 2) if exp and budget and budget > 0 else None
    )
    results["summary"] = summary_dict

    # --- 2. State-wise performance
    if "person_days_generated" in present_cols and "person_days_target" in present_cols:
        state_df = state_summary(spark, "mgnrega", "person_days_generated", "person_days_target")
        save_parquet(state_df, SCHEME_ID, f"state_performance_{dataset_id}")
        results["state_performance"] = state_df.toPandas().to_dict(orient="records")
    elif "households_employed" in present_cols:
        state_df = state_summary(spark, "mgnrega", "households_employed")
        save_parquet(state_df, SCHEME_ID, f"state_performance_{dataset_id}")
        results["state_performance"] = state_df.toPandas().to_dict(orient="records")

    # --- 3. District rankings (if person_days available)
    if "person_days_generated" in present_cols and "person_days_target" in present_cols:
        rankings = district_rankings(spark, "mgnrega", "person_days_generated", "person_days_target")
        results["district_rankings"] = rankings

        # Save rankings
        import pandas as pd
        top_df = spark.createDataFrame(pd.DataFrame(rankings.get("top", []))) if rankings.get("top") else None
        bottom_df = spark.createDataFrame(pd.DataFrame(rankings.get("bottom", []))) if rankings.get("bottom") else None
        if top_df:
            save_parquet(top_df, SCHEME_ID, f"top_districts_{dataset_id}")
        if bottom_df:
            save_parquet(bottom_df, SCHEME_ID, f"bottom_districts_{dataset_id}")

    # --- 4. Expenditure analysis
    if "expenditure_lakh" in present_cols and "total_budget_lakh" in present_cols:
        exp_df = spark.sql("""
            SELECT
                state,
                SUM(expenditure_lakh) AS total_expenditure,
                SUM(total_budget_lakh) AS total_budget,
                CASE
                    WHEN SUM(total_budget_lakh) > 0
                    THEN ROUND(SUM(expenditure_lakh) / SUM(total_budget_lakh) * 100, 2)
                    ELSE NULL
                END AS budget_utilisation_pct
            FROM mgnrega
            WHERE state IS NOT NULL
            GROUP BY state
            ORDER BY budget_utilisation_pct DESC NULLS LAST
        """)
        save_parquet(exp_df, SCHEME_ID, f"expenditure_{dataset_id}")
        results["expenditure_by_state"] = exp_df.toPandas().to_dict(orient="records")

    # --- 5. Alerts
    if "person_days_generated" in present_cols and "person_days_target" in present_cols and "district" in present_cols:
        alerts_df = underperformance_alerts(spark, "mgnrega", "person_days_generated", "person_days_target")
        save_parquet(alerts_df, SCHEME_ID, f"alerts_{dataset_id}")
        results["alerts_count"] = alerts_df.filter(F.col("performance_band") != "On Track").count()

    # --- 6. Show Spark execution plan for one query (Big Data demonstration)
    logger.info("=== SPARK EXECUTION PLAN (MGNREGA State Summary) ===")
    df.groupBy("state").agg(F.sum("person_days_generated") if "person_days_generated" in present_cols else F.count("*")).explain(extended=False)

    return results
