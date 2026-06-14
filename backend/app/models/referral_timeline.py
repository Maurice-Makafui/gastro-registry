from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class TimelineStatusType(str, enum.Enum):
    WORKFLOW = "WORKFLOW"
    FEEDBACK = "FEEDBACK"


class ReferralTimeline(Base):
    __tablename__ = "referral_timeline"

    id = Column(Integer, primary_key=True, index=True)
    referral_id = Column(
        Integer,
        ForeignKey("referrals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    status_type = Column(
        SAEnum(TimelineStatusType, name="timeline_status_type", create_type=False),
        nullable=False,
    )
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    referral = relationship("Referral", back_populates="timeline_entries")
    actor = relationship("User", back_populates="referral_timeline_actions")
