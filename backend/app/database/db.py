"""
GovPulse — SQLAlchemy Database Configuration (Synchronous SQLite)
Optimised for high performance and zero threading locks on Windows.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Data directory path
DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")
)
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "govpulse.db").replace("\\", "/")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def init_db():
    """Create all tables on startup and apply non-destructive SQLite schema extensions."""
    from app.models import models  # noqa: F401 — registers models
    Base.metadata.create_all(bind=engine)

    # Non-destructive Phase 2 schema extension for datasets table
    try:
        with engine.connect() as conn:
            cursor = conn.exec_driver_sql("PRAGMA table_info(datasets)")
            existing_cols = {row[1] for row in cursor.fetchall()}
            phase2_columns = [
                ("file_hash", "VARCHAR(64)"),
                ("version", "INTEGER DEFAULT 1"),
                ("lease_id", "VARCHAR(36)"),
                ("worker_id", "VARCHAR"),
                ("attempt_number", "INTEGER DEFAULT 1"),
                ("lease_expires_at", "DATETIME"),
            ]
            for col_name, col_type in phase2_columns:
                if col_name not in existing_cols:
                    conn.exec_driver_sql(f"ALTER TABLE datasets ADD COLUMN {col_name} {col_type}")
            conn.commit()
    except Exception as e:
        import logging
        logging.getLogger("govpulse.db").warning("SQLite schema check notice: %s", e)


def get_db():
    """Dependency for FastAPI routes — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
