from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class RegistryType(str, enum.Enum):
    HEPATITIS_B = "HEPATITIS_B"
    LIVER_CIRRHOSIS = "LIVER_CIRRHOSIS"
    ENDOSCOPY = "ENDOSCOPY"
    UPPER_GI_BLEEDING = "UPPER_GI_BLEEDING"
    COLORECTAL_CANCER = "COLORECTAL_CANCER"


class PatientRegistry(Base):
    __tablename__ = "patient_registries"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    registry_type = Column(
        SAEnum(RegistryType, name="registry_type", create_type=False),
        nullable=False,
        index=True,
    )
    source_table = Column(String(50), nullable=False)
    source_id = Column(Integer, nullable=False)
    tagged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("Patient", back_populates="registry_entries")

    __table_args__ = (
        UniqueConstraint("patient_id", "registry_type", "source_table", "source_id", name="uq_patient_registry_source"),
    )
