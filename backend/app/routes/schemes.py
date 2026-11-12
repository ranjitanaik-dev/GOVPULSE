"""
GovPulse — Schemes Router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.db import get_db
from app.models.models import Scheme
from app.services.scheme_config import SCHEMES_SEED

router = APIRouter()


def seed_schemes(db: Session):
    """Seed scheme definitions if not already present."""
    for scheme_data in SCHEMES_SEED:
        existing = db.get(Scheme, scheme_data["id"])
        if not existing:
            scheme = Scheme(**scheme_data)
            db.add(scheme)
    db.commit()


@router.get("", summary="List all supported government schemes")
def list_schemes(db: Session = Depends(get_db)):
    seed_schemes(db)
    result = db.execute(select(Scheme).where(Scheme.is_active == True))
    schemes = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "ministry": s.ministry,
            "supported_indicators": s.supported_indicators,
            "required_columns": s.required_columns,
            "optional_columns": s.optional_columns,
        }
        for s in schemes
    ]


@router.get("/{scheme_id}", summary="Get scheme details")
def get_scheme(scheme_id: str, db: Session = Depends(get_db)):
    seed_schemes(db)
    scheme = db.get(Scheme, scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme '{scheme_id}' not found")
    return {
        "id": scheme.id,
        "name": scheme.name,
        "description": scheme.description,
        "ministry": scheme.ministry,
        "supported_indicators": scheme.supported_indicators,
        "required_columns": scheme.required_columns,
        "optional_columns": scheme.optional_columns,
    }
