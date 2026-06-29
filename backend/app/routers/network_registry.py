"""Admin-facing GASLID network registry management endpoints."""
from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.facility import Facility
from app.models.specialist import Specialist
from app.models.network_registry import (
    NetworkRegistry,
    NetworkEntityType,
    VerificationStatus,
    RegistryStatus,
    MembershipStatus,
    ApprovalStatus,
)
from app.core.rbac import require_permission
from app.core.security import get_current_user
from app.core.audit import log_audit

router = APIRouter(prefix="/network-registry", tags=["Network Registry"])

_ADMIN_ROLES = {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN}


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    role = current_user.role if isinstance(current_user.role, UserRole) else UserRole(current_user.role)
    if role not in _ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegistryEntryCreate(BaseModel):
    entity_type: NetworkEntityType
    specialist_id: Optional[int] = None
    facility_id: Optional[int] = None
    registry_number: str
    region: Optional[str] = None
    district: Optional[str] = None
    expiry_date: Optional[date] = None


class RegistryEntryUpdate(BaseModel):
    registry_number: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    expiry_date: Optional[date] = None
    registry_status: Optional[RegistryStatus] = None
    membership_status: Optional[MembershipStatus] = None
    suspension_reason: Optional[str] = None


class ApprovePayload(BaseModel):
    expiry_date: Optional[date] = None


class RegistryEntryOut(BaseModel):
    id: int
    registry_number: str
    entity_type: NetworkEntityType
    specialist_id: Optional[int]
    facility_id: Optional[int]
    verification_status: VerificationStatus
    registry_status: RegistryStatus
    membership_status: MembershipStatus
    approval_status: ApprovalStatus
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    expiry_date: Optional[date]
    suspended_at: Optional[datetime]
    suspension_reason: Optional[str]
    region: Optional[str]
    district: Optional[str]
    created_at: datetime
    # denormalised labels
    facility_name: Optional[str] = None
    specialist_name: Optional[str] = None

    class Config:
        from_attributes = True


def _to_out(entry: NetworkRegistry) -> RegistryEntryOut:
    return RegistryEntryOut(
        id=entry.id,
        registry_number=entry.registry_number,
        entity_type=entry.entity_type,
        specialist_id=entry.specialist_id,
        facility_id=entry.facility_id,
        verification_status=entry.verification_status,
        registry_status=entry.registry_status,
        membership_status=entry.membership_status,
        approval_status=entry.approval_status,
        approved_by=entry.approved_by,
        approved_at=entry.approved_at,
        expiry_date=entry.expiry_date,
        suspended_at=entry.suspended_at,
        suspension_reason=entry.suspension_reason,
        region=entry.region,
        district=entry.district,
        created_at=entry.created_at,
        facility_name=entry.facility.facility_name if entry.facility else None,
        specialist_name=entry.specialist.user.name if (entry.specialist and entry.specialist.user) else None,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[RegistryEntryOut])
def list_entries(
    entity_type: Optional[NetworkEntityType] = Query(None),
    approval_status: Optional[ApprovalStatus] = Query(None),
    registry_status: Optional[RegistryStatus] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:read")),
):
    q = (
        db.query(NetworkRegistry)
        .options(
            joinedload(NetworkRegistry.facility),
            joinedload(NetworkRegistry.specialist).joinedload(Specialist.user),
        )
    )
    if entity_type:
        q = q.filter(NetworkRegistry.entity_type == entity_type)
    if approval_status:
        q = q.filter(NetworkRegistry.approval_status == approval_status)
    if registry_status:
        q = q.filter(NetworkRegistry.registry_status == registry_status)
    return [_to_out(e) for e in q.order_by(NetworkRegistry.created_at.desc()).offset(skip).limit(limit).all()]


