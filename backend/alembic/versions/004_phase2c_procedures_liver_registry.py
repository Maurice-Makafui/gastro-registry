"""add procedures and liver registry

Revision ID: 004_phase2c
Revises: 003_phase2b
Create Date: 2026-06-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004_phase2c"
down_revision: Union[str, None] = "003_phase2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE procedure_type AS ENUM ('GASTROSCOPY', 'COLONOSCOPY', 'ERCP', 'SIGMOIDOSCOPY');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE liver_diagnosis AS ENUM ('HEP_B', 'HEP_C', 'CIRRHOSIS', 'HCC');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE liver_risk_flag AS ENUM ('NORMAL', 'OVERDUE', 'TREND_ALERT');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    if not inspector.has_table("procedures"):
        op.create_table(
            "procedures",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("patient_id", sa.Integer(), nullable=False),
            sa.Column("doctor_id", sa.Integer(), nullable=False),
            sa.Column("facility_id", sa.Integer(), nullable=False),
            sa.Column(
                "procedure_type",
                postgresql.ENUM(
                    "GASTROSCOPY",
                    "COLONOSCOPY",
                    "ERCP",
                    "SIGMOIDOSCOPY",
                    name="procedure_type",
                    create_type=False,
                ),
                nullable=False,
            ),
            sa.Column("indication", sa.Text(), nullable=True),
            sa.Column("findings", sa.Text(), nullable=True),
            sa.Column("impression", sa.Text(), nullable=True),
            sa.Column("recommendation", sa.Text(), nullable=True),
            sa.Column("image_urls", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
            sa.Column("procedure_date", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["doctor_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"]),
            sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_procedures_id", "procedures", ["id"], unique=False)
        op.create_index("ix_procedures_patient_id", "procedures", ["patient_id"], unique=False)
        op.create_index("ix_procedures_doctor_id", "procedures", ["doctor_id"], unique=False)
        op.create_index("ix_procedures_facility_id", "procedures", ["facility_id"], unique=False)
        op.create_index("ix_procedures_procedure_type", "procedures", ["procedure_type"], unique=False)
        op.create_index("ix_procedures_procedure_date", "procedures", ["procedure_date"], unique=False)
        op.create_index("ix_procedures_deleted_at", "procedures", ["deleted_at"], unique=False)
        op.create_index(
            "idx_procedures_patient_date",
            "procedures",
            ["patient_id", "procedure_date"],
            unique=False,
        )

    if not inspector.has_table("liver_registry"):
        op.create_table(
            "liver_registry",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("patient_id", sa.Integer(), nullable=False),
            sa.Column("facility_id", sa.Integer(), nullable=False),
            sa.Column("recorded_by", sa.Integer(), nullable=False),
            sa.Column(
                "diagnosis",
                postgresql.ENUM(
                    "HEP_B",
                    "HEP_C",
                    "CIRRHOSIS",
                    "HCC",
                    name="liver_diagnosis",
                    create_type=False,
                ),
                nullable=False,
            ),
            sa.Column("fibroscan_score", sa.Numeric(5, 2), nullable=True),
            sa.Column("viral_load", sa.Numeric(12, 2), nullable=True),
            sa.Column("afp", sa.Numeric(10, 2), nullable=True),
            sa.Column("alt", sa.Numeric(10, 2), nullable=True),
            sa.Column("ast", sa.Numeric(10, 2), nullable=True),
            sa.Column("ultrasound_date", sa.Date(), nullable=True),
            sa.Column("next_review_date", sa.Date(), nullable=False),
            sa.Column(
                "risk_flag",
                postgresql.ENUM(
                    "NORMAL",
                    "OVERDUE",
                    "TREND_ALERT",
                    name="liver_risk_flag",
                    create_type=False,
                ),
                server_default="NORMAL",
                nullable=False,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["facility_id"], ["facilities.id"]),
            sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
            sa.ForeignKeyConstraint(["recorded_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_liver_registry_id", "liver_registry", ["id"], unique=False)
        op.create_index("ix_liver_registry_patient_id", "liver_registry", ["patient_id"], unique=False)
        op.create_index("ix_liver_registry_facility_id", "liver_registry", ["facility_id"], unique=False)
        op.create_index("ix_liver_registry_diagnosis", "liver_registry", ["diagnosis"], unique=False)
        op.create_index("ix_liver_registry_next_review_date", "liver_registry", ["next_review_date"], unique=False)
        op.create_index("ix_liver_registry_risk_flag", "liver_registry", ["risk_flag"], unique=False)
        op.create_index("ix_liver_registry_deleted_at", "liver_registry", ["deleted_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_liver_registry_deleted_at", table_name="liver_registry")
    op.drop_index("ix_liver_registry_risk_flag", table_name="liver_registry")
    op.drop_index("ix_liver_registry_next_review_date", table_name="liver_registry")
    op.drop_index("ix_liver_registry_diagnosis", table_name="liver_registry")
    op.drop_index("ix_liver_registry_facility_id", table_name="liver_registry")
    op.drop_index("ix_liver_registry_patient_id", table_name="liver_registry")
    op.drop_index("ix_liver_registry_id", table_name="liver_registry")
    op.drop_table("liver_registry")

    op.drop_index("idx_procedures_patient_date", table_name="procedures")
    op.drop_index("ix_procedures_deleted_at", table_name="procedures")
    op.drop_index("ix_procedures_procedure_date", table_name="procedures")
    op.drop_index("ix_procedures_procedure_type", table_name="procedures")
    op.drop_index("ix_procedures_facility_id", table_name="procedures")
    op.drop_index("ix_procedures_doctor_id", table_name="procedures")
    op.drop_index("ix_procedures_patient_id", table_name="procedures")
    op.drop_index("ix_procedures_id", table_name="procedures")
    op.drop_table("procedures")

    op.execute("DROP TYPE IF EXISTS liver_risk_flag")
    op.execute("DROP TYPE IF EXISTS liver_diagnosis")
    op.execute("DROP TYPE IF EXISTS procedure_type")
