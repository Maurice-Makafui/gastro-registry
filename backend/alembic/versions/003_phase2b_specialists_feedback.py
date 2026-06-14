"""add specialists and referral feedback

Revision ID: 003_phase2b
Revises: 002_phase2a
Create Date: 2026-06-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003_phase2b"
down_revision: Union[str, None] = "002_phase2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE specialty AS ENUM ('GASTROENTEROLOGY', 'HEPATOLOGY', 'GI_SURGERY');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE feedback_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE timeline_status_type AS ENUM ('WORKFLOW', 'FEEDBACK');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    if not inspector.has_table("specialists"):
        op.create_table(
            "specialists",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column(
                "specialty",
                postgresql.ENUM(
                    "GASTROENTEROLOGY",
                    "HEPATOLOGY",
                    "GI_SURGERY",
                    name="specialty",
                    create_type=False,
                ),
                nullable=False,
            ),
            sa.Column("subspecialties", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
            sa.Column("institution_id", sa.Integer(), nullable=False),
            sa.Column("phone", sa.String(length=20), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("bio", sa.Text(), nullable=True),
            sa.Column("interests", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
            sa.Column("is_public", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["institution_id"], ["facilities.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )
        op.create_index("ix_specialists_id", "specialists", ["id"], unique=False)
        op.create_index("ix_specialists_user_id", "specialists", ["user_id"], unique=False)
        op.create_index("ix_specialists_specialty", "specialists", ["specialty"], unique=False)
        op.create_index("ix_specialists_institution_id", "specialists", ["institution_id"], unique=False)
        op.create_index("ix_specialists_deleted_at", "specialists", ["deleted_at"], unique=False)

    referral_columns = {col["name"] for col in inspector.get_columns("referrals")}

    if "referring_physician_id" not in referral_columns:
        op.add_column("referrals", sa.Column("referring_physician_id", sa.Integer(), nullable=True))
        op.create_index("ix_referrals_referring_physician_id", "referrals", ["referring_physician_id"], unique=False)
        op.create_foreign_key(
            "fk_referrals_referring_physician_id",
            "referrals",
            "users",
            ["referring_physician_id"],
            ["id"],
        )

    if "feedback_status" not in referral_columns:
        op.add_column(
            "referrals",
            sa.Column(
                "feedback_status",
                postgresql.ENUM(
                    "PENDING",
                    "ACCEPTED",
                    "REJECTED",
                    "COMPLETED",
                    name="feedback_status",
                    create_type=False,
                ),
                server_default="PENDING",
                nullable=False,
            ),
        )
        op.create_index("ix_referrals_feedback_status", "referrals", ["feedback_status"], unique=False)

    if "accepted_at" not in referral_columns:
        op.add_column("referrals", sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True))
    if "completed_at" not in referral_columns:
        op.add_column("referrals", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    if "outcome_summary" not in referral_columns:
        op.add_column("referrals", sa.Column("outcome_summary", sa.Text(), nullable=True))
    if "recommendation_text" not in referral_columns:
        op.add_column("referrals", sa.Column("recommendation_text", sa.Text(), nullable=True))

    if not inspector.has_table("referral_timeline"):
        op.create_table(
            "referral_timeline",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("referral_id", sa.Integer(), nullable=False),
            sa.Column("actor_id", sa.Integer(), nullable=False),
            sa.Column("from_status", sa.String(length=50), nullable=True),
            sa.Column("to_status", sa.String(length=50), nullable=False),
            sa.Column(
                "status_type",
                postgresql.ENUM("WORKFLOW", "FEEDBACK", name="timeline_status_type", create_type=False),
                nullable=False,
            ),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["referral_id"], ["referrals.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_referral_timeline_id", "referral_timeline", ["id"], unique=False)
        op.create_index("ix_referral_timeline_referral_id", "referral_timeline", ["referral_id"], unique=False)
        op.create_index(
            "idx_referral_timeline_referral_created",
            "referral_timeline",
            ["referral_id", "created_at"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("idx_referral_timeline_referral_created", table_name="referral_timeline")
    op.drop_index("ix_referral_timeline_referral_id", table_name="referral_timeline")
    op.drop_index("ix_referral_timeline_id", table_name="referral_timeline")
    op.drop_table("referral_timeline")

    op.drop_column("referrals", "recommendation_text")
    op.drop_column("referrals", "outcome_summary")
    op.drop_column("referrals", "completed_at")
    op.drop_column("referrals", "accepted_at")
    op.drop_index("ix_referrals_feedback_status", table_name="referrals")
    op.drop_column("referrals", "feedback_status")
    op.drop_constraint("fk_referrals_referring_physician_id", "referrals", type_="foreignkey")
    op.drop_index("ix_referrals_referring_physician_id", table_name="referrals")
    op.drop_column("referrals", "referring_physician_id")

    op.drop_index("ix_specialists_deleted_at", table_name="specialists")
    op.drop_index("ix_specialists_institution_id", table_name="specialists")
    op.drop_index("ix_specialists_specialty", table_name="specialists")
    op.drop_index("ix_specialists_user_id", table_name="specialists")
    op.drop_index("ix_specialists_id", table_name="specialists")
    op.drop_table("specialists")

    op.execute("DROP TYPE IF EXISTS timeline_status_type")
    op.execute("DROP TYPE IF EXISTS feedback_status")
    op.execute("DROP TYPE IF EXISTS specialty")
