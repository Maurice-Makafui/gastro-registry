import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database import create_tables, run_migrations
from app.routers import (
    auth,
    patients,
    referrals,
    doctor,
    followups,
    analytics,
    facilities,
    audit,
    specialists,
    referral_feedback,
    procedures,
    liver_registry,
    mdt,
    members,
)
from app.seed import seed_database
from app.logging_config import setup_logging
from app.middleware.audit_middleware import AuditMiddleware
from app.tasks.cld_scan_tasks import execute_cld_risk_scan, periodic_cld_scan_loop
from app.services.registry_automation import register_registry_listeners


@asynccontextmanager
async def lifespan(app: FastAPI):
    register_registry_listeners()
    create_tables()
    try:
        run_migrations()
    except Exception as e:
        # In production (Render/Neon), failing migrations must not be silent.
        # This prevents the app from starting with an out-of-date schema.
        import logging

        logging.getLogger(__name__).exception("Alembic migrations failed: %s", e)
        raise

    seed_database()
    execute_cld_risk_scan()
    scan_task = asyncio.create_task(periodic_cld_scan_loop())
    yield
    scan_task.cancel()
    try:
        await scan_task
    except asyncio.CancelledError:
        pass


setup_logging()

app = FastAPI(
    title="Gastro Referral & Registry System API",
    description="Clinical workflow platform for gastroenterology and hepatology specialists in Ghana.",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(referral_feedback.router)
app.include_router(referrals.router)
app.include_router(doctor.router)
app.include_router(followups.router)
app.include_router(analytics.router)
app.include_router(facilities.router)
app.include_router(audit.router)
app.include_router(specialists.router)
app.include_router(procedures.router)
app.include_router(liver_registry.router)
app.include_router(mdt.router)
app.include_router(members.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Gastro Referral API", "version": "2.1.0"}
