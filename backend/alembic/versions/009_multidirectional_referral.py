"""add referral_reason for multi-directional routing

Revision ID: 009_multidirectional_referral
Revises: 008_super_platform_admin
Create Date: 2026-06-28

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009_multidirectional_referral"
down_revision: Union[str, None] = "008_super_platform_admin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("referrals", sa.Column("referral_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("referrals", "referral_reason")

