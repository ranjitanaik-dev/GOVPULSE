"""
GovPulse FastAPI Backend — Main Application
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.db import init_db
from app.database.mongodb import init_mongo_db, close_mongo_connections, check_mongo_health
from app.routes import datasets, jobs, dashboard, analytics, reports, schemes, auth, contact

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
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(contact.router, prefix="/api/contact", tags=["Public Contact"])

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

    # MongoDB initialization (safe non-blocking initialization)
    try:
        mongo_report = init_mongo_db()
        if mongo_report.get("initialized"):
            logger.info("MongoDB initialized successfully: database=%s", mongo_report.get("database"))
        else:
            logger.warning("MongoDB initialization notice: %s", mongo_report.get("error"))
    except Exception as e:
        logger.warning("MongoDB initialization deferred: %s", e)

    # Startup handoff reconciliation sweep (self-heals any crashed handoffs)
    try:
        from app.database.db import SessionLocal
        from app.services.dataset_handoff_service import reconcile_handoffs
        rec_db = SessionLocal()
        try:
            rec_summary = reconcile_handoffs(rec_db)
            if rec_summary.get("scanned", 0) > 0:
                logger.info("Startup handoff reconciliation complete: %s", rec_summary)
        finally:
            rec_db.close()
    except Exception as e:
        logger.warning("Startup handoff reconciliation notice: %s", e)


@app.on_event("shutdown")
def shutdown_event():
    logger.info("GovPulse API shutting down...")
    close_mongo_connections()


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "GovPulse API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health():
    mongo_health = check_mongo_health()
    is_mongo_ok = mongo_health.get("connected") and mongo_health.get("all_indexes_verified")
    return {
        "status": "healthy" if is_mongo_ok else "degraded",
        "database": {
            "sqlite": "healthy",
            "mongodb": mongo_health,
        },
    }
