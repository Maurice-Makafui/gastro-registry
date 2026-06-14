from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.referral import FeedbackStatus
from app.models.referral_timeline import TimelineStatusType
from app.schemas import UserOut


class ReferralTimelineOut(BaseModel):
    id: int
    referral_id: int
    actor_id: int
    from_status: Optional[str] = None
    to_status: str
    status_type: TimelineStatusType
    note: Optional[str] = None
    created_at: datetime
    actor: Optional[UserOut] = None

    class Config:
        from_attributes = True


class ReferralFeedbackAccept(BaseModel):
    note: Optional[str] = None


class ReferralFeedbackReject(BaseModel):
    note: str = Field(..., min_length=3, max_length=2000)


class ReferralFeedbackComplete(BaseModel):
    outcome_summary: str = Field(..., min_length=3, max_length=5000)
    recommendation_text: str = Field(..., min_length=3, max_length=5000)


class ReferralFeedbackOut(BaseModel):
    referral_id: int
    feedback_status: FeedbackStatus
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    outcome_summary: Optional[str] = None
    recommendation_text: Optional[str] = None
    referring_physician_id: Optional[int] = None
    timeline: List[ReferralTimelineOut] = []
