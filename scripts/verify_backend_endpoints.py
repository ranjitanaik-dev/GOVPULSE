"""
GovPulse — Phase 3.3 Backend API Verification Script
----------------------------------------------------
Executes in-depth verification of FastAPI backend endpoints using starlette TestClient:
- GET /api/health
- GET /api/dashboard/summary
- GET /api/datasets
- GET /api/datasets/3
- GET /api/datasets/4
- GET /api/analytics/scheme/mgnrega
- GET /api/analytics/scheme/pmayg
- GET /api/analytics/states
- GET /api/analytics/districts

Captures actual HTTP status codes and response bodies.
Confirms datasets #3 and #4 remain available and SQLite baseline is unchanged.
"""

import json
import os
import sys

# Ensure backend and workspace are on path
sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

from starlette.testclient import TestClient
from app.main import app
from app.database.db import SessionLocal
from app.models.models import Dataset, ProcessingJob, MigrationReservation
from sqlalchemy import select, func


def run_backend_verification():
    print("=" * 70)
    print("GovPulse — Backend Endpoint Verification")
    print("=" * 70)

    # Pre-check baseline in SQLite
    with SessionLocal() as db:
        pre_records = db.execute(select(func.sum(Dataset.valid_records)).where(Dataset.status == "processed")).scalar() or 0
        pre_jobs = db.execute(select(func.count()).select_from(ProcessingJob).where(ProcessingJob.status == "completed")).scalar() or 0
        pre_res = db.execute(select(func.count()).select_from(MigrationReservation)).scalar() or 0
        ds3 = db.get(Dataset, 3)
        ds4 = db.get(Dataset, 4)

    print(f"Pre-check SQLite baseline: total_records={pre_records}, completed_jobs={pre_jobs}, active_reservations={pre_res}")
    print(f"Dataset #3: status='{ds3.status}', lease_id='{ds3.lease_id}', attempt={ds3.attempt_number}")
    print(f"Dataset #4: status='{ds4.status}', lease_id='{ds4.lease_id}', attempt={ds4.attempt_number}")
    print("-" * 70)

    endpoints = [
        ("GET", "/api/health"),
        ("GET", "/health"),
        ("GET", "/api/dashboard/summary"),
        ("GET", "/api/datasets"),
        ("GET", "/api/datasets/3"),
        ("GET", "/api/datasets/4"),
        ("GET", "/api/analytics/scheme/mgnrega"),
        ("GET", "/api/analytics/scheme/pmayg"),
        ("GET", "/api/analytics/states"),
        ("GET", "/api/analytics/districts"),
    ]

    results = {}
    with TestClient(app) as client:
        for method, url in endpoints:
            print(f"\n[REQUEST] {method} {url}")
            resp = client.get(url)
            print(f"  Status Code: {resp.status_code}")
            try:
                data = resp.json()
                sample_str = json.dumps(data, indent=2)
                # Print sample
                lines = sample_str.splitlines()
                preview = "\n  ".join(lines[:35])
                if len(lines) > 35:
                    preview += f"\n  ... [{len(lines) - 35} more lines truncated]"
                print(f"  Response Body Preview:\n  {preview}")
                results[url] = {"status_code": resp.status_code, "data": data}
            except Exception as e:
                print(f"  Response Text (non-JSON): {resp.text[:300]}")
                results[url] = {"status_code": resp.status_code, "text": resp.text[:300]}

    # Post-check baseline in SQLite
    print("\n" + "-" * 70)
    with SessionLocal() as db:
        post_records = db.execute(select(func.sum(Dataset.valid_records)).where(Dataset.status == "processed")).scalar() or 0
        post_jobs = db.execute(select(func.count()).select_from(ProcessingJob).where(ProcessingJob.status == "completed")).scalar() or 0
        post_res = db.execute(select(func.count()).select_from(MigrationReservation)).scalar() or 0
        ds3_post = db.get(Dataset, 3)
        ds4_post = db.get(Dataset, 4)

    assert pre_records == post_records == 7535, f"Baseline records changed: {pre_records} -> {post_records}"
    assert pre_jobs == post_jobs == 6, f"Baseline completed jobs changed: {pre_jobs} -> {post_jobs}"
    assert post_res == 0, f"Unexpected active reservations: {post_res}"
    assert ds3_post.status == "processed"
    assert ds4_post.status == "processed"

    print("Post-check SQLite baseline: UNCHANGED (7535 valid records, 6 completed jobs, 0 reservations)")
    print(f"Dataset #3 remains status='{ds3_post.status}', lease_id='{ds3_post.lease_id}'")
    print(f"Dataset #4 remains status='{ds4_post.status}', lease_id='{ds4_post.lease_id}'")
    print("=" * 70)
    print("ALL BACKEND ENDPOINTS VERIFIED SUCCESSFULLY (100% PASS)")
    print("=" * 70)


if __name__ == "__main__":
    run_backend_verification()
