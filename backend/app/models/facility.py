from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class FacilityType(str, enum.Enum):
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    PRIVATE = "PRIVATE"


class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    facility_name = Column(String(255), nullable=False, index=True)
    facility_type = Column(
        SAEnum(FacilityType, name="facility_type", create_type=False),
        nullable=False,
        index=True,
    )
    region = Column(String(100), nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    metadata_json = Column("metadata", JSONB, nullable=False, server_default="{}")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    users = relationship("User", back_populates="facility")
    referrals = relationship("Referral", back_populates="facility")
    specialists = relationship("Specialist", back_populates="institution")
    procedures = relationship("Procedure", back_populates="facility")
    liver_registry_entries = relationship("LiverRegistry", back_populates="facility")
