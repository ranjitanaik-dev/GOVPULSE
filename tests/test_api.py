"""
GovPulse — FastAPI API Tests
==============================
Run with: pytest tests/test_api.py -v
Requires the backend to be running on localhost:8000.
"""

import os
import sys
import pytest
import httpx

API_BASE = "http://localhost:8000"
FIXTURE_MGNREGA = os.path.join(os.path.dirname(__file__), "fixtures", "sample_mgnrega.csv")
FIXTURE_PMAYG = os.path.join(os.path.dirname(__file__), "fixtures", "sample_pmayg.csv")


# ---------------------------------------------------------------------------
# Health checks
# ---------------------------------------------------------------------------

class TestHealth:
    def test_root(self):
        r = httpx.get(f"{API_BASE}/")
        assert r.status_code == 200
        assert r.json()["status"] == "running"

    def test_health(self):
        r = httpx.get(f"{API_BASE}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_swagger_docs(self):
        r = httpx.get(f"{API_BASE}/docs")
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Schemes
# ---------------------------------------------------------------------------

class TestSchemes:
    def test_list_schemes(self):
        r = httpx.get(f"{API_BASE}/api/schemes")
        assert r.status_code == 200
        schemes = r.json()
        assert len(schemes) >= 4
        ids = [s["id"] for s in schemes]
        assert "mgnrega" in ids
        assert "pmayg" in ids

    def test_get_scheme(self):
        r = httpx.get(f"{API_BASE}/api/schemes/mgnrega")
        assert r.status_code == 200
        scheme = r.json()
        assert scheme["id"] == "mgnrega"
        assert "supported_indicators" in scheme

    def test_invalid_scheme_404(self):
        r = httpx.get(f"{API_BASE}/api/schemes/invalid_scheme")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class TestDashboard:
    def test_summary_returns_200(self):
        r = httpx.get(f"{API_BASE}/api/dashboard/summary")
        assert r.status_code == 200

    def test_summary_has_required_fields(self):
        r = httpx.get(f"{API_BASE}/api/dashboard/summary")
        data = r.json()
        required = ["total_schemes", "total_datasets", "total_records_processed",
                    "states_covered", "completed_jobs"]
        for field in required:
            assert field in data, f"Missing field: {field}"

    def test_summary_total_schemes_is_4(self):
        r = httpx.get(f"{API_BASE}/api/dashboard/summary")
        assert r.json()["total_schemes"] == 4


# ---------------------------------------------------------------------------
# Dataset upload
# ---------------------------------------------------------------------------

class TestDatasetUpload:
    def test_upload_mgnrega_csv(self):
        with open(FIXTURE_MGNREGA, "rb") as f:
            r = httpx.post(
                f"{API_BASE}/api/datasets/upload",
                files={"file": ("sample_mgnrega.csv", f, "text/csv")},
                data={
                    "scheme_id": "mgnrega",
                    "reporting_year": "2023-24",
                    "source": "Test Fixture",
                },
            )
        assert r.status_code == 200
        result = r.json()
        assert "dataset_id" in result
        assert result["status"] == "uploaded"
        return result["dataset_id"]

    def test_upload_invalid_scheme(self):
        with open(FIXTURE_MGNREGA, "rb") as f:
            r = httpx.post(
                f"{API_BASE}/api/datasets/upload",
                files={"file": ("test.csv", f, "text/csv")},
                data={"scheme_id": "invalid", "reporting_year": "2023-24"},
            )
        assert r.status_code == 400

    def test_upload_missing_file_returns_422(self):
        r = httpx.post(
            f"{API_BASE}/api/datasets/upload",
            data={"scheme_id": "mgnrega", "reporting_year": "2023-24"},
        )
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Dataset list
# ---------------------------------------------------------------------------

class TestDatasetList:
    def test_list_returns_200(self):
        r = httpx.get(f"{API_BASE}/api/datasets")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_by_scheme(self):
        r = httpx.get(f"{API_BASE}/api/datasets?scheme_id=mgnrega")
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Analytics endpoints (may return empty if no data processed yet)
# ---------------------------------------------------------------------------

class TestAnalytics:
    def test_scheme_analytics_200(self):
        r = httpx.get(f"{API_BASE}/api/analytics/scheme/mgnrega")
        assert r.status_code == 200

    def test_scheme_analytics_no_data_message(self):
        r = httpx.get(f"{API_BASE}/api/analytics/scheme/mgnrega")
        data = r.json()
        assert "has_data" in data

    def test_states_returns_200(self):
        r = httpx.get(f"{API_BASE}/api/analytics/states")
        assert r.status_code == 200

    def test_districts_returns_200(self):
        r = httpx.get(f"{API_BASE}/api/analytics/districts")
        assert r.status_code == 200

    def test_trends_returns_200(self):
        r = httpx.get(f"{API_BASE}/api/analytics/trends")
        assert r.status_code == 200

    def test_rankings_returns_200(self):
        r = httpx.get(f"{API_BASE}/api/analytics/rankings")
        assert r.status_code == 200

    def test_alerts_returns_200(self):
        r = httpx.get(f"{API_BASE}/api/analytics/alerts")
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

class TestJobs:
    def test_list_jobs_200(self):
        r = httpx.get(f"{API_BASE}/api/jobs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_invalid_job_404(self):
        r = httpx.get(f"{API_BASE}/api/jobs/999999")
        assert r.status_code == 404
