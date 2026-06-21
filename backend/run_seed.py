"""
One-time seed runner - run this once locally to populate Supabase.

Usage:
    cd backend
    venv/Scripts/python.exe run_seed.py
"""

import os
import sys

os.environ.setdefault("SEED_ADMIN_PASSWORD",    "Admin@Gastro2024!")
os.environ.setdefault("SEED_DOCTOR_PASSWORD",   "Doctor@Gastro2024!")
os.environ.setdefault("SEED_NURSE_PASSWORD",    "Nurse@Gastro2024!")
os.environ.setdefault("SEED_HEPATO_PASSWORD",   "Hepato@Gastro2024!")
os.environ.setdefault("SEED_REFERRER_PASSWORD", "Referrer@Gastro2024!")

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# NullPool is required for Supabase PgBouncer transaction mode (port 6543)
engine = create_engine(settings.DATABASE_URL, poolclass=NullPool)

print("Connecting to database...")
with engine.connect() as conn:
    db_name = conn.execute(text("SELECT current_database()")).scalar()
    print(f"Connected to: {db_name}")

# Patch app.database in-place so seed.py uses this engine
import app.database as _db
_db.engine = engine
_db.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tables already exist on Supabase — skip create_tables to avoid prepared statement errors
print("Running seed...")
from app.seed import seed_database
seed_database()

print()
print("Done. Demo accounts created (if tables were empty):")
print("  admin@gastro.gh      /  Admin@Gastro2024!")
print("  doctor@gastro.gh     /  Doctor@Gastro2024!")
print("  nurse@gastro.gh      /  Nurse@Gastro2024!")
print("  hepato@gastro.gh     /  Hepato@Gastro2024!")
print("  referrer@gastro.gh   /  Referrer@Gastro2024!")
print()
print("Delete run_seed.py now - do not commit it.")
