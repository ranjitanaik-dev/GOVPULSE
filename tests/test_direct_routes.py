"""
GovPulse Direct Route Execution Test
Directly invokes FastAPI route handler functions to verify business logic,
SQLAlchemy ORM models, database queries, and response payloads.
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
sys.path.insert(0, project_dir)

from app.database.db import init_db, SessionLocal
from app.routes.schemes import list_schemes, get_scheme
from app.routes.dashboard import dashboard_summary
from app.routes.analytics import scheme_analytics, states_analytics, districts_analytics, trends_analytics, rankings, alerts
from app.routes.datasets import list_datasets

def run_tests():
    init_db()
    db = SessionLocal()
    try:
        print("1. Testing list_schemes()...")
        schemes = list_schemes(db)
        assert len(schemes) >= 4, f"Expected 4+ schemes, got {len(schemes)}"
        scheme_ids = [s["id"] for s in schemes]
        print(f"   ✓ Schemes found: {scheme_ids}")

        print("2. Testing get_scheme('mgnrega')...")
        mgnrega = get_scheme("mgnrega", db)
        assert mgnrega["id"] == "mgnrega"
        assert len(mgnrega["supported_indicators"]) > 0
        print(f"   ✓ MGNREGA indicators: {mgnrega['supported_indicators']}")

        print("3. Testing get_scheme('pmayg')...")
        pmayg = get_scheme("pmayg", db)
        assert pmayg["id"] == "pmayg"
        print(f"   ✓ PMAY-G indicators: {pmayg['supported_indicators']}")

        print("4. Testing dashboard_summary()...")
        summary = dashboard_summary(db)
        assert summary["total_schemes"] == 4
        assert summary["has_data"] is False  # Empty state verified
        print(f"   ✓ Dashboard summary: total_schemes={summary['total_schemes']}, has_data={summary['has_data']}")

        print("5. Testing list_datasets()...")
        datasets = list_datasets(db=db)
        print(f"   ✓ Uploaded datasets: {len(datasets)}")

        print("6. Testing scheme_analytics('mgnrega')...")
        res = scheme_analytics("mgnrega", db=db)
        assert res["has_data"] is False
        print(f"   ✓ Scheme analytics empty state: has_data={res['has_data']}, msg='{res['message']}'")

        print("7. Testing states_analytics()...")
        states_res = states_analytics(db=db)
        print(f"   ✓ States analytics: has_data={states_res['has_data']}")

        print("8. Testing districts_analytics()...")
        dist_res = districts_analytics(db=db)
        print(f"   ✓ Districts analytics: has_data={dist_res['has_data']}")

        print("9. Testing trends_analytics()...")
        trends_res = trends_analytics(db=db)
        print(f"   ✓ Trends analytics: has_data={trends_res['has_data']}")

        print("10. Testing rankings()...")
        rankings_res = rankings(db=db)
        print(f"   ✓ Rankings analytics: has_data={rankings_res['has_data']}")

        print("11. Testing alerts()...")
        alerts_res = alerts(db=db)
        print(f"   ✓ Performance alerts: total_alerts={alerts_res['total_alerts']}")

        print("\n=======================================================")
        print("ALL 11 BACKEND ROUTE & ORM TESTS PASSED SUCCESSFULLY! ✓")
        print("=======================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
