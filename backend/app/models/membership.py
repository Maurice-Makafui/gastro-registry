from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class MembershipStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    EXPIRED = "EXPIRED"


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    status = Column(
        SAEnum(MembershipStatus, name="membership_status", create_type=False),
        nullable=False,
        default=MembershipStatus.PENDING,
        index=True,
    )
    renewal_date = Column(Date, nullable=True)
    cpd_points_accumulated = Column(Numeric(6, 1), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    member = relationship("User", back_populates="membership")
