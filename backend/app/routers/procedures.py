from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.procedure import ProcedureType
from app.core.rbac import require_permission
from app.core.audit import log_audit
from app.schemas.procedure import (
    ProcedureCreate,
    ProcedureUpdate,
    ProcedureOut,
    ProcedureTemplates,
)
from app.services import procedure_service

router = APIRouter(prefix="/procedures", tags=["Endoscopy Procedures"])


@router.get("/templates/{procedure_type}", response_model=ProcedureTemplates)
def get_procedure_templates(
    procedure_type: ProcedureType,
    current_user: User = Depends(require_permission("procedures:read")),
):
    return procedure_service.get_procedure_templates(procedure_type)


@router.get("/", response_model=List[ProcedureOut])
def list_procedures(
    patient_id: Optional[int] = None,
    procedure_type: Optional[ProcedureType] = None,
    facility_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("procedures:read")),
):
    return procedure_service.list_procedures(
        db,
        patient_id=patient_id,
        procedure_type=procedure_type,
        facility_id=facility_id,
        skip=skip,
        limit=limit,
    )


@router.get("/{procedure_id}", response_model=ProcedureOut)
def get_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("procedures:read")),
):
    procedure = procedure_service.get_procedure_by_id(db, procedure_id)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return procedure


@router.post("/", response_model=ProcedureOut, status_code=status.HTTP_201_CREATED)
def create_procedure(
    payload: ProcedureCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("procedures:write")),
):
    procedure = procedure_service.create_procedure(db, current_user, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        resource_type="procedure",
        resource_id=procedure.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"procedure_type": payload.procedure_type.value, "patient_id": payload.patient_id},
    )
    return procedure


@router.put("/{procedure_id}", response_model=ProcedureOut)
def update_procedure(
    procedure_id: int,
    payload: ProcedureUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("procedures:write")),
):
    procedure = procedure_service.get_procedure_by_id(db, procedure_id)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    updated = procedure_service.update_procedure(db, procedure, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="UPDATE",
        resource_type="procedure",
        resource_id=procedure_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=payload.model_dump(exclude_unset=True),
    )
    return updated


@router.delete("/{procedure_id}", response_model=ProcedureOut)
def delete_procedure(
    procedure_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("procedures:write")),
):
    procedure = procedure_service.get_procedure_by_id(db, procedure_id)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    deleted = procedure_service.soft_delete_procedure(db, procedure)
    log_audit(
        db,
        user_id=current_user.id,
        action="DELETE",
        resource_type="procedure",
        resource_id=procedure_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return deleted
