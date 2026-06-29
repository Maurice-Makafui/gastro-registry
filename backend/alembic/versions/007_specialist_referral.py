"""add specialist-to-specialist referral fields

Revision ID: 007_specialist_referral
Revises: 006_phase2e
Create Date: 2026-06-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_specialist_referral"
down_revision: Union[str, None] = "006_phase2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("referrals")]

    if "receiving_specialist_id" not in columns:
        op.add_column(
            "referrals",
            sa.Column("receiving_specialist_id", sa.Integer(), sa.ForeignKey("specialists.id"), nullable=True),
        )
        op.create_index("ix_referrals_receiving_specialist_id", "referrals", ["receiving_specialist_id"])

    if "receiving_facility_id" not in columns:
        op.add_column(
            "referrals",
            sa.Column("receiving_facility_id", sa.Integer(), sa.ForeignKey("facilities.id"), nullable=True),
        )
        op.create_index("ix_referrals_receiving_facility_id", "referrals", ["receiving_facility_id"])


def downgrade() -> None:
    op.drop_index("ix_referrals_receiving_facility_id", table_name="referrals")
    op.drop_index("ix_referrals_receiving_specialist_id", table_name="referrals")
    op.drop_column("referrals", "receiving_facility_id")
    op.drop_column("referrals", "receiving_specialist_id")
