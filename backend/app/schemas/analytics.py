from pydantic import BaseModel
from typing import List


class TimeSeriesPoint(BaseModel):
    label: str   # e.g. "2024-W23" or "Jun 2024"
    value: int


class NameValuePair(BaseModel):
    name: str
    value: int


class FacilityProcedureVolume(BaseModel):
    facility_id: int
    facility_name: str
    city: str
    GASTROSCOPY: int = 0
    COLONOSCOPY: int = 0
    ERCP: int = 0
    SIGMOIDOSCOPY: int = 0
    total: int = 0


class ReferralBottleneck(BaseModel):
    status: str
    count: int
    avg_age_days: float   # average time a referral has spent in this status


class DiseaseBurden(BaseModel):
    registry_type: str
    patient_count: int


class AnalyticsDashboard(BaseModel):
    # High-level KPIs (reused from legacy summary)
    total_patients: int
    total_referrals: int
    total_procedures: int
    total_liver_records: int
    # Trend: last 12 weeks
    referral_trend: List[TimeSeriesPoint]
    # Facility performance
    facility_procedure_volumes: List[FacilityProcedureVolume]
    # Referral pipeline
    referral_bottlenecks: List[ReferralBottleneck]
    # Disease / registry distribution
    disease_burden: List[DiseaseBurden]
    # Liver diagnosis breakdown
    liver_diagnosis_breakdown: List[NameValuePair]
    # Risk distribution
    risk_distribution: List[NameValuePair]
    # Procedure type breakdown
    procedure_type_breakdown: List[NameValuePair]
