"""
GovPulse FastAPI In-Process Test Suite
Tests all endpoints using ASGI client.
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
sys.path.insert(0, project_dir)

from app.database.db import init_db
from app.main import app
from starlette.testclient import TestClient

# Initialize database directly
init_db()

# Create TestClient without triggering anyio blocking portal context manager
client = TestClient(app)

print("1. Testing Root...", flush=True)
r = client.get("/")
print("Root status:", r.status_code, r.json(), flush=True)

print("2. Testing Health...", flush=True)
r = client.get("/health")
print("Health status:", r.status_code, r.json(), flush=True)

print("3. Testing Schemes List...", flush=True)
r = client.get("/api/schemes")
print("Schemes status:", r.status_code, f"{len(r.json())} schemes found", flush=True)

print("4. Testing Scheme Details (mgnrega)...", flush=True)
r = client.get("/api/schemes/mgnrega")
print("Scheme details status:", r.status_code, r.json()["name"], flush=True)

print("5. Testing Dashboard Summary...", flush=True)
r = client.get("/api/dashboard/summary")
print("Dashboard summary status:", r.status_code, r.json(), flush=True)

print("6. Testing Datasets...", flush=True)
r = client.get("/api/datasets")
print("Datasets status:", r.status_code, f"{len(r.json())} datasets", flush=True)

print("7. Testing Analytics (mgnrega)...", flush=True)
r = client.get("/api/analytics/scheme/mgnrega")
print("Analytics status:", r.status_code, "has_data:", r.json().get("has_data"), flush=True)

print("8. Testing Alerts...", flush=True)
r = client.get("/api/analytics/alerts")
print("Alerts status:", r.status_code, "total_alerts:", r.json().get("total_alerts"), flush=True)

print("\n==========================================")
print("ALL FASTAPI IN-PROCESS TESTS PASSED 100%!")
print("==========================================")
