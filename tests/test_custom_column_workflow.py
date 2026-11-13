"""
End-to-End Test for Custom Column Government Dataset Workflow
==============================================================
Validates:
1. Actual column names detection
2. First 10 rows preview
3. Mandatory vs optional indicator identification
4. Validation failure on missing mandatory columns
5. Rejection of Spark processing on unmapped/invalid columns (no silent assignment)
6. Preserving raw uploaded dataset on disk
7. Successful validation on user column mapping
8. Real Spark processing with custom mapping
9. Dynamic dashboard and analytics updates
"""

import os
import sys
import json
import time
import httpx

API_BASE = "http://127.0.0.1:8000"
FIXTURE_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "fixtures", "sample_govt_mgnrega_custom_cols.csv"
))

def run_test():
    print("=" * 70)
    print("GovPulse: Testing Custom Government Dataset Upload & Spark Workflow")
    print("=" * 70)

    # 1. Upload custom dataset
    print("\n[Step 1] Uploading dataset with non-standard government column names...")
    with open(FIXTURE_PATH, "rb") as f:
        r = httpx.post(
            f"{API_BASE}/api/datasets/upload",
            files={"file": ("sample_govt_mgnrega_custom_cols.csv", f, "text/csv")},
            data={
                "scheme_id": "mgnrega",
                "reporting_year": "2023-24",
                "source": "Ministry of Rural Development Test Fixture",
            },
            timeout=30.0,
        )
    assert r.status_code == 200, f"Upload failed: {r.status_code} {r.text}"
    upload_res = r.json()
    dataset_id = upload_res["dataset_id"]
    print(f"  ✓ Uploaded successfully. Dataset ID: {dataset_id}")
    print(f"  ✓ Detected columns count: {len(upload_res['detected_columns'])}")

    # 2. Get Preview
    print("\n[Step 2] Fetching preview (actual column names, first 10 rows, schema requirements)...")
    r = httpx.get(f"{API_BASE}/api/datasets/{dataset_id}/preview", timeout=15.0)
    assert r.status_code == 200, f"Preview failed: {r.status_code} {r.text}"
    preview = r.json()

    print(f"  ✓ Actual dataset columns: {preview['detected_columns']}")
    print(f"  ✓ Preview rows returned: {len(preview['preview_rows'])} (expected 10)")
    assert len(preview["preview_rows"]) == 10, f"Expected 10 preview rows, got {len(preview['preview_rows'])}"

    print(f"  ✓ Mandatory columns identified: {preview['required_columns']}")
    print(f"  ✓ Optional columns identified: {preview['optional_columns']}")
    assert "state" in preview["required_columns"]
    assert "district" in preview["required_columns"]

    # 3. Test Validation with Missing Mandatory Columns
    print("\n[Step 3] Validating mapping when mandatory columns are MISSING...")
    bad_mapping = {
        "households_registered": "Total Households Demanding Wage Employment"
        # 'state' and 'district' are deliberately omitted!
    }
    r = httpx.post(
        f"{API_BASE}/api/datasets/{dataset_id}/validate-mapping",
        json={"column_mapping": bad_mapping},
        timeout=15.0,
    )
    assert r.status_code == 200
    val_bad = r.json()
    assert val_bad["is_valid"] is False, "Validation should have failed!"
    assert "state" in val_bad["missing_mandatory"]
    assert "district" in val_bad["missing_mandatory"]
    print("  ✓ Validation correctly failed for missing mandatory columns.")
    print(f"  ✓ Detected errors: {val_bad['errors']}")

    # 4. Verify Spark Processing is REJECTED when mandatory columns are missing
    print("\n[Step 4] Attempting to process with missing mandatory mapping (must be REJECTED)...")
    r = httpx.post(
        f"{API_BASE}/api/datasets/{dataset_id}/process",
        json={"column_mapping": bad_mapping},
        timeout=15.0,
    )
    assert r.status_code == 400, f"Expected 400 rejection, got {r.status_code}"
    print(f"  ✓ Processing rejected with HTTP 400 as expected: {r.json()['detail']}")

    # 5. Provide Complete Valid Mapping
    print("\n[Step 5] Providing complete user mapping from government columns to canonical indicators...")
    good_mapping = {
        "state": "State/UT Name",
        "district": "District / Block Name",
        "households_registered": "Total Households Demanding Wage Employment",
        "households_employed": "Households Provided Employment",
        "person_days_generated": "Cumulative Persondays Generated",
        "person_days_target": "Approved Labour Budget Persondays",
        "expenditure_lakh": "Total Wage Expenditure (Rs. in Lakhs)",
        "total_budget_lakh": "Total Approved Financial Allocation (Lakhs)",
    }
    r = httpx.post(
        f"{API_BASE}/api/datasets/{dataset_id}/validate-mapping",
        json={"column_mapping": good_mapping},
        timeout=15.0,
    )
    assert r.status_code == 200
    val_good = r.json()
    assert val_good["is_valid"] is True, f"Validation should pass, but got: {val_good['errors']}"
    print("  ✓ Complete mapping validated successfully. is_valid = True")

    # 6. Save Mapping to Dataset
    print("\n[Step 6] Saving mapping to dataset record...")
    r = httpx.put(
        f"{API_BASE}/api/datasets/{dataset_id}/mapping",
        json={"column_mapping": good_mapping},
        timeout=15.0,
    )
    assert r.status_code == 200
    print("  ✓ Mapping persisted in SQLite database.")

    # 7. Check Raw File Preservation
    print("\n[Step 7] Checking original raw file preservation on disk...")
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "mgnrega")
    raw_files = os.listdir(raw_dir)
    assert len(raw_files) > 0, "Raw dataset file was not preserved!"
    print(f"  ✓ Raw files preserved in {raw_dir}: {raw_files}")

    # 8. Start Spark Processing with Validated Mapping
    print("\n[Step 8] Starting Spark SQL processing with validated mapping...")
    r = httpx.post(
        f"{API_BASE}/api/datasets/{dataset_id}/process",
        json={"column_mapping": good_mapping},
        timeout=15.0,
    )
    assert r.status_code == 200, f"Process start failed: {r.status_code} {r.text}"
    job_id = r.json()["job_id"]
    print(f"  ✓ Spark Job #{job_id} queued.")

    # Poll for Spark job completion
    print("  Waiting for Spark job to complete...")
    max_wait = 90
    start = time.time()
    final_status = None
    while time.time() - start < max_wait:
        jr = httpx.get(f"{API_BASE}/api/jobs/{job_id}", timeout=10.0)
        job_data = jr.json()
        final_status = job_data["status"]
        if final_status in ("completed", "failed"):
            break
        time.sleep(2)

    assert final_status == "completed", f"Spark job failed! Error: {job_data.get('error_message')}"
    print(f"  ✓ Spark processing COMPLETED in {job_data.get('processing_time_seconds')}s!")
    print(f"  ✓ Records processed: {job_data.get('valid_records')}")

    # 9. Verify Dynamic Dashboard Update
    print("\n[Step 9] Verifying dynamic update of Dashboard Summary...")
    r = httpx.get(f"{API_BASE}/api/dashboard/summary", timeout=10.0)
    assert r.status_code == 200
    summary = r.json()
    print("  ✓ Updated Dashboard Summary:")
    print(f"    - Total Datasets: {summary['total_datasets']}")
    print(f"    - Total Records: {summary['total_records_processed']}")
    print(f"    - States Covered: {summary['states_covered']}")
    print(f"    - Districts Covered: {summary['districts_covered']}")
    assert summary["total_datasets"] >= 2
    assert summary["has_data"] is True

    # 10. Verify Scheme Analytics with New Calculations
    print("\n[Step 10] Verifying Scheme Analytics from Spark SQL...")
    r = httpx.get(f"{API_BASE}/api/analytics/scheme/mgnrega", timeout=10.0)
    assert r.status_code == 200
    analytics = r.json()
    assert analytics["has_data"] is True
    print("  ✓ Latest Spark Analytics:")
    print(f"    - Total Person-days Generated: {analytics['summary'].get('total_person_days'):,}")
    print(f"    - Total Person-days Target: {analytics['summary'].get('total_person_days_target'):,}")
    print(f"    - Employment Achievement: {analytics['summary'].get('employment_achievement_pct')}%")
    print(f"    - Budget Utilisation: {analytics['summary'].get('budget_utilisation_pct')}%")
    print(f"    - Top District: {analytics['district_rankings']['top'][0]}")

    print("\n" + "=" * 70)
    print("ALL 10 VERIFICATION REQUIREMENTS PASSED WITH 100% SUCCESS! ✓")
    print("=" * 70)

if __name__ == "__main__":
    run_test()
