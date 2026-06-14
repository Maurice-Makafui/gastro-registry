from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime
from app.models.facility import FacilityType


class FacilityCreate(BaseModel):
    facility_name: str = Field(..., min_length=2, max_length=255)
    facility_type: FacilityType
    region: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    metadata: dict[str, Any] = Field(default_factory=dict)


class FacilityUpdate(BaseModel):
    facility_name: Optional[str] = Field(None, min_length=2, max_length=255)
    facility_type: Optional[FacilityType] = None
    region: Optional[str] = Field(None, min_length=2, max_length=100)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    metadata: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None


class FacilityOut(BaseModel):
    id: int
    facility_name: str
    facility_type: FacilityType
    region: str
    city: str
    email: Optional[str] = None
    phone: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_json")
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class FacilityRosterMember(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class FacilityDetail(FacilityOut):
    specialist_count: int = 0
    referral_count: int = 0
    roster: list[FacilityRosterMember] = []


class FacilityNetworkStats(BaseModel):
    total_facilities: int
    active_facilities: int
    facilities_by_type: dict[str, int]
    facilities_by_region: dict[str, int]
    total_specialists: int
    total_referrals: int
