from sqlalchemy import Column, Integer, String, DateTime, Text, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ProcedureType(str, enum.Enum):
    GASTROSCOPY = "GASTROSCOPY"
    COLONOSCOPY = "COLONOSCOPY"
    ERCP = "ERCP"
    SIGMOIDOSCOPY = "SIGMOIDOSCOPY"


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False, index=True)
    procedure_type = Column(
        SAEnum(ProcedureType, name="procedure_type", create_type=False),
        nullable=False,
        index=True,
    )
    indication = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    impression = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    image_urls = Column(ARRAY(Text), nullable=False, server_default="{}")
    procedure_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    patient = relationship("Patient", back_populates="procedures")
    doctor = relationship("User", back_populates="procedures")
    facility = relationship("Facility", back_populates="procedures")
