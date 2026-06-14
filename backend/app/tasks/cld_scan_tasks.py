import asyncio
import logging
from app.database import SessionLocal
from app.services import liver_registry_service

logger = logging.getLogger(__name__)

CLD_SCAN_INTERVAL_SECONDS = 6 * 60 * 60


def execute_cld_risk_scan() -> None:
    db = SessionLocal()
    try:
        result = liver_registry_service.run_risk_scan(db)
        logger.info(
            "CLD risk scan complete: scanned=%s overdue=%s trend=%s normal=%s",
            result.scanned_records,
            result.overdue_count,
            result.trend_alert_count,
            result.normal_count,
        )
    except Exception as exc:
        logger.error("CLD risk scan failed: %s", exc)
        db.rollback()
    finally:
        db.close()


async def periodic_cld_scan_loop() -> None:
    while True:
        await asyncio.sleep(CLD_SCAN_INTERVAL_SECONDS)
        execute_cld_risk_scan()
