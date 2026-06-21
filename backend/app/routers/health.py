import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.patient import Patient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/db")
def db_health_check(db: Session = Depends(get_db)):
    logger.info("GET /health/db called — checking 'patients' table")
    try:
        row_count = db.query(func.count(Patient.id)).scalar()
        logger.info("Table 'patients' reachable, row_count=%d", row_count)
        return {
            "status": "ok",
            "database": "connected",
            "table": "users",
            "row_count": row_count,
        }
    except Exception:
        logger.exception("GET /health/db — database unreachable")
        return {
            "status": "error",
            "database": "disconnected",
        }
