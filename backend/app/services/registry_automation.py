"""
Registry Automation Service
============================
Uses SQLAlchemy event listeners (after_insert / after_update) to automatically
tag patients into clinical registries based on their diagnostic data.

Registries handled:
  - HEPATITIS_B      ← liver_registry.diagnosis == HEP_B
  - LIVER_CIRRHOSIS  ← liver_registry.diagnosis == CIRRHOSIS
  - ENDOSCOPY        ← any new procedure row
  - UPPER_GI_BLEEDING← procedures.findings/impression contain bleeding keywords
  - COLORECTAL_CANCER← colonoscopy findings/impression contain tumour keywords
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models.liver_registry import LiverDiagnosis, LiverRegistry
from app.models.patient_registry import PatientRegistry, RegistryType
from app.models.procedure import Procedure, ProcedureType

logger = logging.getLogger(__name__)

# ── keyword sets (lower-cased) ────────────────────────────────────────────────
_UGI_KEYWORDS = {"bleeding", "ulcer", "varices", "haematemesis", "hematemesis", "melena", "melaena"}
_CRC_KEYWORDS = {"mass", "tumor", "tumour", "adenocarcinoma", "polyp", "carcinoma", "neoplasm"}


def _upsert_registry(session: Session, patient_id: int, registry_type: RegistryType,
                     source_table: str, source_id: int) -> None:
    """Insert a registry tag only if it doesn't already exist for this exact source row."""
    exists = (
        session.query(PatientRegistry)
        .filter_by(
            patient_id=patient_id,
            registry_type=registry_type,
            source_table=source_table,
            source_id=source_id,
        )
        .first()
    )
    if not exists:
        entry = PatientRegistry(
            patient_id=patient_id,
            registry_type=registry_type,
            source_table=source_table,
            source_id=source_id,
        )
        session.add(entry)
        logger.info(
            "Auto-registry: patient %s tagged → %s (source %s#%s)",
            patient_id, registry_type.value, source_table, source_id,
        )


def _contains_any(text: Optional[str], keywords: set[str]) -> bool:
    if not text:
        return False
    lower = text.lower()
    return any(kw in lower for kw in keywords)


# ── LiverRegistry listeners ───────────────────────────────────────────────────

def _on_liver_registry_write(mapper, connection, target: LiverRegistry) -> None:  # noqa: ARG001
    """Fired after INSERT or UPDATE on liver_registry."""
    session: Session = Session.object_session(target)
    if session is None:
        return

    diagnosis = target.diagnosis
    if diagnosis == LiverDiagnosis.HEP_B:
        _upsert_registry(session, target.patient_id, RegistryType.HEPATITIS_B, "liver_registry", target.id)
    elif diagnosis == LiverDiagnosis.CIRRHOSIS:
        _upsert_registry(session, target.patient_id, RegistryType.LIVER_CIRRHOSIS, "liver_registry", target.id)


# ── Procedure listeners ───────────────────────────────────────────────────────

def _on_procedure_write(mapper, connection, target: Procedure) -> None:  # noqa: ARG001
    """Fired after INSERT or UPDATE on procedures."""
    session: Session = Session.object_session(target)
    if session is None:
        return

    # Every procedure → Endoscopy Registry
    _upsert_registry(session, target.patient_id, RegistryType.ENDOSCOPY, "procedures", target.id)

    combined_text = f"{target.findings or ''} {target.impression or ''}"

    # Upper GI Bleeding Registry
    if _contains_any(combined_text, _UGI_KEYWORDS):
        _upsert_registry(session, target.patient_id, RegistryType.UPPER_GI_BLEEDING, "procedures", target.id)

    # Colorectal Cancer Registry — Colonoscopy only
    if target.procedure_type == ProcedureType.COLONOSCOPY and _contains_any(combined_text, _CRC_KEYWORDS):
        _upsert_registry(session, target.patient_id, RegistryType.COLORECTAL_CANCER, "procedures", target.id)


# ── Registration ──────────────────────────────────────────────────────────────

def register_registry_listeners() -> None:
    """
    Attach all event listeners.  Call once at application startup
    (before the first database session is used).
    """
    event.listen(LiverRegistry, "after_insert", _on_liver_registry_write)
    event.listen(LiverRegistry, "after_update", _on_liver_registry_write)
    event.listen(Procedure, "after_insert", _on_procedure_write)
    event.listen(Procedure, "after_update", _on_procedure_write)
    logger.info("Registry automation listeners registered.")
