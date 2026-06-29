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

_connect_args = {"prepare_threshold": None} if _is_pooled else {}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
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
    """Schema creation helper.

    Alembic is the source of truth for migrations.

    Previously we called Base.metadata.create_all(), which can auto-create
    PostgreSQL ENUM types and tables before Alembic runs, causing failures like:
    psycopg.errors.DuplicateObject: type "network_entity_type" already exists

    To prevent this, schema auto-creation is disabled; Alembic runs in
    `run_migrations()`.
    """
    # TEMP HOTFIX (2026-06-28): Commented out to prevent ANY model import side-effects
    # (including possible PostgreSQL ENUM registration/type creation) during backend/migration
    # startup. Alembic remains the source of truth for schema.
    #
    # Keep these imports commented so rollback is easy.
    # from app.models import (  # noqa: F401
    #     user,
    #     patient,
    #     referral,
    #     consultation,
    #     followup,
    #     facility,
    #     audit_log,
    #     specialist,
    #     referral_timeline,
    #     procedure,
    #     liver_registry,
    #     mdt,
    #     patient_registry,
    #     membership,
    # )
    return




def run_migrations():
    """Run Alembic migrations to head."""
    from alembic.config import Config
    from alembic import command
    import os

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    command.upgrade(alembic_cfg, "head")
