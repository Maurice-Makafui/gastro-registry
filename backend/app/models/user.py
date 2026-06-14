from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    NURSE = "NURSE"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"
    GASTROENTEROLOGIST = "GASTROENTEROLOGIST"
    HEPATOLOGIST = "HEPATOLOGIST"
    REFERRING_PHYSICIAN = "REFERRING_PHYSICIAN"
    RESEARCHER = "RESEARCHER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="user_role", create_type=False), nullable=False, default=UserRole.NURSE)
    department = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    facility = relationship("Facility", back_populates="users")
    specialist_profile = relationship("Specialist", back_populates="user", uselist=False)
    consultations = relationship("Consultation", back_populates="doctor")
    referrals_created = relationship("Referral", foreign_keys="Referral.created_by", back_populates="created_by_user")
    audit_logs = relationship("AuditLog", back_populates="user")
    referral_timeline_actions = relationship("ReferralTimeline", back_populates="actor")
    procedures = relationship("Procedure", back_populates="doctor")
    liver_registry_records = relationship("LiverRegistry", back_populates="recorder")
    mdt_cases_submitted = relationship("MDTCase", back_populates="submitted_by")
    mdt_comments = relationship("MDTComment", back_populates="author")
    membership = relationship("Membership", back_populates="member", uselist=False)
