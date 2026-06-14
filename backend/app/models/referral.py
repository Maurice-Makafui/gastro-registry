from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ReferralStatus(str, enum.Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REFERRED_OUT = "REFERRED_OUT"


class FeedbackStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    referring_physician_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_facility = Column(String(255), nullable=True)
    symptoms = Column(JSON, nullable=False, default=list)
    vitals = Column(JSON, nullable=True)
    chief_complaint = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    risk_level = Column(SAEnum(RiskLevel), nullable=False, default=RiskLevel.LOW)
    status = Column(SAEnum(ReferralStatus), nullable=False, default=ReferralStatus.PENDING)
    feedback_status = Column(
        SAEnum(FeedbackStatus, name="feedback_status", create_type=False),
        nullable=False,
        default=FeedbackStatus.PENDING,
        index=True,
    )
    urgency = Column(String(50), nullable=True)
    assigned_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True, index=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    outcome_summary = Column(Text, nullable=True)
    recommendation_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("Patient", back_populates="referrals")
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="referrals_created")
    referring_physician = relationship("User", foreign_keys=[referring_physician_id])
    assigned_doctor = relationship("User", foreign_keys=[assigned_doctor_id])
    facility = relationship("Facility", back_populates="referrals")
    consultations = relationship("Consultation", back_populates="referral")
    timeline_entries = relationship(
        "ReferralTimeline",
        back_populates="referral",
        order_by="ReferralTimeline.created_at.desc()",
    )
