"""add SUPER_ADMIN and PLATFORM_ADMIN roles

Revision ID: 008_super_platform_admin
Revises: 007_specialist_referral
Create Date: 2026-06-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "008_super_platform_admin"
down_revision: Union[str, None] = "007_specialist_referral"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
    # Acquire a fresh connection in AUTOCOMMIT mode to bypass Alembic's transaction wrapper.
    bind = op.get_bind()
    with bind.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(sa.text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'"))
        conn.execute(sa.text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN'"))


def downgrade() -> None:
    pass
