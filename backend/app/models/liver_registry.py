from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum as SAEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class LiverDiagnosis(str, enum.Enum):
    HEP_B = "HEP_B"
    HEP_C = "HEP_C"
    CIRRHOSIS = "CIRRHOSIS"
    HCC = "HCC"


class LiverRiskFlag(str, enum.Enum):
    NORMAL = "NORMAL"
    OVERDUE = "OVERDUE"
    TREND_ALERT = "TREND_ALERT"


class LiverRegistry(Base):
    __tablename__ = "liver_registry"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False, index=True)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    diagnosis = Column(
        SAEnum(LiverDiagnosis, name="liver_diagnosis", create_type=False),
        nullable=False,
        index=True,
    )
    fibroscan_score = Column(Numeric(5, 2), nullable=True)
    viral_load = Column(Numeric(12, 2), nullable=True)
    afp = Column(Numeric(10, 2), nullable=True)
    alt = Column(Numeric(10, 2), nullable=True)
    ast = Column(Numeric(10, 2), nullable=True)
    ultrasound_date = Column(Date, nullable=True)
    next_review_date = Column(Date, nullable=False, index=True)
    risk_flag = Column(
        SAEnum(LiverRiskFlag, name="liver_risk_flag", create_type=False),
        nullable=False,
        default=LiverRiskFlag.NORMAL,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    patient = relationship("Patient", back_populates="liver_registry_entries")
    facility = relationship("Facility", back_populates="liver_registry_entries")
    recorder = relationship("User", back_populates="liver_registry_records")
