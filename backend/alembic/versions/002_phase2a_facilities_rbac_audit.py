"""add facilities rbac audit

Revision ID: 002_phase2a
Revises:
Create Date: 2026-06-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_phase2a"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_USER_ROLES = [
    "GASTROENTEROLOGIST",
    "HEPATOLOGIST",
    "REFERRING_PHYSICIAN",
    "RESEARCHER",
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE facility_type AS ENUM ('HOSPITAL', 'CLINIC', 'PRIVATE');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    if not inspector.has_table("facilities"):
        op.create_table(
        "facilities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("facility_name", sa.String(length=255), nullable=False),
        sa.Column(
            "facility_type",
            postgresql.ENUM("HOSPITAL", "CLINIC", "PRIVATE", name="facility_type", create_type=False),
            nullable=False,
        ),
        sa.Column("region", sa.String(length=100), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_facilities_id", "facilities", ["id"], unique=False)
        op.create_index("ix_facilities_facility_name", "facilities", ["facility_name"], unique=False)
        op.create_index("ix_facilities_facility_type", "facilities", ["facility_type"], unique=False)
        op.create_index("ix_facilities_region", "facilities", ["region"], unique=False)
        op.create_index("ix_facilities_city", "facilities", ["city"], unique=False)
        op.create_index("ix_facilities_deleted_at", "facilities", ["deleted_at"], unique=False)
        op.create_index("idx_facilities_region_city", "facilities", ["region", "city"], unique=False)

    for role_value in NEW_USER_ROLES:
        op.execute(f"ALTER TYPE user_role ADD VALUE IF NOT EXISTS '{role_value}'")

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "facility_id" not in user_columns:
        op.add_column("users", sa.Column("facility_id", sa.Integer(), nullable=True))
        op.create_index("ix_users_facility_id", "users", ["facility_id"], unique=False)
        op.create_foreign_key("fk_users_facility_id", "users", "facilities", ["facility_id"], ["id"])
    if "deleted_at" not in user_columns:
        op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        op.create_index("ix_users_deleted_at", "users", ["deleted_at"], unique=False)

    referral_columns = {col["name"] for col in inspector.get_columns("referrals")}
    if "facility_id" not in referral_columns:
        op.add_column("referrals", sa.Column("facility_id", sa.Integer(), nullable=True))
        op.create_index("ix_referrals_facility_id", "referrals", ["facility_id"], unique=False)
        op.create_foreign_key("fk_referrals_facility_id", "referrals", "facilities", ["facility_id"], ["id"])

    patient_columns = {col["name"] for col in inspector.get_columns("patients")}
    if "deleted_at" not in patient_columns:
        op.add_column("patients", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        op.create_index("ix_patients_deleted_at", "patients", ["deleted_at"], unique=False)

    if not inspector.has_table("audit_logs"):
        op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=100), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_audit_logs_id", "audit_logs", ["id"], unique=False)
        op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], unique=False)
        op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False)
        op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"], unique=False)
        op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"], unique=False)
        op.create_index("idx_audit_logs_resource", "audit_logs", ["resource_type", "resource_id"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_audit_logs_resource", table_name="audit_logs")
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_resource_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_patients_deleted_at", table_name="patients")
    op.drop_column("patients", "deleted_at")

    op.drop_constraint("fk_referrals_facility_id", "referrals", type_="foreignkey")
    op.drop_index("ix_referrals_facility_id", table_name="referrals")
    op.drop_column("referrals", "facility_id")

    op.drop_constraint("fk_users_facility_id", "users", type_="foreignkey")
    op.drop_index("ix_users_deleted_at", table_name="users")
    op.drop_index("ix_users_facility_id", table_name="users")
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "facility_id")

    op.drop_index("idx_facilities_region_city", table_name="facilities")
    op.drop_index("ix_facilities_deleted_at", table_name="facilities")
    op.drop_index("ix_facilities_city", table_name="facilities")
    op.drop_index("ix_facilities_region", table_name="facilities")
    op.drop_index("ix_facilities_facility_type", table_name="facilities")
    op.drop_index("ix_facilities_facility_name", table_name="facilities")
    op.drop_index("ix_facilities_id", table_name="facilities")
    op.drop_table("facilities")

    op.execute("DROP TYPE IF EXISTS facility_type")
