"""add network registry for referral eligibility

Revision ID: 010_network_registry
Revises: 009_multidirectional_referral
Create Date: 2026-06-28
"""


from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql



revision: str = "010_network_registry"
down_revision: Union[str, None] = "009_multidirectional_referral"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "network_registry",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("registry_number", sa.String(length=100), nullable=False),

        # TEMP HOTFIX (2026-06-28): Avoid ANY SQLAlchemy enum type DDL during
        # migrations (this was crashing with psycopg.errors.DuplicateObject).
        # Keep enum logic disabled for now; rollback is easy.

        sa.Column(
            "entity_type",
            sa.String(length=20),
            nullable=False,
        ),


        sa.Column(
            "specialist_id",
            sa.Integer(),
            sa.ForeignKey("specialists.id"),
            nullable=True,
        ),
        sa.Column(
            "facility_id",
            sa.Integer(),
            sa.ForeignKey("facilities.id"),
            nullable=True,
        ),

        sa.Column(
            "verification_status",
            sa.Enum(
                "PENDING",
                "VERIFIED",
                "REJECTED",
                name="verification_status",
                create_type=False,
            ),
            nullable=False,
            server_default="PENDING",
        ),

        sa.Column(
            "registry_status",
            sa.Enum(
                "ACTIVE",
                "INACTIVE",
                "SUSPENDED",
                name="registry_status",
                create_type=False,
            ),
            nullable=False,
            server_default="ACTIVE",
        ),

        sa.Column(
            "membership_status",
            sa.Enum(
                "ACTIVE",
                "EXPIRED",
                "REVOKED",
                name="membership_status_network",
                create_type=False,
            ),
            nullable=False,
            server_default="ACTIVE",
        ),

        sa.Column(
            "approval_status",
            sa.Enum(
                "APPROVED_BY_GASLID",
                "PENDING_APPROVAL",
                name="approval_status_network",
                create_type=False,
            ),
            nullable=False,
            server_default="PENDING_APPROVAL",
        ),

        sa.Column(
            "approved_by",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),

        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("expiry_date", sa.Date()),
        sa.Column("suspended_at", sa.DateTime(timezone=True)),
        sa.Column("suspension_reason", sa.Text()),
        sa.Column("region", sa.String(100)),
        sa.Column("district", sa.String(100)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_unique_constraint(
        "uq_network_registry_registry_number",
        "network_registry",
        ["registry_number"],
    )

    op.create_index("ix_network_registry_entity_type", "network_registry", ["entity_type"])
    op.create_index("ix_network_registry_specialist_id", "network_registry", ["specialist_id"])
    op.create_index("ix_network_registry_facility_id", "network_registry", ["facility_id"])
    op.create_index("ix_network_registry_verification_status", "network_registry", ["verification_status"])
    op.create_index("ix_network_registry_registry_status", "network_registry", ["registry_status"])
    op.create_index("ix_network_registry_membership_status", "network_registry", ["membership_status"])
    op.create_index("ix_network_registry_approval_status", "network_registry", ["approval_status"])
    op.create_index("ix_network_registry_region", "network_registry", ["region"])
    op.create_index("ix_network_registry_district", "network_registry", ["district"])
    op.create_index("ix_network_registry_expiry_date", "network_registry", ["expiry_date"])


def downgrade() -> None:
    op.drop_index("ix_network_registry_expiry_date", table_name="network_registry")
    op.drop_index("ix_network_registry_district", table_name="network_registry")
    op.drop_index("ix_network_registry_region", table_name="network_registry")
    op.drop_index("ix_network_registry_approval_status", table_name="network_registry")
    op.drop_index("ix_network_registry_membership_status", table_name="network_registry")
    op.drop_index("ix_network_registry_registry_status", table_name="network_registry")
    op.drop_index("ix_network_registry_verification_status", table_name="network_registry")
    op.drop_index("ix_network_registry_facility_id", table_name="network_registry")
    op.drop_index("ix_network_registry_specialist_id", table_name="network_registry")
    op.drop_index("ix_network_registry_entity_type", table_name="network_registry")

    op.drop_constraint(
        "uq_network_registry_registry_number",
        "network_registry",
        type_="unique",
    )

    op.drop_table("network_registry")