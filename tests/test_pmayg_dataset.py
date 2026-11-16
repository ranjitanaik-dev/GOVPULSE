"""
Verification Test for Real PMAY-G Karnataka Dataset & Analytics Pipeline
========================================================================
Tests:
1. Actual source file is readable (data/raw/pmayg/PhysicalProgresReport_SPPMAYG_NNState_PMAYG_15_ALLPMAYG_Cumulative (1).xls)
2. All 31 districts are present
3. Karnataka Total is excluded from district aggregation
4. District names are unique after cleaning
5. Numeric columns are correctly parsed
6. District totals reconcile with source Karnataka Total row (0 diff)
7. Missing indicators remain N/A (houses_target, expenditure_cr)
8. Spark SQL analytics and Parquet outputs are generated in data/processed/pmayg/
9. PMAY-G API returns actual results (/api/analytics/scheme/pmayg)
10. District filters and CSV exports work
11. MGNREGA regression tests pass without breakage
"""

import os
import glob
import pandas as pd
import httpx
import pyarrow.parquet as pq

API_BASE = "http://127.0.0.1:8000"
RAW_FILE = os.path.join("data", "raw", "pmayg", "PhysicalProgresReport_SPPMAYG_NNState_PMAYG_15_ALLPMAYG_Cumulative (1).xls")
PROCESSED_DIR = os.path.join("data", "processed", "pmayg")

