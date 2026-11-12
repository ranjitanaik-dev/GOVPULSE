"""
GovPulse — Common Analytics
-----------------------------
Shared Spark SQL analytics functions used across all scheme modules.
"""

import os
import logging
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F

logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PROCESSED_DIR = os.path.join(PROJECT_ROOT, "data", "processed")


def save_parquet(df: DataFrame, scheme_id: str, table_name: str, mode: str = "overwrite") -> str:
    """Write a Spark DataFrame to Parquet under data/processed/<scheme>/<table>."""
    out_path = os.path.join(PROCESSED_DIR, scheme_id, table_name)
    os.makedirs(out_path, exist_ok=True)
    try:
        df.write.mode(mode).parquet(out_path)
        logger.info(f"Saved Parquet via native Spark: {out_path}")
    except Exception as e:
        logger.warning(
            f"Native Spark parquet write unavailable ({e}). Using PyArrow parquet writer for Windows compatibility..."
        )
        parquet_file = os.path.join(out_path, "data.parquet")
        pdf = df.toPandas()
        pdf.to_parquet(parquet_file, index=False)
        logger.info(f"Saved Parquet via PyArrow: {parquet_file} ({len(pdf)} rows)")
    return out_path


def load_parquet(spark: SparkSession, scheme_id: str, table_name: str) -> DataFrame:
    """Load a processed Parquet table."""
    path = os.path.join(PROCESSED_DIR, scheme_id, table_name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Processed data not found: {path}")
    parquet_file = os.path.join(path, "data.parquet")
    if os.path.exists(parquet_file):
        return spark.read.parquet(parquet_file)
    return spark.read.parquet(path)


def register_temp_view(df: DataFrame, view_name: str):
    """Register a Spark DataFrame as a temp SQL view."""
    df.createOrReplaceTempView(view_name)
    logger.debug(f"Registered temp view: {view_name}")


def state_summary(spark: SparkSession, view_name: str, value_col: str, target_col: str = None) -> DataFrame:
    """
    Generic state-level summary with optional achievement %.
    Uses SUM(numerator)/SUM(denominator) to avoid averaging percentages.
    """
    if target_col:
        sql = f"""
            SELECT
                state,
                SUM({value_col}) AS total_value,
                SUM({target_col}) AS total_target,
                CASE
                    WHEN SUM({target_col}) > 0
                    THEN ROUND(SUM({value_col}) / SUM({target_col}) * 100, 2)
                    ELSE NULL
                END AS achievement_pct
            FROM {view_name}
            WHERE state IS NOT NULL AND state != 'Unknown'
            GROUP BY state
            ORDER BY achievement_pct DESC NULLS LAST
        """
    else:
        sql = f"""
            SELECT state, SUM({value_col}) AS total_value
            FROM {view_name}
            WHERE state IS NOT NULL AND state != 'Unknown'
            GROUP BY state
            ORDER BY total_value DESC
        """
    return spark.sql(sql)


def district_rankings(
    spark: SparkSession,
    view_name: str,
    value_col: str,
    target_col: str,
    top_n: int = 10,
) -> dict:
    """Return top N and bottom N districts by achievement %."""
    sql = f"""
        SELECT
            state,
            district,
            SUM({value_col}) AS total_value,
            SUM({target_col}) AS total_target,
            CASE
                WHEN SUM({target_col}) > 0
                THEN ROUND(SUM({value_col}) / SUM({target_col}) * 100, 2)
                ELSE NULL
            END AS achievement_pct
        FROM {view_name}
        WHERE district IS NOT NULL AND district != 'Unknown'
          AND {target_col} IS NOT NULL AND {target_col} > 0
        GROUP BY state, district
    """
    ranked = spark.sql(sql)
    ranked.createOrReplaceTempView("_ranked_tmp")

    top = spark.sql(
        f"SELECT * FROM _ranked_tmp ORDER BY achievement_pct DESC NULLS LAST LIMIT {top_n}"
    ).toPandas().to_dict(orient="records")

    bottom = spark.sql(
        f"SELECT * FROM _ranked_tmp ORDER BY achievement_pct ASC NULLS LAST LIMIT {top_n}"
    ).toPandas().to_dict(orient="records")

    return {"top": top, "bottom": bottom}


def trend_analysis(
    spark: SparkSession,
    scheme_id: str,
    table_name: str,
    value_col: str,
) -> list[dict]:
    """Year-wise trend of a given value column."""
    df = load_parquet(spark, scheme_id, table_name)
    df.createOrReplaceTempView("_trend_tmp")
    result = spark.sql(f"""
        SELECT
            reporting_year,
            SUM({value_col}) AS total_value
        FROM _trend_tmp
        WHERE reporting_year IS NOT NULL
        GROUP BY reporting_year
        ORDER BY reporting_year
    """)
    return result.toPandas().to_dict(orient="records")


def underperformance_alerts(
    spark: SparkSession,
    view_name: str,
    value_col: str,
    target_col: str,
    threshold_low: float = 50.0,
    threshold_medium: float = 80.0,
) -> DataFrame:
    """Flag districts by achievement band."""
    sql = f"""
        SELECT
            state,
            district,
            SUM({value_col}) AS total_value,
            SUM({target_col}) AS total_target,
            CASE
                WHEN SUM({target_col}) > 0
                THEN ROUND(SUM({value_col}) / SUM({target_col}) * 100, 2)
                ELSE NULL
            END AS achievement_pct,
            CASE
                WHEN SUM({target_col}) <= 0 OR SUM({target_col}) IS NULL THEN 'No Target Data'
                WHEN SUM({value_col}) / SUM({target_col}) * 100 >= {threshold_medium} THEN 'On Track'
                WHEN SUM({value_col}) / SUM({target_col}) * 100 >= {threshold_low} THEN 'Needs Attention'
                ELSE 'Low Achievement'
            END AS performance_band
        FROM {view_name}
        WHERE district IS NOT NULL AND district != 'Unknown'
          AND {target_col} IS NOT NULL AND {target_col} > 0
        GROUP BY state, district
        ORDER BY achievement_pct ASC NULLS LAST
    """
    return spark.sql(sql)
