from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diagnosis = Column(Text, nullable=True)
    icd_code = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    investigations_ordered = Column(JSON, nullable=True)
    outcome = Column(String(100), nullable=True)  # 'ADMITTED', 'DISCHARGED', 'REFERRED', 'FOLLOW_UP'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    referral = relationship("Referral", back_populates="consultations")
    doctor = relationship("User", back_populates="consultations")
