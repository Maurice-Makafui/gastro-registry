from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    sex = Column(String(10), nullable=False)  # 'MALE' | 'FEMALE' | 'OTHER'
    phone = Column(String(20), nullable=True)
    ghana_card = Column(String(50), nullable=True, unique=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    medical_history = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Relationships
    referrals = relationship("Referral", back_populates="patient")
    followups = relationship("FollowUp", back_populates="patient")
    procedures = relationship("Procedure", back_populates="patient")
    liver_registry_entries = relationship("LiverRegistry", back_populates="patient")
    mdt_cases = relationship("MDTCase", back_populates="patient")
    registry_entries = relationship("PatientRegistry", back_populates="patient")
