from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime, date
from app.models.user import UserRole
from app.models.referral import ReferralStatus, RiskLevel, FeedbackStatus


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.NURSE
    department: Optional[str] = None
    phone: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    department: Optional[str] = None
    facility_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Patients ──────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    full_name: str
    age: int
    sex: str
    phone: Optional[str] = None
    ghana_card: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

    @field_validator("age")
    @classmethod
    def age_must_be_positive(cls, v):
        if v < 0 or v > 150:
            raise ValueError("Age must be between 0 and 150")
        return v

    @field_validator("sex")
    @classmethod
    def sex_must_be_valid(cls, v):
        if v.upper() not in ["MALE", "FEMALE", "OTHER"]:
            raise ValueError("Sex must be MALE, FEMALE, or OTHER")
        return v.upper()


class PatientOut(BaseModel):
    id: int
    full_name: str
    age: int
    sex: str
    phone: Optional[str] = None
    ghana_card: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PatientDetail(PatientOut):
    referrals: List["ReferralOut"] = []
    followups: List["FollowUpOut"] = []


# ── Vitals ────────────────────────────────────────────────────────────────────

class VitalsSchema(BaseModel):
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    respiratory_rate: Optional[int] = None


# ── Referrals ─────────────────────────────────────────────────────────────────

class ReferralCreate(BaseModel):
    patient_id: int
    source_facility: Optional[str] = None
    facility_id: Optional[int] = None
    referring_physician_id: Optional[int] = None
    symptoms: List[str]
    vitals: Optional[VitalsSchema] = None
    chief_complaint: Optional[str] = None
    clinical_notes: Optional[str] = None


class ReferralUpdate(BaseModel):
    status: Optional[ReferralStatus] = None
    assigned_doctor_id: Optional[int] = None
    clinical_notes: Optional[str] = None


class ReferralOut(BaseModel):
    id: int
    patient_id: int
    created_by: int
    referring_physician_id: Optional[int] = None
    source_facility: Optional[str] = None
    facility_id: Optional[int] = None
    symptoms: List[str]
    vitals: Optional[Any] = None
    chief_complaint: Optional[str] = None
    clinical_notes: Optional[str] = None
    risk_level: RiskLevel
    status: ReferralStatus
    feedback_status: FeedbackStatus = FeedbackStatus.PENDING
    urgency: Optional[str] = None
    assigned_doctor_id: Optional[int] = None
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    outcome_summary: Optional[str] = None
    recommendation_text: Optional[str] = None
    created_at: datetime
    patient: Optional[PatientOut] = None
    assigned_doctor: Optional[UserOut] = None
    referring_physician: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── Consultations ─────────────────────────────────────────────────────────────

class ConsultationCreate(BaseModel):
    referral_id: int
    diagnosis: Optional[str] = None
    icd_code: Optional[str] = None
    notes: Optional[str] = None
    treatment_plan: Optional[str] = None
    investigations_ordered: Optional[List[str]] = None
    outcome: Optional[str] = None


class ConsultationOut(BaseModel):
    id: int
    referral_id: int
    doctor_id: int
    diagnosis: Optional[str] = None
    icd_code: Optional[str] = None
    notes: Optional[str] = None
    treatment_plan: Optional[str] = None
    investigations_ordered: Optional[List[str]] = None
    outcome: Optional[str] = None
    created_at: datetime
    doctor: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ── FollowUps ─────────────────────────────────────────────────────────────────

class FollowUpCreate(BaseModel):
    patient_id: int
    referral_id: Optional[int] = None
    next_visit_date: date
    reason: Optional[str] = None
    notes: Optional[str] = None


class FollowUpUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    next_visit_date: Optional[date] = None


class FollowUpOut(BaseModel):
    id: int
    patient_id: int
    referral_id: Optional[int] = None
    next_visit_date: date
    reason: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    patient: Optional[PatientOut] = None

    class Config:
        from_attributes = True


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_patients: int
    total_referrals: int
    pending_referrals: int
    high_risk_referrals: int
    medium_risk_referrals: int
    low_risk_referrals: int
    completed_referrals: int
    referrals_today: int
    upcoming_followups: int
    referrals_by_status: dict
    referrals_by_risk: dict
    recent_referrals: List[ReferralOut]


# Update forward references
TokenResponse.model_rebuild()
PatientDetail.model_rebuild()
