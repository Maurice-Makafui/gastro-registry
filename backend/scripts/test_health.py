import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from app.core.config import settings  # noqa — resolves DATABASE_URL before engine init
from app.database import SessionLocal
from sqlalchemy import text
import json

KEY_TABLES = [
    "users", "patients", "referrals", "consultations", "followups",
    "facilities", "specialists", "procedures", "liver_registries", "audit_logs",
]

db = SessionLocal()
try:
    identity = db.execute(text(
        "SELECT current_database() AS db, current_schema() AS schema, current_user AS usr"
    )).mappings().one()

    tables = {}
    for tbl in KEY_TABLES:
        try:
            tables[tbl] = db.execute(text(f"SELECT COUNT(*) FROM public.{tbl}")).scalar()
        except Exception:
            db.rollback()
            tables[tbl] = "table_not_found"

    result = {
        "status": "ok",
        "database": "connected",
        "db_name": identity["db"],
        "schema": identity["schema"],
        "db_user": identity["usr"],
        "tables": tables,
    }
    print(json.dumps(result, indent=2))
finally:
    db.close()
