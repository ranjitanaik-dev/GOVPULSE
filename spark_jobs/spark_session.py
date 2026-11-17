"""
GovPulse Spark Session Manager
-------------------------------
Provides a singleton SparkSession configured for local mode.
Suitable for running on Windows without a Hadoop cluster.
"""

import os
from pyspark.sql import SparkSession


def get_spark_session(app_name: str = "GovPulse") -> SparkSession:
    """
    Return (or create) a singleton SparkSession in local mode.

    Configuration:
    - Runs entirely in local[*] mode (uses all available CPU cores).
    - Disables Spark UI by default to avoid port conflicts.
    - Sets a deterministic temp directory inside the project.
    - Suppresses verbose Hadoop warning logs on Windows.
    """
    # Determine project root relative to this file
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    warehouse_dir = os.path.join(project_root, "data", "spark_warehouse")
    temp_dir = os.path.join(project_root, "data", "spark_temp")

    os.makedirs(warehouse_dir, exist_ok=True)
    os.makedirs(temp_dir, exist_ok=True)

    # Suppress noisy Hadoop native library warnings on Windows
    os.environ.setdefault("HADOOP_HOME", project_root)
    os.environ.setdefault("PYSPARK_PYTHON", "python")

    # Discover MongoDB and other third-party JARs in spark_jobs/jars
    import glob
    jar_dir = os.path.join(project_root, "spark_jobs", "jars")
    found_jars = glob.glob(os.path.join(jar_dir, "*.jar"))
    jars_comma = ",".join(found_jars) if found_jars else ""
    classpath_semi = os.pathsep.join(found_jars) if found_jars else ""

    builder = (
        SparkSession.builder
        .appName(app_name)
        .master("local[*]")
        .config("spark.sql.warehouse.dir", warehouse_dir)
        .config("spark.local.dir", temp_dir)
        .config("spark.ui.enabled", "false")
        .config("spark.sql.shuffle.partitions", "8")          # Keep low for dev
        .config("spark.driver.memory", "2g")
        .config("spark.executor.memory", "2g")
        .config("spark.sql.execution.arrow.pyspark.enabled", "true")
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
        .config("spark.sql.legacy.parquet.nanosAsLong", "true")
        .config("spark.hadoop.validateOutputSpecs", "false")
    )

    if found_jars:
        builder = (
            builder
            .config("spark.jars", jars_comma)
            .config("spark.driver.extraClassPath", classpath_semi)
            .config("spark.executor.extraClassPath", classpath_semi)
        )

    spark = builder.getOrCreate()

    # Reduce log noise after session starts
    spark.sparkContext.setLogLevel("WARN")
    return spark


def stop_spark_session():
    """Stop the active SparkSession if one exists."""
    active = SparkSession.getActiveSession()
    if active:
        active.stop()
