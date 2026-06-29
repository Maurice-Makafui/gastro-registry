"""referral assignment workflow — new statuses + decline_reason + referred_on chain

Revision ID: 011_referral_assignment_workflow
Revises: 010_network_registry
Create Date: 2026-07-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "011_referral_assignment_workflow"
down_revision: Union[str, None] = "010_network_registry"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("referrals")]

    # Add new workflow columns
    if "decline_reason" not in columns:
        op.add_column("referrals", sa.Column("decline_reason", sa.Text(), nullable=True))

    if "declined_at" not in columns:
        op.add_column("referrals", sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True))

    if "referred_on_from_referral_id" not in columns:
        op.add_column(
            "referrals",
            sa.Column(
                "referred_on_from_referral_id",
                sa.Integer(),
                sa.ForeignKey("referrals.id"),
                nullable=True,
            ),
        )

    # ALTER TYPE ADD VALUE cannot run inside a transaction — use a fresh AUTOCOMMIT connection.
    new_statuses = ["DRAFT", "SUBMITTED", "ASSIGNED", "ACCEPTED", "DECLINED", "REFERRED_ON"]
    with op.get_bind().engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for val in new_statuses:
            conn.execute(sa.text(f"ALTER TYPE referral_status ADD VALUE IF NOT EXISTS '{val}'"))


def downgrade() -> None:
    op.drop_column("referrals", "referred_on_from_referral_id")
    op.drop_column("referrals", "declined_at")
    op.drop_column("referrals", "decline_reason")
    # Note: PostgreSQL does not support removing enum values; downgrade leaves enum values in place
