from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.specialist import Specialty


class SpecialistCreate(BaseModel):
    specialty: Specialty
    subspecialties: List[str] = Field(default_factory=list)
    institution_id: int
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    is_public: bool = True


class SpecialistUpdate(BaseModel):
    specialty: Optional[Specialty] = None
    subspecialties: Optional[List[str]] = None
    institution_id: Optional[int] = None
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    is_public: Optional[bool] = None


class SpecialistUserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class SpecialistFacilityOut(BaseModel):
    id: int
    facility_name: str
    city: str
    region: str
    facility_type: str

    class Config:
        from_attributes = True


class SpecialistOut(BaseModel):
    id: int
    user_id: int
    specialty: Specialty
    subspecialties: List[str]
    institution_id: int
    phone: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    interests: List[str]
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[SpecialistUserOut] = None
    institution: Optional[SpecialistFacilityOut] = None

    class Config:
        from_attributes = True


class SpecialistDetail(SpecialistOut):
    pass
