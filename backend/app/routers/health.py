import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

_KEY_TABLES = [
    "users",
    "patients",
    "referrals",
    "consultations",
    "followups",
    "facilities",
    "specialists",
    "procedures",
    "liver_registries",
    "audit_logs",
]


@router.get("/db")
def db_health_check(db: Session = Depends(get_db)):
    try:
        # Identity — which project/db/schema/user is the backend actually connected to
        identity = db.execute(text(
            "SELECT current_database() AS db, current_schema() AS schema, current_user AS usr"
        )).mappings().one()

        # Row counts per table — explicit public schema, skip if table doesn't exist
        tables = {}
        for tbl in _KEY_TABLES:
            try:
                count = db.execute(
                    text(f"SELECT COUNT(*) FROM public.{tbl}")
                ).scalar()
                tables[tbl] = count
            except Exception:
                db.rollback()   # clear the failed txn so subsequent queries work
                tables[tbl] = "table_not_found"

        return {
            "status": "ok",
            "database": "connected",
            "db_name": identity["db"],
            "schema": identity["schema"],
            "db_user": identity["usr"],
            "tables": tables,
        }
    except Exception:
        logger.exception("GET /health/db — database unreachable")
        return {"status": "error", "database": "disconnected"}
