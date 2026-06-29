from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Date,
    ForeignKey,
    Enum as SAEnum,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class NetworkEntityType(str, enum.Enum):
    SPECIALIST = "SPECIALIST"
    FACILITY = "FACILITY"


class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class RegistryStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class MembershipStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class ApprovalStatus(str, enum.Enum):
    APPROVED_BY_GASLID = "APPROVED_BY_GASLID"
    PENDING_APPROVAL = "PENDING_APPROVAL"


class NetworkRegistry(Base):
    __tablename__ = "network_registry"

    id = Column(Integer, primary_key=True, index=True)

    registry_number = Column(String(100), unique=True, nullable=False, index=True)

    entity_type = Column(
        SAEnum(NetworkEntityType, name="network_entity_type", create_type=False),
        nullable=False,
        index=True,
    )

    specialist_id = Column(
        Integer,
        ForeignKey("specialists.id"),
        nullable=True,
        index=True,
    )

    facility_id = Column(
        Integer,
        ForeignKey("facilities.id"),
        nullable=True,
        index=True,
    )

    verification_status = Column(
        SAEnum(VerificationStatus, name="verification_status", create_type=False),
        nullable=False,
        default=VerificationStatus.PENDING,
        index=True,
    )

    registry_status = Column(
        SAEnum(RegistryStatus, name="registry_status", create_type=False),
        nullable=False,
        default=RegistryStatus.ACTIVE,
        index=True,
    )

    membership_status = Column(
        SAEnum(MembershipStatus, name="membership_status_network", create_type=False),
        nullable=False,
        default=MembershipStatus.ACTIVE,
        index=True,
    )

    approval_status = Column(
        SAEnum(ApprovalStatus, name="approval_status_network", create_type=False),
        nullable=False,
        default=ApprovalStatus.PENDING_APPROVAL,
        index=True,
    )

    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    expiry_date = Column(Date, nullable=True, index=True)

    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspension_reason = Column(Text, nullable=True)

    region = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (optional, for convenient joins)
    specialist = relationship("Specialist", foreign_keys=[specialist_id])
    facility = relationship("Facility", foreign_keys=[facility_id])
    approver = relationship("User", foreign_keys=[approved_by])

