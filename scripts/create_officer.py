"""
GovPulse — Officer Account Management CLI
=========================================
Create or update authorized officer accounts with secure PBKDF2-HMAC-SHA256 password hashing.

Usage:
  python scripts/create_officer.py --officer-id OFFICER-KA-001 --password "GovPulse@2026" --name "Smt. Rajeshwari N." --designation "State Monitoring Officer" --department "RDPR Karnataka"
"""

import argparse
import datetime
import hashlib
import os
import secrets
import sys

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

from app.database.db import SessionLocal, init_db
from app.models.models import Officer


def create_or_update_officer(
    officer_id: str,
    password: str,
    full_name: str,
    designation: str,
    department: str = "",
    is_active: bool = True,
):
    init_db()
    clean_id = officer_id.strip()

    salt_hex = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        100_000,
    ).hex()

    with SessionLocal() as db:
        existing = db.query(Officer).filter(Officer.officer_id == clean_id).first()
        if existing:
            existing.full_name = full_name
            existing.designation = designation
            existing.department = department
            existing.salt = salt_hex
            existing.password_hash = pwd_hash
            existing.is_active = is_active
            action = "Updated"
        else:
            new_officer = Officer(
                officer_id=clean_id,
                full_name=full_name,
                designation=designation,
                department=department,
                salt=salt_hex,
                password_hash=pwd_hash,
                is_active=is_active,
                created_at=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(new_officer)
            action = "Created"

        db.commit()
        print(f"✓ Successfully {action} Officer: {clean_id} ({full_name})")
        print(f"  Designation: {designation}")
        print(f"  Department:  {department}")
        print(f"  Active:      {is_active}")


def main():
    parser = argparse.ArgumentParser(description="Create or update a GovPulse officer account.")
    parser.add_argument("--officer-id", default="OFFICER-KA-001", help="Unique Officer ID (default: OFFICER-KA-001)")
    parser.add_argument("--password", default="GovPulse@2026", help="Secure password (default: GovPulse@2026)")
    parser.add_argument("--name", default="Smt. Rajeshwari N.", help="Officer Full Name")
    parser.add_argument("--designation", default="State Monitoring Officer", help="Official Designation")
    parser.add_argument("--department", default="Rural Development & Panchayat Raj Department, Govt. of Karnataka", help="Department")

    args = parser.parse_args()

    create_or_update_officer(
        officer_id=args.officer_id,
        password=args.password,
        full_name=args.name,
        designation=args.designation,
        department=args.department,
    )


if __name__ == "__main__":
    main()
