from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class MDTStatus(str, enum.Enum):
    OPEN = "OPEN"
    CONCLUDED = "CONCLUDED"


class MDTCase(Base):
    __tablename__ = "mdt_cases"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    submitted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    history_summary = Column(Text, nullable=False)
    discussion_status = Column(
        SAEnum(MDTStatus, name="mdt_status", create_type=False),
        nullable=False,
        default=MDTStatus.OPEN,
        index=True,
    )
    final_recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("Patient", back_populates="mdt_cases")
    submitted_by = relationship("User", back_populates="mdt_cases_submitted")
    comments = relationship("MDTComment", back_populates="case", order_by="MDTComment.created_at")


class MDTComment(Base):
    __tablename__ = "mdt_comments"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("mdt_cases.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    case = relationship("MDTCase", back_populates="comments")
    author = relationship("User", back_populates="mdt_comments")
