"""
GovPulse — PM-JAY Analysis Module
------------------------------------
Pradhan Mantri Jan Arogya Yojana (Health insurance)

Expected columns:
  state, reporting_year,
  beneficiaries_identified, cards_issued, hospitalisations,
  claims_submitted, claims_settled
"""

import logging
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from spark_jobs.analytics.common_analytics import save_parquet, register_temp_view, state_summary

logger = logging.getLogger(__name__)
SCHEME_ID = "pmjay"

NUMERIC_COLS = [
    "beneficiaries_identified", "cards_issued", "hospitalisations",
    "claims_submitted", "claims_settled",
]

DEFAULT_COLUMN_MAPPING = {
    "state_name": "state",
    "no_of_beneficiaries": "beneficiaries_identified",
    "ehealth_cards_issued": "cards_issued",
    "total_hospitalisations": "hospitalisations",
    "claims_raised": "claims_submitted",
    "claims_processed": "claims_settled",
}


def run_pmjay_analysis(spark: SparkSession, df: DataFrame, dataset_id: int, reporting_year: str) -> dict:
    from spark_jobs.preprocessing import cast_numeric_columns, standardise_states

    present_cols = set(df.columns)
    df = cast_numeric_columns(df, [c for c in NUMERIC_COLS if c in present_cols])
    df = standardise_states(df, "state")
    df = df.withColumn("reporting_year", F.lit(reporting_year))

    save_parquet(df, SCHEME_ID, f"clean_dataset_{dataset_id}")
    register_temp_view(df, "pmjay")

    results = {}

    agg_exprs = [F.count("*").alias("total_records"), F.countDistinct("state").alias("states_covered")]
    for col in NUMERIC_COLS:
        if col in present_cols:
            agg_exprs.append(F.sum(col).alias(f"total_{col}"))

    summary = df.agg(*agg_exprs).collect()[0].asDict()

    ben = summary.get("total_beneficiaries_identified")
    cards = summary.get("total_cards_issued")
    hosp = summary.get("total_hospitalisations")
    claims_sub = summary.get("total_claims_submitted")
    claims_set = summary.get("total_claims_settled")

    summary["card_issuance_pct"] = round(cards / ben * 100, 2) if cards and ben and ben > 0 else None
    summary["claims_settlement_pct"] = round(claims_set / claims_sub * 100, 2) if claims_set and claims_sub and claims_sub > 0 else None
    results["summary"] = summary

    if "hospitalisations" in present_cols:
        state_df = state_summary(spark, "pmjay", "hospitalisations")
        save_parquet(state_df, SCHEME_ID, f"state_performance_{dataset_id}")
        results["state_performance"] = state_df.toPandas().to_dict(orient="records")

    return results