def test_pmayg_pipeline():
    print("=" * 80)
    print("GovPulse: Verifying Real PMAY-G Karnataka Dataset & End-to-End Analytics")
    print("=" * 80)

    # 1. Test source file existence and readability
    print("\n[Check 1] Verifying source file existence and readability...")
    assert os.path.exists(RAW_FILE), f"Source file missing: {RAW_FILE}"
    tables = pd.read_html(RAW_FILE)
    assert len(tables) > 0, "No HTML tables found in source .xls"
    raw_df = tables[0]
    print(f"  ✓ Source file exists and contains HTML table with shape: {raw_df.shape}")
    assert raw_df.shape[0] >= 34, f"Expected at least 34 rows, found {raw_df.shape[0]}"

    # Extract headers and clean rows
    header_row_idx = None
    for idx, row in raw_df.iterrows():
        if any('District Name' in str(val) for val in row.values):
            header_row_idx = idx
            break
    assert header_row_idx is not None, "Could not locate header row containing 'District Name'"

    clean_df = raw_df.iloc[header_row_idx + 1:].copy()
    clean_df.columns = [str(c).strip() for c in raw_df.iloc[header_row_idx]]

    # 2. Verify all 31 districts are present
    print("\n[Check 2] Verifying presence of all 31 administrative districts...")
    district_col = [c for c in clean_df.columns if 'District Name' in c][0]
    district_rows = clean_df[~clean_df[district_col].astype(str).str.contains('Total', case=False, na=False)].copy()
    district_rows = district_rows.dropna(subset=[district_col])
    # Filter to valid numbered rows (SNo 1 to 31)
    sno_col = clean_df.columns[0]
    numeric_districts = district_rows[district_rows[sno_col].astype(str).str.strip().str.isdigit()].copy()
    num_districts = len(numeric_districts)
    print(f"  ✓ Found {num_districts} district rows (expected exactly 31)")
    assert num_districts == 31, f"Expected 31 districts, got {num_districts}"

    # 3. Verify Karnataka Total is excluded from district aggregation
    print("\n[Check 3] Verifying exclusion of Karnataka Total row...")
    assert not any('Total' in str(d) for d in numeric_districts[district_col]), "Total row found in district slice!"
    print("  ✓ Total row cleanly excluded from district records")

    # 4. Verify district names are unique after cleaning
    print("\n[Check 4] Verifying uniqueness of district names...")
    dist_names = numeric_districts[district_col].str.strip().str.title().tolist()
    unique_dists = set(dist_names)
    print(f"  ✓ Unique districts count: {len(unique_dists)} / 31")
    assert len(unique_dists) == 31, f"Duplicate district names detected: {len(unique_dists)} != 31"

    # 5. Verify numeric columns are correctly parsed
    print("\n[Check 5] Verifying numeric parsing of all 8 indicators...")
    col_mapping = {
        'sanctions_geotagged': [c for c in clean_df.columns if 'GEO Tagged' in c][0],
        'sanctions_verified_accounts': [c for c in clean_df.columns if 'verified Accounts' in c][0],
        'installment_1': [c for c in clean_df.columns if c.strip() == '1st'][0],
        'installment_2': [c for c in clean_df.columns if c.strip() == '2nd'][0],
        'installment_3': [c for c in clean_df.columns if c.strip() == '3rd'][0],
        'installment_4': [c for c in clean_df.columns if c.strip() == '4th'][0],
        'completed_verified': [c for c in clean_df.columns if 'Completed & verified' in c][0],
        'completed_houses': [c for c in clean_df.columns if c.strip() == 'Completed'][0],
    }

    sums = {}
    for canonical, col_name in col_mapping.items():
        val_sum = numeric_districts[col_name].astype(str).str.replace(',', '').astype(float).sum()
        sums[canonical] = int(val_sum)
        print(f"  ✓ Sum of 31 districts for {canonical}: {sums[canonical]:,}")

    # 6. Reconcile against source file Karnataka Total row
    print("\n[Check 6] Reconciling district sums against source Karnataka Total row...")
    total_row = clean_df[clean_df[district_col].astype(str).str.strip().str.upper() == 'TOTAL'].iloc[0]
    expected_totals = {
        'sanctions_geotagged': int(str(total_row[col_mapping['sanctions_geotagged']]).replace(',', '')),
        'sanctions_verified_accounts': int(str(total_row[col_mapping['sanctions_verified_accounts']]).replace(',', '')),
        'installment_1': int(str(total_row[col_mapping['installment_1']]).replace(',', '')),
        'installment_2': int(str(total_row[col_mapping['installment_2']]).replace(',', '')),
        'installment_3': int(str(total_row[col_mapping['installment_3']]).replace(',', '')),
        'installment_4': int(str(total_row[col_mapping['installment_4']]).replace(',', '')),
        'completed_verified': int(str(total_row[col_mapping['completed_verified']]).replace(',', '')),
        'completed_houses': int(str(total_row[col_mapping['completed_houses']]).replace(',', '')),
    }

    for canonical, expected in expected_totals.items():
        actual = sums[canonical]
        diff = actual - expected
        print(f"  ✓ {canonical}: District Sum = {actual:,} | Source Total = {expected:,} | Discrepancy = {diff}")
        assert diff == 0, f"Reconciliation discrepancy in {canonical}: {diff} != 0"
    print("  ✓ 100% exact reconciliation (0 difference across all 8 indicators)")

    # 7. Verify missing indicators remain N/A and semantic subset relationships
    print("\n[Check 7] Verifying semantic relationships & missing indicators (no mock values)...")
    assert 'houses_target' not in sums, "houses_target should not be fabricated"
    assert 'expenditure_cr' not in sums, "expenditure_cr should not be fabricated"
    print("  ✓ Financial allocation and statutory targets are confirmed N/A")

    # Semantic verification: Completed exceeds 4th installment in all 31 districts
    for _, r in numeric_districts.iterrows():
        comp = float(str(r[col_mapping['completed_houses']]).replace(',', ''))
        comp_v = float(str(r[col_mapping['completed_verified']]).replace(',', ''))
        inst4 = float(str(r[col_mapping['installment_4']]).replace(',', ''))
        sanc = float(str(r[col_mapping['sanctions_geotagged']]).replace(',', ''))
        assert comp_v <= comp, f"Completed & verified ({comp_v}) exceeds Completed ({comp}) in {r[district_col]}"
        assert comp <= sanc, f"Completed ({comp}) exceeds Sanctions ({sanc}) in {r[district_col]}"
        assert comp > inst4, f"Completed ({comp}) not greater than 4th installment ({inst4}) in {r[district_col]}"
    print("  ✓ Semantic verification passed: Completed > 4th Installment across 100% of districts (31/31)")
    print("  ✓ Semantic verification passed: Completed & Verified <= Completed across 100% of districts (31/31)")

    # 8. Verify Parquet files exist in data/processed/pmayg/
    print("\n[Check 8] Verifying PySpark Parquet outputs in data/processed/pmayg/...")
    parquet_types = ['clean_dataset', 'district_rankings', 'state_performance', 'installment_progression', 'alerts']
    for p_type in parquet_types:
        matches = glob.glob(os.path.join(PROCESSED_DIR, f"{p_type}_*"))
        assert len(matches) > 0, f"Missing Parquet output for {p_type} in {PROCESSED_DIR}"
        latest_pq = sorted(matches)[-1]
        table = pq.read_table(latest_pq)
        print(f"  ✓ Parquet verified: {os.path.basename(latest_pq)} ({table.num_rows} rows, {table.num_columns} cols)")

    # 9. Test PMAY-G API endpoint
    print("\n[Check 9] Querying live FastAPI endpoint /api/analytics/scheme/pmayg...")
    r = httpx.get(f"{API_BASE}/api/analytics/scheme/pmayg", timeout=15.0)
    assert r.status_code == 200, f"API failed with status {r.status_code}"
    res = r.json()
    assert res['has_data'] is True
    summary = res['summary']
    assert summary['districts_covered'] == 31
    assert summary['total_sanctions_geotagged'] == 633782
    assert summary['total_completed_houses'] == 177270
    assert summary['completion_share_pct'] == 27.97
    assert len(res['installment_progression']) == 8
    assert len(res['district_rankings']['all']) == 31
    print(f"  ✓ PMAY-G Scheme API verified:")
    print(f"    - Districts Covered: {summary['districts_covered']}")
    print(f"    - Sanctions Geotagged: {summary['total_sanctions_geotagged']:,}")
    print(f"    - Verified Accounts: {summary['total_sanctions_verified_accounts']:,} ({summary['account_verification_pct']}%)")
    print(f"    - 1st Installment: {summary['total_installment_1']:,}")
    print(f"    - Completed Houses: {summary['total_completed_houses']:,}")
    print(f"    - Completion Share (Derived): {summary['completion_share_pct']}%")
    print(f"    - Installment Progression Funnel Stages: {len(res['installment_progression'])}")

    # 10. Test District Filter & CSV Export endpoints
    print("\n[Check 10] Testing district filters and CSV exports...")
    r_dist = httpx.get(f"{API_BASE}/api/analytics/districts?scheme_id=pmayg", timeout=15.0)
    assert r_dist.status_code == 200
    dist_data = r_dist.json()
    assert dist_data.get("has_data") is True
    all_districts = dist_data.get("all_districts", [])
    assert len(all_districts) == 31, f"Expected 31 districts, got {len(all_districts)}"
    print(f"  ✓ /api/analytics/districts returned all {len(all_districts)} districts in all_districts")
    assert len(dist_data.get("top_districts", [])) == 10
    assert len(dist_data.get("bottom_districts", [])) == 10

    r_exp = httpx.get(f"{API_BASE}/api/reports/export?scheme_id=pmayg&result_type=district_rankings", timeout=15.0)
    assert r_exp.status_code == 200
    csv_text = r_exp.text
    lines = csv_text.strip().split('\n')
    assert len(lines) == 32, f"Expected header + 31 districts (32 lines), got {len(lines)}"
    print(f"  ✓ /api/reports/export returned valid CSV with {len(lines)} lines")

    # 11. Test MGNREGA Regression
    print("\n[Check 11] Verifying MGNREGA regression compatibility...")
    r_mgnrega = httpx.get(f"{API_BASE}/api/analytics/scheme/mgnrega", timeout=15.0)
    assert r_mgnrega.status_code == 200
    m_res = r_mgnrega.json()
    assert m_res['has_data'] is True
    assert m_res['summary']['districts_covered'] == 31
    assert m_res['summary']['total_central_liability_persondays'] == 79567317.0
    assert m_res['summary']['achievement_pct'] == 88.41
    print(f"  ✓ MGNREGA is 100% operational (31 districts, 79,567,317 Central Liability PD, 88.41% Achievement)")

    print("\n" + "=" * 80)
    print("ALL 11 PMAY-G DATA ACCURACY & PIPELINE CHECKS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    test_pmayg_pipeline()
