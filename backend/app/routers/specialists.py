from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.specialist import Specialty
from app.core.security import get_current_user
from app.core.rbac import require_permission, is_specialist
from app.core.audit import log_audit
from app.schemas.specialist import (
    SpecialistCreate,
    SpecialistUpdate,
    SpecialistOut,
    SpecialistDetail,
)
from app.services import specialist_service

router = APIRouter(prefix="/specialists", tags=["Specialist Directory"])


@router.get("/", response_model=List[SpecialistOut])
def list_specialists(
    search: Optional[str] = None,
    specialty: Optional[Specialty] = None,
    institution_id: Optional[int] = None,
    subspecialty: Optional[str] = None,
    interest: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("specialists:read")),
):
    return specialist_service.list_specialists(
        db,
        search=search,
        specialty=specialty,
        institution_id=institution_id,
        subspecialty=subspecialty,
        interest=interest,
        skip=skip,
        limit=limit,
    )


@router.get("/me", response_model=SpecialistDetail)
def get_my_specialist_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_specialist(current_user) and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only specialists can have directory profiles")
    specialist = specialist_service.get_specialist_by_user_id(db, current_user.id)
    if not specialist:
        raise HTTPException(status_code=404, detail="Specialist profile not found")
    return specialist


@router.get("/{specialist_id}", response_model=SpecialistDetail)
def get_specialist(
    specialist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("specialists:read")),
):
    specialist = specialist_service.get_specialist_by_id(db, specialist_id)
    if not specialist:
        raise HTTPException(status_code=404, detail="Specialist not found")
    return specialist


@router.post("/", response_model=SpecialistOut, status_code=status.HTTP_201_CREATED)
def create_specialist_profile(
    payload: SpecialistCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("specialists:write")),
):
    if not is_specialist(current_user) and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only specialists can create directory profiles")

    try:
        specialist = specialist_service.create_specialist(db, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        resource_type="specialist",
        resource_id=specialist.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"specialty": payload.specialty.value},
    )
    return specialist


@router.put("/{specialist_id}", response_model=SpecialistOut)
def update_specialist_profile(
    specialist_id: int,
    payload: SpecialistUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("specialists:write")),
):
    from app.models.specialist import Specialist as SpecialistModel

    specialist = (
        db.query(SpecialistModel)
        .filter(SpecialistModel.id == specialist_id, SpecialistModel.deleted_at.is_(None))
        .first()
    )
    if not specialist:
        raise HTTPException(status_code=404, detail="Specialist not found")

    if specialist.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Can only update your own profile")

    updated = specialist_service.update_specialist(db, specialist, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="UPDATE",
        resource_type="specialist",
        resource_id=specialist_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=payload.model_dump(exclude_unset=True),
    )
    return specialist_service.get_specialist_by_id(db, updated.id) or updated
