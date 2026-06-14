from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from app.models.membership import MembershipStatus


class MembershipCreate(BaseModel):
    renewal_date: Optional[date] = None


class MembershipUpdate(BaseModel):
    status: Optional[MembershipStatus] = None
    renewal_date: Optional[date] = None
    cpd_points_accumulated: Optional[Decimal] = None


class CPDUpdate(BaseModel):
    points_to_add: Decimal


class MembershipOut(BaseModel):
    id: int
    user_id: int
    status: MembershipStatus
    renewal_date: Optional[date] = None
    cpd_points_accumulated: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None
    member_name: Optional[str] = None
    member_email: Optional[str] = None
    member_role: Optional[str] = None

    class Config:
        from_attributes = True


class GuidelineOut(BaseModel):
    id: int
    title: str
    category: str
    published_date: str
    file_url: str
    description: Optional[str] = None


class ConferenceOut(BaseModel):
    id: int
    title: str
    location: str
    event_date: str
    deadline: Optional[str] = None
    description: Optional[str] = None
    registration_url: Optional[str] = None
    tags: List[str] = []
