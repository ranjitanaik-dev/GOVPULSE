"""Quick backend smoke test — runs the server, hits endpoints, exits."""
import uvicorn
import asyncio
import httpx
import threading
import time
import sys
import os

backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
project_dir = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, backend_dir)
sys.path.insert(0, project_dir)

from app.main import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8111, log_level="error")

t = threading.Thread(target=run_server, daemon=True)
t.start()
time.sleep(3)

async def test():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8111") as c:
        r = await c.get("/")
        assert r.status_code == 200, f"/ failed: {r.status_code}"
        print(f"GET / => {r.status_code}: {r.json()}")

        r = await c.get("/health")
        assert r.status_code == 200
        print(f"GET /health => {r.status_code}: {r.json()}")

        r = await c.get("/api/schemes")
        assert r.status_code == 200
        schemes = r.json()
        assert len(schemes) >= 4
        print(f"GET /api/schemes => {r.status_code}: {len(schemes)} schemes")

        r = await c.get("/api/dashboard/summary")
        assert r.status_code == 200
        data = r.json()
        print(f"GET /api/dashboard/summary => {r.status_code}")
        print(f"  total_schemes={data.get('total_schemes')}, has_data={data.get('has_data')}")

        r = await c.get("/api/datasets")
        assert r.status_code == 200
        print(f"GET /api/datasets => {r.status_code}: {len(r.json())} datasets")

        r = await c.get("/api/analytics/scheme/mgnrega")
        assert r.status_code == 200
        print(f"GET /api/analytics/scheme/mgnrega => {r.status_code}")

        r = await c.get("/api/analytics/alerts")
        assert r.status_code == 200
        print(f"GET /api/analytics/alerts => {r.status_code}")

        print("\n=== ALL SMOKE TESTS PASSED ===")

asyncio.run(test())
