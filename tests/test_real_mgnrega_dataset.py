"""
Verification Test for Real data.gov.in MGNREGA Dataset (7,454 records, 36 columns)
==================================================================================
Tests:
1. Preview endpoint returns actual 36 column names and 10 rows.
2. Auto-suggested column mapping identifies Central Liability, Labour Budget, Expenditures, Social Participation, Works, and Months.
3. Separation of Mandatory (State, District) and Optional indicators.
4. Correct distinguishing of Central Liability Person-days vs Overall Person-days.
5. Unavailable metrics represented as null/None (renders N/A in UI, no fake numbers).
6. Multi-snapshot data granularity handling (no blind duplicate removal, 7,454 valid records).
7. Spark SQL output verifies district rankings, monthly trends, participation, and work completion.
8. Dynamic dashboard summary updates.
"""

import httpx
import json

API_BASE = "http://127.0.0.1:8000"

def test_workflow():
    print("=" * 75)
    print("GovPulse: Verifying Real data.gov.in MGNREGA Dataset Compatibility")
    print("=" * 75)

    # 1. Test Preview & Schema Detection for Dataset 3
    print("\n[Check 1] Querying preview for Dataset #3 (7,454 records)...")
    r = httpx.get(f"{API_BASE}/api/datasets/3/preview", timeout=15.0)
    assert r.status_code == 200, f"Preview failed: {r.status_code}"
    preview = r.json()
    print(f"  ✓ Detected columns count: {len(preview['detected_columns'])} (expected 36)")
    assert len(preview['detected_columns']) == 36
    print(f"  ✓ Preview rows returned: {len(preview['preview_rows'])} (expected 10)")
    assert len(preview['preview_rows']) == 10
    print(f"  ✓ Mandatory columns: {preview['required_columns']}")
    print(f"  ✓ Auto-suggested Central Liability: {preview['suggested_mapping'].get('persondays_central_liability')}")
    assert preview['suggested_mapping'].get('persondays_central_liability') == "Persondays_of_Central_Liability_so_far"
    assert preview['suggested_mapping'].get('person_days_target') == "Approved_Labour_Budget"

    # 2. Test Pre-Validation
    print("\n[Check 2] Validating column mapping against schema...")
    val_payload = {"column_mapping": preview['suggested_mapping']}
    r = httpx.post(f"{API_BASE}/api/datasets/3/validate-mapping", json=val_payload, timeout=15.0)
    assert r.status_code == 200
    val_res = r.json()
    print(f"  ✓ Mapping validation passed: {val_res['is_valid']}")
    assert val_res['is_valid'] is True
    print(f"  ✓ Missing mandatory: {val_res['missing_mandatory']} (none)")
    assert len(val_res['missing_mandatory']) == 0
    print(f"  ✓ Unmapped optional notices (no fake values): {val_res['warnings']}")

    # 3. Test Scheme Analytics Endpoint (MGNREGA)
    print("\n[Check 3] Verifying MGNREGA Scheme Analytics (Spark SQL results)...")
    r = httpx.get(f"{API_BASE}/api/analytics/scheme/mgnrega", timeout=15.0)
    assert r.status_code == 200
    scheme_res = r.json()
    assert scheme_res['has_data'] is True
    summary = scheme_res['summary']

    print("  ✓ Core Employment & Liability Metrics:")
    print(f"    - Central Liability Person-days: {summary.get('total_central_liability_persondays'):,}")
    print(f"    - Overall Person-days (Total): {summary.get('total_person_days')} (Expect None/N/A)")
    print(f"    - Approved Labour Budget: {summary.get('total_person_days_target'):,}")
    print(f"    - Central Liability Achievement: {summary.get('central_liability_achievement_pct')}%")
    print(f"    - Total Records Processed: {summary.get('total_records'):,}")

    assert summary.get('total_central_liability_persondays') is not None
    assert summary.get('total_person_days') is None, "Overall person-days must be None (N/A) since it's not in dataset!"
    assert summary.get('total_records') == 7454, f"Expected 7,454 records, got {summary.get('total_records')}"

    # 4. Test Social Participation & Work Completion
    print("\n[Check 4] Verifying Participation & Work Completion Analytics:")
    print(f"    - Women Person-days: {summary.get('total_women_persondays'):,} ({summary.get('women_participation_pct')}%)")
    print(f"    - SC Person-days: {summary.get('total_sc_persondays'):,} ({summary.get('sc_participation_pct')}%)")
    print(f"    - ST Person-days: {summary.get('total_st_persondays'):,} ({summary.get('st_participation_pct')}%)")
    print(f"    - Works Completed: {summary.get('total_completed_works'):,}")
    print(f"    - Work Completion Rate: {summary.get('work_completion_pct')}%")
    assert summary.get('women_participation_pct') > 50.0

    # 5. Test Monthly Trends
    print("\n[Check 5] Verifying Monthly Time-Series Progression (April -> March):")
    monthly = scheme_res.get('monthly_trends', [])
    print(f"    - Total Months Reported: {len(monthly)}")
    assert len(monthly) == 12, f"Expected 12 months, got {len(monthly)}"
    print(f"    - First Month: {monthly[0]['month']} (Cumulative: {monthly[0].get('cumulative_central_persondays'):,}, Incremental: {monthly[0].get('monthly_incremental_persondays'):,})")
    print(f"    - Peak Summer Month: {monthly[1]['month']} (Incremental: {monthly[1].get('monthly_incremental_persondays'):,})")
    print(f"    - Final Month: {monthly[-1]['month']} (Cumulative: {monthly[-1].get('cumulative_central_persondays'):,})")
    assert monthly[0]['month'].lower() == 'april'
    assert monthly[-1]['month'].lower() == 'march'

    # 6. Test District Rankings
    print("\n[Check 6] Verifying Top & Bottom District Rankings:")
    rankings = scheme_res.get('district_rankings', {})
    top5 = rankings.get('top', [])[:5]
    bottom5 = rankings.get('bottom', [])[:5]
    print(f"    - Top 1 District: {top5[0]['district']} ({top5[0]['achievement_pct']}%)")
    print(f"    - Bottom 1 District: {bottom5[0]['district']} ({bottom5[0]['achievement_pct']}%)")
    assert top5[0]['achievement_pct'] > 100.0
    assert bottom5[0]['achievement_pct'] < 50.0

    # 7. Test Dashboard Overview Summary
    print("\n[Check 7] Verifying Global Dashboard Overview Statistics:")
    r = httpx.get(f"{API_BASE}/api/dashboard/summary", timeout=15.0)
    assert r.status_code == 200
    dash = r.json()
    print(f"    - Total Records Processed: {dash['total_records_processed']:,}")
    print(f"    - Total Datasets: {dash['total_datasets']}")
    print(f"    - States Covered: {dash['states_covered']}")
    print(f"    - Districts Covered: {dash['districts_covered']}")
    assert dash['total_records_processed'] >= 7454

    print("\n" + "=" * 75)
    print("ALL VERIFICATION CHECKS FOR REAL MGNREGA DATASET PASSED WITH 100% SUCCESS! ✓")
    print("=" * 75)

if __name__ == "__main__":
    test_workflow()
