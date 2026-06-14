from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.patient_registry import RegistryType


class PatientRegistryOut(BaseModel):
    id: int
    patient_id: int
    registry_type: RegistryType
    source_table: str
    source_id: int
    tagged_at: datetime
    patient_name: Optional[str] = None

    class Config:
        from_attributes = True
