"""
GovPulse — Officer Authentication Router
========================================
Secure, session-based authentication for authorized government officers.
Uses PBKDF2-HMAC-SHA256 with 100,000 iterations and per-user cryptographic salts.
Zero plaintext storage, no hardcoded credentials, no public self-registration.
"""

import datetime
import hashlib
import hmac
import logging
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database.db import get_db
from app.models.models import Officer, OfficerSession

logger = logging.getLogger("govpulse.routes.auth")
router = APIRouter()

PBKDF2_ITERATIONS = 100_000
SESSION_DURATION_HOURS = 12


class LoginRequest(BaseModel):
    officer_id: str = Field(..., min_length=2, max_length=50, description="Authorized Officer ID")
    password: str = Field(..., min_length=4, max_length=128, description="Officer Password")


class OfficerResponse(BaseModel):
    officer_id: str
    full_name: str
    designation: str
    department: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    officer: OfficerResponse


def hash_password(password: str, salt_hex: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    salt_bytes = bytes.fromhex(salt_hex)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        PBKDF2_ITERATIONS,
    )
    return pwd_hash.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    """Constant-time password hash comparison to prevent timing attacks."""
    computed_hash = hash_password(password, salt_hex)
    return hmac.compare_digest(computed_hash, expected_hash_hex)


def get_current_officer(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Officer:
    """Dependency to retrieve and validate the authenticated officer via Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    # Query active session
    stmt = select(OfficerSession).where(
        OfficerSession.session_token == token,
    )
    session_record = db.execute(stmt).scalars().first()

    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_at = session_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)

    if now_utc > expires_at:
        db.delete(session_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    officer_stmt = select(Officer).where(Officer.officer_id == session_record.officer_id)
    officer = db.execute(officer_stmt).scalars().first()

    if not officer or not officer.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer account not found or inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return officer


@router.post("/login", response_model=LoginResponse, summary="Officer Login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate an officer with Officer ID and password.
    Returns a secure session bearer token upon success.
    """
    clean_id = payload.officer_id.strip()
    stmt = select(Officer).where(Officer.officer_id == clean_id)
    officer = db.execute(stmt).scalars().first()

    # Generic invalid credentials message to prevent user enumeration
    if not officer or not verify_password(payload.password, officer.salt, officer.password_hash):
        logger.warning("Failed login attempt for officer_id='%s'", clean_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Officer ID or Password.",
        )

    if not officer.is_active:
        logger.warning("Login attempted for deactivated officer_id='%s'", clean_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This officer account is currently inactive. Contact your administrator.",
        )

    # Generate secure 256-bit token
    token = secrets.token_hex(32)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now_utc + datetime.timedelta(hours=SESSION_DURATION_HOURS)

    session = OfficerSession(
        session_token=token,
        officer_id=officer.officer_id,
        created_at=now_utc,
        expires_at=expires_at,
    )
    db.add(session)

    officer.last_login_at = now_utc
    db.commit()

    logger.info("Successful login for officer_id='%s' (%s)", officer.officer_id, officer.full_name)

    return {
        "access_token": token,
        "token_type": "bearer",
        "officer": {
            "officer_id": officer.officer_id,
            "full_name": officer.full_name,
            "designation": officer.designation,
            "department": officer.department,
        },
    }


@router.get("/me", response_model=OfficerResponse, summary="Current Officer Profile")
def get_me(officer: Officer = Depends(get_current_officer)):
    """Retrieve the profile of the currently authenticated officer."""
    return {
        "officer_id": officer.officer_id,
        "full_name": officer.full_name,
        "designation": officer.designation,
        "department": officer.department,
    }


@router.post("/logout", summary="Officer Logout")
def logout(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Invalidate the officer's active session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        stmt = delete(OfficerSession).where(OfficerSession.session_token == token)
        db.execute(stmt)
        db.commit()

    return {"message": "Successfully logged out."}
