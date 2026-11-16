"""
GovPulse — Public Contact & Citizen Feedback Router
===================================================
Accepts public feedback, enquiries, and grievance communications.
Stores messages in SQLite with audit timestamps and generates reference tickets.
"""

import datetime
import logging
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database.db import get_db, Base

logger = logging.getLogger("govpulse.routes.contact")
router = APIRouter()


class ContactMessage(Base):
    __tablename__ = "contact_enquiries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(32), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)


class ContactResponse(BaseModel):
    success: bool
    ticket_id: str
    message: str


@router.post("", response_model=ContactResponse, summary="Submit Public Feedback or Enquiry")
def submit_contact(payload: ContactRequest, db: Session = Depends(get_db)):
    """Accept and record a public feedback or enquiry submission."""
    ticket = f"GP-ENQ-{secrets.token_hex(4).upper()}"
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    entry = ContactMessage(
        ticket_id=ticket,
        full_name=payload.name.strip(),
        email=payload.email.strip().lower(),
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        submitted_at=now_utc,
    )
    db.add(entry)
    db.commit()

    logger.info("Public enquiry received [ticket=%s] from email='%s'", ticket, payload.email)

    return {
        "success": True,
        "ticket_id": ticket,
        "message": f"Thank you, {payload.name}. Your enquiry has been received (Reference: {ticket}).",
    }
