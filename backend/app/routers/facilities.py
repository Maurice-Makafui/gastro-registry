from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.facility import FacilityType
from app.core.security import get_current_user
from app.core.rbac import require_permission
from app.core.audit import log_audit
from app.schemas.facility import (
    FacilityCreate,
    FacilityUpdate,
    FacilityOut,
    FacilityDetail,
    FacilityNetworkStats,
)
from app.services import facility_service

router = APIRouter(prefix="/facilities", tags=["Facilities"])


def _facility_to_out(facility) -> FacilityOut:
    return FacilityOut(
        id=facility.id,
        facility_name=facility.facility_name,
        facility_type=facility.facility_type,
        region=facility.region,
        city=facility.city,
        email=facility.email,
        phone=facility.phone,
        metadata=facility.metadata_json or {},
        is_active=facility.is_active,
        created_at=facility.created_at,
        updated_at=facility.updated_at,
    )


@router.get("/stats", response_model=FacilityNetworkStats)
def get_network_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:read")),
):
    return facility_service.get_network_stats(db)


@router.get("/", response_model=List[FacilityOut])
def list_facilities(
    region: Optional[str] = None,
    city: Optional[str] = None,
    facility_type: Optional[FacilityType] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:read")),
):
    facilities = facility_service.list_facilities(
        db,
        region=region,
        city=city,
        facility_type=facility_type,
        search=search,
        skip=skip,
        limit=limit,
    )
    return [_facility_to_out(f) for f in facilities]


@router.get("/{facility_id}", response_model=FacilityDetail)
def get_facility(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:read")),
):
    detail = facility_service.get_facility_detail(db, facility_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Facility not found")
    return detail


@router.post("/", response_model=FacilityOut, status_code=status.HTTP_201_CREATED)
def create_facility(
    payload: FacilityCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:write")),
):
    facility = facility_service.create_facility(db, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        resource_type="facility",
        resource_id=facility.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"facility_name": facility.facility_name},
    )
    return _facility_to_out(facility)


@router.put("/{facility_id}", response_model=FacilityOut)
def update_facility(
    facility_id: int,
    payload: FacilityUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:write")),
):
    facility = facility_service.get_facility_by_id(db, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    updated = facility_service.update_facility(db, facility, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="UPDATE",
        resource_type="facility",
        resource_id=facility_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=payload.model_dump(exclude_unset=True),
    )
    return _facility_to_out(updated)


@router.delete("/{facility_id}", response_model=FacilityOut)
def delete_facility(
    facility_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:delete")),
):
    facility = facility_service.get_facility_by_id(db, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    deleted = facility_service.soft_delete_facility(db, facility)
    log_audit(
        db,
        user_id=current_user.id,
        action="DELETE",
        resource_type="facility",
        resource_id=facility_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return _facility_to_out(deleted)
