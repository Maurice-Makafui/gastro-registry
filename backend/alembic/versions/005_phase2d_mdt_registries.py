"""add mdt board and auto registries

Revision ID: 005_phase2d
Revises: 004_phase2c
Create Date: 2026-06-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_phase2d"
down_revision: Union[str, None] = "004_phase2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE mdt_status AS ENUM ('OPEN', 'CONCLUDED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE registry_type AS ENUM (
                'HEPATITIS_B', 'LIVER_CIRRHOSIS', 'ENDOSCOPY',
                'UPPER_GI_BLEEDING', 'COLORECTAL_CANCER'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    if not inspector.has_table("mdt_cases"):
        op.create_table(
            "mdt_cases",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("patient_id", sa.Integer(), nullable=False),
            sa.Column("submitted_by_user_id", sa.Integer(), nullable=False),
            sa.Column("history_summary", sa.Text(), nullable=False),
            sa.Column(
                "discussion_status",
                sa.Enum("OPEN", "CONCLUDED", name="mdt_status", create_type=False),
                nullable=False,
                server_default="OPEN",
            ),
            sa.Column("final_recommendation", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
            sa.ForeignKeyConstraint(["submitted_by_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_mdt_cases_id", "mdt_cases", ["id"], unique=False)
        op.create_index("ix_mdt_cases_patient_id", "mdt_cases", ["patient_id"], unique=False)
        op.create_index("ix_mdt_cases_submitted_by_user_id", "mdt_cases", ["submitted_by_user_id"], unique=False)
        op.create_index("ix_mdt_cases_discussion_status", "mdt_cases", ["discussion_status"], unique=False)

    if not inspector.has_table("mdt_comments"):
        op.create_table(
            "mdt_comments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("case_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("comment_text", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["case_id"], ["mdt_cases.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_mdt_comments_id", "mdt_comments", ["id"], unique=False)
        op.create_index("ix_mdt_comments_case_id", "mdt_comments", ["case_id"], unique=False)
        op.create_index("ix_mdt_comments_user_id", "mdt_comments", ["user_id"], unique=False)

    if not inspector.has_table("patient_registries"):
        op.create_table(
            "patient_registries",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("patient_id", sa.Integer(), nullable=False),
            sa.Column(
                "registry_type",
                sa.Enum(
                    "HEPATITIS_B", "LIVER_CIRRHOSIS", "ENDOSCOPY",
                    "UPPER_GI_BLEEDING", "COLORECTAL_CANCER",
                    name="registry_type", create_type=False,
                ),
                nullable=False,
            ),
            sa.Column("source_table", sa.String(50), nullable=False),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("tagged_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "patient_id", "registry_type", "source_table", "source_id",
                name="uq_patient_registry_source",
            ),
        )
        op.create_index("ix_patient_registries_id", "patient_registries", ["id"], unique=False)
        op.create_index("ix_patient_registries_patient_id", "patient_registries", ["patient_id"], unique=False)
        op.create_index("ix_patient_registries_registry_type", "patient_registries", ["registry_type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_patient_registries_registry_type", table_name="patient_registries")
    op.drop_index("ix_patient_registries_patient_id", table_name="patient_registries")
    op.drop_index("ix_patient_registries_id", table_name="patient_registries")
    op.drop_table("patient_registries")

    op.drop_index("ix_mdt_comments_user_id", table_name="mdt_comments")
    op.drop_index("ix_mdt_comments_case_id", table_name="mdt_comments")
    op.drop_index("ix_mdt_comments_id", table_name="mdt_comments")
    op.drop_table("mdt_comments")

    op.drop_index("ix_mdt_cases_discussion_status", table_name="mdt_cases")
    op.drop_index("ix_mdt_cases_submitted_by_user_id", table_name="mdt_cases")
    op.drop_index("ix_mdt_cases_patient_id", table_name="mdt_cases")
    op.drop_index("ix_mdt_cases_id", table_name="mdt_cases")
    op.drop_table("mdt_cases")

    op.execute("DROP TYPE IF EXISTS registry_type")
    op.execute("DROP TYPE IF EXISTS mdt_status")
