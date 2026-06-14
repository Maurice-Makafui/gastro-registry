from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.models.procedure import ProcedureType
from app.schemas import PatientOut, UserOut


class ProcedureCreate(BaseModel):
    patient_id: int
    facility_id: int
    procedure_type: ProcedureType
    procedure_date: date
    indication: Optional[str] = None
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)


class ProcedureUpdate(BaseModel):
    procedure_type: Optional[ProcedureType] = None
    procedure_date: Optional[date] = None
    indication: Optional[str] = None
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    image_urls: Optional[List[str]] = None


class ProcedureFacilityOut(BaseModel):
    id: int
    facility_name: str
    city: str
    region: str

    class Config:
        from_attributes = True


class ProcedureOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    facility_id: int
    procedure_type: ProcedureType
    indication: Optional[str] = None
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    procedure_date: date
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient: Optional[PatientOut] = None
    doctor: Optional[UserOut] = None
    facility: Optional[ProcedureFacilityOut] = None

    class Config:
        from_attributes = True


class ProcedureTemplateOption(BaseModel):
    value: str
    label: str


class ProcedureTemplates(BaseModel):
    procedure_type: ProcedureType
    indications: List[ProcedureTemplateOption]
    common_findings: List[ProcedureTemplateOption]
    impressions: List[ProcedureTemplateOption]
    recommendations: List[ProcedureTemplateOption]
