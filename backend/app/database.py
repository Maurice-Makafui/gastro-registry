from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# psycopg v3 requires postgresql+psycopg:// scheme.
# For Supabase pooled connections (PgBouncer) use NullPool to avoid
# "prepared statement already exists" errors in transaction mode.
from sqlalchemy.pool import NullPool
import logging

logger = logging.getLogger(__name__)

_parsed_url = None
try:
    from urllib.parse import urlparse
    _parsed_url = urlparse(settings.DATABASE_URL)
except Exception:
    pass

# Port 6543 = Supabase transaction-mode pooler (PgBouncer); prepared statements not supported.
_is_pooled = (
    "pgbouncer" in settings.DATABASE_URL
    or settings.ENVIRONMENT == "production"
    or (bool(_parsed_url) and _parsed_url.port == 6543)
)

logger.info("Database host: %s (pooled=%s)", _parsed_url.hostname if _parsed_url else "unknown", _is_pooled)

_connect_args = {"prepare_threshold": 0} if _is_pooled else {}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args=_connect_args,
    **({"poolclass": NullPool} if _is_pooled else {"pool_size": 10, "max_overflow": 20}),
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

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    command.upgrade(alembic_cfg, "head")
