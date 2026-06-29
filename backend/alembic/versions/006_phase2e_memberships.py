"""add memberships table

Revision ID: 006_phase2e
Revises: 005_phase2d
Create Date: 2026-06-13

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006_phase2e"
down_revision: Union[str, None] = "005_phase2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # TEMP HOTFIX (2026-06-28): Disable explicit ENUM type creation to prevent
    # psycopg.errors.DuplicateObject crashes during migration startup.
    #
    # op.execute(
    #     """
    #     DO $$ BEGIN
    #         CREATE TYPE membership_status AS ENUM ('ACTIVE', 'PENDING', 'EXPIRED');
    #     EXCEPTION
    #         WHEN duplicate_object THEN NULL;
    #     END $$;
    #     """
    # )


    if not inspector.has_table("memberships"):
        op.create_table(
            "memberships",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column(
                "status",
                sa.Enum("ACTIVE", "PENDING", "EXPIRED", name="membership_status", create_type=False),
                nullable=False,
                server_default="PENDING",
            ),
            sa.Column("renewal_date", sa.Date(), nullable=True),
            sa.Column("cpd_points_accumulated", sa.Numeric(6, 1), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", name="uq_memberships_user_id"),
        )
        op.create_index("ix_memberships_id", "memberships", ["id"], unique=False)
        op.create_index("ix_memberships_user_id", "memberships", ["user_id"], unique=True)
        op.create_index("ix_memberships_status", "memberships", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_memberships_status", table_name="memberships")
    op.drop_index("ix_memberships_user_id", table_name="memberships")
    op.drop_index("ix_memberships_id", table_name="memberships")
    op.drop_table("memberships")
    op.execute("DROP TYPE IF EXISTS membership_status")
