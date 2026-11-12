"""
GovPulse FastAPI Backend — Main Application
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.db import init_db
from app.routes import datasets, jobs, dashboard, analytics, reports, schemes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("govpulse.api")

# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GovPulse API",
    description="Government & Public Policy Performance Monitoring System — Spark SQL Analytics Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow React dev server
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Processing Jobs"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(schemes.router, prefix="/api/schemes", tags=["Schemes"])

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup_event():
    logger.info("GovPulse API starting up...")
    init_db()
    # Ensure data directories exist
    for d in ["data/raw", "data/processed", "data/quarantine", "data/reports"]:
        os.makedirs(d, exist_ok=True)
    logger.info("Database initialised. Data directories ready.")


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "GovPulse API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
