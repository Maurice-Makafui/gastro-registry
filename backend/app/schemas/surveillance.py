from pydantic import BaseModel
from typing import List, Optional


class SurveillanceKPIs(BaseModel):
    total_liver_cases: int
    total_gi_bleeding_cases: int
    total_hcc_cases: int
    total_procedures: int
    missed_followups: int
    pending_referrals: int
    avg_referral_delay_days: float
    endoscopy_completion_rate: float  # 0-100 %


class DiseaseTrendPoint(BaseModel):
    period: str          # e.g. "2024-W23"
    hep_b: int
    hep_c: int
    cirrhosis: int
    hcc: int
    gi_bleeding: int


class FacilityLoad(BaseModel):
    facility_id: int
    facility_name: str
    region: str
    city: str
    referral_count: int
    procedure_count: int
    liver_case_count: int
    specialist_count: int


class RegionalBurden(BaseModel):
    region: str
    hep_b: int
    hep_c: int
    cirrhosis: int
    hcc: int
    total_cases: int


class ReferralFlowEdge(BaseModel):
    source_facility: str
    target_facility: str
    count: int


class SurveillanceDashboard(BaseModel):
    kpis: SurveillanceKPIs
    disease_trend: List[DiseaseTrendPoint]       # last 12 weeks
    facility_loads: List[FacilityLoad]
    regional_burden: List[RegionalBurden]
    referral_flows: List[ReferralFlowEdge]
    risk_flag_counts: dict                       # NORMAL / OVERDUE / TREND_ALERT


class UserAdminOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str] = None
    facility_id: Optional[int] = None
    facility_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    role: str


class UserActiveToggle(BaseModel):
    is_active: bool
