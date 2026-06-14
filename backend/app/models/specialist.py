from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class Specialty(str, enum.Enum):
    GASTROENTEROLOGY = "GASTROENTEROLOGY"
    HEPATOLOGY = "HEPATOLOGY"
    GI_SURGERY = "GI_SURGERY"


class Specialist(Base):
    __tablename__ = "specialists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    specialty = Column(
        SAEnum(Specialty, name="specialty", create_type=False),
        nullable=False,
        index=True,
    )
    subspecialties = Column(ARRAY(Text), nullable=False, server_default="{}")
    institution_id = Column(Integer, ForeignKey("facilities.id"), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    interests = Column(ARRAY(Text), nullable=False, server_default="{}")
    is_public = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    user = relationship("User", back_populates="specialist_profile")
    institution = relationship("Facility", back_populates="specialists")