@router.post("/", response_model=RegistryEntryOut, status_code=201)
def create_entry(
    payload: RegistryEntryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    # validate target exists
    if payload.entity_type == NetworkEntityType.FACILITY:
        if not payload.facility_id:
            raise HTTPException(status_code=400, detail="facility_id required for FACILITY entry")
        if not db.query(Facility).filter(Facility.id == payload.facility_id, Facility.deleted_at.is_(None)).first():
            raise HTTPException(status_code=404, detail="Facility not found")
    else:
        if not payload.specialist_id:
            raise HTTPException(status_code=400, detail="specialist_id required for SPECIALIST entry")
        if not db.query(Specialist).filter(Specialist.id == payload.specialist_id, Specialist.deleted_at.is_(None)).first():
            raise HTTPException(status_code=404, detail="Specialist not found")

    # prevent duplicates
    dup = db.query(NetworkRegistry).filter(
        NetworkRegistry.entity_type == payload.entity_type,
        NetworkRegistry.facility_id == payload.facility_id if payload.entity_type == NetworkEntityType.FACILITY else NetworkRegistry.specialist_id == payload.specialist_id,
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="Registry entry already exists for this entity")

    entry = NetworkRegistry(
        registry_number=payload.registry_number,
        entity_type=payload.entity_type,
        specialist_id=payload.specialist_id,
        facility_id=payload.facility_id,
        region=payload.region,
        district=payload.district,
        expiry_date=payload.expiry_date,
        verification_status=VerificationStatus.PENDING,
        registry_status=RegistryStatus.ACTIVE,
        membership_status=MembershipStatus.ACTIVE,
        approval_status=ApprovalStatus.PENDING_APPROVAL,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    log_audit(db, user_id=current_user.id, action="registry_entry_created",
              resource_type="network_registry", resource_id=entry.id,
              ip_address=request.client.host if request.client else None,
              user_agent=request.headers.get("user-agent"),
              details={"entity_type": payload.entity_type, "registry_number": payload.registry_number})
    return _to_out(entry)


@router.post("/{entry_id}/approve", response_model=RegistryEntryOut)
def approve_entry(
    entry_id: int,
    payload: ApprovePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    entry = db.query(NetworkRegistry).filter(NetworkRegistry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Registry entry not found")

    entry.verification_status = VerificationStatus.VERIFIED
    entry.approval_status = ApprovalStatus.APPROVED_BY_GASLID
    entry.registry_status = RegistryStatus.ACTIVE
    entry.membership_status = MembershipStatus.ACTIVE
    entry.approved_by = current_user.id
    entry.approved_at = datetime.now(timezone.utc)
    if payload.expiry_date:
        entry.expiry_date = payload.expiry_date

    db.commit()
    db.refresh(entry)
    log_audit(db, user_id=current_user.id, action="registry_entry_approved",
              resource_type="network_registry", resource_id=entry_id,
              ip_address=request.client.host if request.client else None,
              user_agent=request.headers.get("user-agent"))
    return _to_out(entry)


@router.post("/{entry_id}/suspend", response_model=RegistryEntryOut)
def suspend_entry(
    entry_id: int,
    request: Request,
    suspension_reason: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    entry = db.query(NetworkRegistry).filter(NetworkRegistry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Registry entry not found")

    entry.registry_status = RegistryStatus.SUSPENDED
    entry.suspended_at = datetime.now(timezone.utc)
    entry.suspension_reason = suspension_reason
    db.commit()
    db.refresh(entry)
    log_audit(db, user_id=current_user.id, action="registry_entry_suspended",
              resource_type="network_registry", resource_id=entry_id,
              ip_address=request.client.host if request.client else None,
              user_agent=request.headers.get("user-agent"),
              details={"reason": suspension_reason})
    return _to_out(entry)


@router.patch("/{entry_id}", response_model=RegistryEntryOut)
def update_entry(
    entry_id: int,
    payload: RegistryEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    entry = db.query(NetworkRegistry).filter(NetworkRegistry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Registry entry not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return _to_out(entry)
