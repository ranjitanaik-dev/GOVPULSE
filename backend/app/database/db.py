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
    """Create all tables on startup."""
    from app.models import models  # noqa: F401 — registers models
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for FastAPI routes — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
