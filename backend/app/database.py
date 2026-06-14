from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database (dev fallback; prefer Alembic migrations)."""
    from app.models import (  # noqa: F401
        user,
        patient,
        referral,
        consultation,
        followup,
        facility,
        audit_log,
        specialist,
        referral_timeline,
        procedure,
        liver_registry,
        mdt,
        patient_registry,
        membership,
    )
    Base.metadata.create_all(bind=engine)


def run_migrations():
    """Run Alembic migrations to head."""
    from alembic.config import Config
    from alembic import command
    import os

    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    command.upgrade(alembic_cfg, "head")
