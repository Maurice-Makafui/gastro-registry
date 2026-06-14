from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    scheduled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    next_visit_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="SCHEDULED")  # SCHEDULED, COMPLETED, MISSED, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="followups")
