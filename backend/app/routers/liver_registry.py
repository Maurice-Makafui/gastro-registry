from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.liver_registry import LiverDiagnosis, LiverRiskFlag
from app.core.rbac import require_permission
from app.core.audit import log_audit
from app.schemas.liver_registry import (
    LiverRegistryCreate,
    LiverRegistryUpdate,
    LiverRegistryOut,
    LiverRegistryScanResult,
    LiverRegistryAlertSummary,
)
from app.services import liver_registry_service

router = APIRouter(prefix="/liver-registry", tags=["Chronic Liver Disease Registry"])


@router.get("/alerts", response_model=LiverRegistryAlertSummary)
def get_liver_registry_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("liver_registry:read")),
):
    summary = liver_registry_service.get_alert_summary(db)
    return LiverRegistryAlertSummary(**summary)


@router.post("/scan", response_model=LiverRegistryScanResult)
def trigger_cld_risk_scan(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("liver_registry:scan")),
):
    result = liver_registry_service.run_risk_scan(db)
    log_audit(
        db,
        user_id=current_user.id,
        action="SCAN",
        resource_type="liver_registry",
        resource_id=None,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=result.model_dump(),
    )
    return result


@router.get("/", response_model=List[LiverRegistryOut])
def list_liver_registry(
    patient_id: Optional[int] = None,
    diagnosis: Optional[LiverDiagnosis] = None,
    risk_flag: Optional[LiverRiskFlag] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("liver_registry:read")),
):
    return liver_registry_service.list_liver_registry(
        db,
        patient_id=patient_id,
        diagnosis=diagnosis,
        risk_flag=risk_flag,
        skip=skip,
        limit=limit,
    )


@router.get("/{record_id}", response_model=LiverRegistryOut)
def get_liver_registry_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("liver_registry:read")),
):
    record = liver_registry_service.get_liver_registry_by_id(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Liver registry record not found")
    return record


@router.post("/", response_model=LiverRegistryOut, status_code=status.HTTP_201_CREATED)
def create_liver_registry_record(
    payload: LiverRegistryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("liver_registry:write")),
):
    record = liver_registry_service.create_liver_registry(db, current_user, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        resource_type="liver_registry",
        resource_id=record.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"diagnosis": payload.diagnosis.value, "patient_id": payload.patient_id},
    )
    return record


@router.put("/{record_id}", response_model=LiverRegistryOut)
def update_liver_registry_record(
    record_id: int,
    payload: LiverRegistryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("liver_registry:write")),
):
    record = liver_registry_service.get_liver_registry_by_id(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Liver registry record not found")
    updated = liver_registry_service.update_liver_registry(db, record, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="UPDATE",
        resource_type="liver_registry",
        resource_id=record_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=payload.model_dump(exclude_unset=True),
    )
    return updated
