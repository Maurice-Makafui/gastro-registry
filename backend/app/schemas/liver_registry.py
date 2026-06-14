from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from app.models.liver_registry import LiverDiagnosis, LiverRiskFlag
from app.schemas import PatientOut, UserOut


class LiverRegistryCreate(BaseModel):
    patient_id: int
    facility_id: int
    diagnosis: LiverDiagnosis
    fibroscan_score: Optional[Decimal] = Field(None, ge=0, le=75)
    viral_load: Optional[Decimal] = Field(None, ge=0)
    afp: Optional[Decimal] = Field(None, ge=0)
    alt: Optional[Decimal] = Field(None, ge=0)
    ast: Optional[Decimal] = Field(None, ge=0)
    ultrasound_date: Optional[date] = None
    next_review_date: date


class LiverRegistryUpdate(BaseModel):
    diagnosis: Optional[LiverDiagnosis] = None
    fibroscan_score: Optional[Decimal] = Field(None, ge=0, le=75)
    viral_load: Optional[Decimal] = Field(None, ge=0)
    afp: Optional[Decimal] = Field(None, ge=0)
    alt: Optional[Decimal] = Field(None, ge=0)
    ast: Optional[Decimal] = Field(None, ge=0)
    ultrasound_date: Optional[date] = None
    next_review_date: Optional[date] = None


class LiverRegistryOut(BaseModel):
    id: int
    patient_id: int
    facility_id: int
    recorded_by: int
    diagnosis: LiverDiagnosis
    fibroscan_score: Optional[Decimal] = None
    viral_load: Optional[Decimal] = None
    afp: Optional[Decimal] = None
    alt: Optional[Decimal] = None
    ast: Optional[Decimal] = None
    ultrasound_date: Optional[date] = None
    next_review_date: date
    risk_flag: LiverRiskFlag
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient: Optional[PatientOut] = None
    recorder: Optional[UserOut] = None

    class Config:
        from_attributes = True


class LiverRegistryScanResult(BaseModel):
    scanned_records: int
    overdue_count: int
    trend_alert_count: int
    normal_count: int


class LiverRegistryAlertSummary(BaseModel):
    total_alerts: int
    overdue_count: int
    trend_alert_count: int
    alerts: List[LiverRegistryOut]
