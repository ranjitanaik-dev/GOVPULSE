"""
GovPulse — Phase 3.3 End-to-End Workflow Verification
-----------------------------------------------------
Tests the complete end-to-end application workflow:
1. Select dataset (#4 PMAY-G and #3 MGNREGA)
2. Verify registered dataset across SQLite and MongoDB
3. Retrieve committed raw data using load_committed_raw_dataset(spark, dataset_id)
4. Execute Spark SQL processing
5. Verify Parquet analytics outputs
6. Query backend analytics API (FastAPI)
7. Validate React dashboard payload parity
"""

import json
import os
import sys

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

from starlette.testclient import TestClient
from app.main import app
from app.database.db import SessionLocal
from app.database.mongodb import get_mongo_db
from app.models.models import Dataset, AnalyticsResult
from spark_jobs.spark_session import get_spark_session
from spark_jobs.ingestion import load_committed_raw_dataset
from pyspark.sql import functions as F


def run_e2e_verification():
    print("=" * 80)
    print("GovPulse — Step 6: End-to-End Workflow Verification")
    print("=" * 80)

    spark = get_spark_session("GovPulse_E2E_Verification")
    mongo = get_mongo_db()

    # -------------------------------------------------------------------------
    # STAGE 1 & 2: Select & Verify Registered Datasets
    # -------------------------------------------------------------------------
    print("\n[STAGE 1 & 2] Selecting and Verifying Registered Datasets (#3 and #4)...")
    with SessionLocal() as db:
        ds3 = db.get(Dataset, 3)
        ds4 = db.get(Dataset, 4)

        assert ds3 is not None and ds3.status == "processed"
        assert ds4 is not None and ds4.status == "processed"
        print(f"  SQLite Dataset #3: scheme={ds3.scheme_id}, status={ds3.status}, records={ds3.valid_records}, lease={ds3.lease_id}")
        print(f"  SQLite Dataset #4: scheme={ds4.scheme_id}, status={ds4.status}, records={ds4.valid_records}, lease={ds4.lease_id}")

    cat3 = mongo.dataset_catalog.find_one({"dataset_id": 3})
    cat4 = mongo.dataset_catalog.find_one({"dataset_id": 4})
    assert cat3["status"] == "INGESTED" and cat3["raw_ingestion"]["status"] == "VERIFIED_COMPLETE"
    assert cat4["status"] == "INGESTED" and cat4["raw_ingestion"]["status"] == "VERIFIED_COMPLETE"
    print(f"  MongoDB Catalog #3: status={cat3['status']}, attempt={cat3['attempt_number']}, records={cat3['raw_record_count']}")
    print(f"  MongoDB Catalog #4: status={cat4['status']}, attempt={cat4['attempt_number']}, records={cat4['raw_record_count']}")

    # -------------------------------------------------------------------------
    # STAGE 3: Retrieve Committed Raw Data via Spark
    # -------------------------------------------------------------------------
    print("\n[STAGE 3] Retrieving Committed Raw Data via load_committed_raw_dataset...")
    df3_raw = load_committed_raw_dataset(spark, 3)
    df4_raw = load_committed_raw_dataset(spark, 4)

    count3 = df3_raw.count()
    count4 = df4_raw.count()
    print(f"  Committed Raw Records Dataset #3: {count3} (expected 7454)")
    print(f"  Committed Raw Records Dataset #4: {count4} (expected 33)")
    assert count3 == 7454
    assert count4 == 33

    # -------------------------------------------------------------------------
    # STAGE 4: Spark SQL Processing
    # -------------------------------------------------------------------------
    print("\n[STAGE 4] Executing Spark SQL Aggregations...")
    df4_districts = df4_raw.filter(F.col("row_type") == "DISTRICT").select(
        F.col("raw_data.District Name").alias("district"),
        F.col("raw_data.`Completed`").cast("double").alias("completed_houses")
    )
    pmayg_top_dist = df4_districts.orderBy(F.col("completed_houses").desc()).first()
    print(f"  PMAY-G Top Completed District (Spark SQL): {pmayg_top_dist['district']} ({pmayg_top_dist['completed_houses']} houses)")

    # -------------------------------------------------------------------------
    # STAGE 5: Verify Parquet Analytics Output
    # -------------------------------------------------------------------------
    print("\n[STAGE 5] Verifying Parquet Analytics Outputs...")
    pq_pmayg = spark.read.parquet("data/processed/pmayg/district_rankings_4/data.parquet")
    pq_mgnrega = spark.read.parquet("data/processed/mgnrega/district_rankings_3/data.parquet")
    print(f"  Parquet district_rankings_4 row count: {pq_pmayg.count()}")
    print(f"  Parquet district_rankings_3 row count: {pq_pmayg.count()}")
    assert pq_pmayg.count() == 31
    assert pq_mgnrega.count() == 31

    # -------------------------------------------------------------------------
    # STAGE 6: Backend Analytics API
    # -------------------------------------------------------------------------
    print("\n[STAGE 6] Querying Backend Analytics API...")
    with TestClient(app) as client:
        r_pmayg = client.get("/api/analytics/scheme/pmayg")
        assert r_pmayg.status_code == 200
        pmayg_json = r_pmayg.json()
        print(f"  API PMAY-G Summary: completion_share_pct = {pmayg_json['summary']['completion_share_pct']}%")
        print(f"  API PMAY-G Missing Indicators: target = {pmayg_json['summary']['total_houses_target']}, expenditure = {pmayg_json['summary']['total_expenditure_cr']}")
        assert pmayg_json['summary']['total_houses_target'] is None
        assert pmayg_json['summary']['total_expenditure_cr'] is None

        r_mgnrega = client.get("/api/analytics/scheme/mgnrega")
        assert r_mgnrega.status_code == 200
        mgnrega_json = r_mgnrega.json()
        print(f"  API MGNREGA Summary: achievement_pct = {mgnrega_json['summary']['achievement_pct']}%")

        # ---------------------------------------------------------------------
        # STAGE 7: React Dashboard Payload Parity
        # ---------------------------------------------------------------------
        print("\n[STAGE 7] Validating React Dashboard Summary Endpoint Parity...")
        r_dash = client.get("/api/dashboard/summary")
        assert r_dash.status_code == 200
        dash_json = r_dash.json()
        print(f"  Dashboard Total Schemes: {dash_json['total_schemes']}")
        print(f"  Dashboard Total Datasets: {dash_json['total_datasets']}")
        print(f"  Dashboard Total Records Processed: {dash_json['total_records_processed']}")
        print(f"  Dashboard Completed Jobs: {dash_json['completed_jobs']}")

        assert dash_json['total_records_processed'] == 7535
        assert dash_json['completed_jobs'] == 6
        assert dash_json['total_datasets'] == 4

    print("\n" + "=" * 80)
    print("END-TO-END WORKFLOW VERIFICATION 100% SUCCESSFUL")
    print("=" * 80)


if __name__ == "__main__":
    run_e2e_verification()
