from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.facility import Facility
from app.core.rbac import require_permission
from app.core.admin_user_guard import (
    can_manage_user,
    can_change_target_role,
    prevent_lockout_last_super_admin,
)
from app.core.security import get_password_hash
from app.core.audit import log_audit
from app.schemas import UserCreate

from app.schemas.surveillance import (
    UserAdminOut,
    UserRoleUpdate,
    UserActiveToggle,
)
from pydantic import BaseModel


router = APIRouter(prefix="/admin", tags=["Admin Users"])


class UserEdit(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    facility_id: Optional[int] = None


class FacilityListOut(BaseModel):
    id: int
    facility_name: str
    region: str
    city: str


def _user_to_out(user: User, facility_name: Optional[str]) -> UserAdminOut:
    return UserAdminOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        department=user.department,
        facility_id=user.facility_id,
        facility_name=facility_name,
        is_active=user.is_active,
    )


@router.get("/users", response_model=List[UserAdminOut])
def admin_list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:read")),
):
    # Reuse the same hierarchy policy as /surveillance/users GET
    actor_role = UserRole(current_user.role)

    q = db.query(User, Facility.facility_name).outerjoin(Facility, User.facility_id == Facility.id)
    q = q.filter(User.deleted_at.is_(None))

    if actor_role == UserRole.FACILITY_ADMIN:
        if current_user.facility_id is None:
            raise HTTPException(status_code=403, detail="Facility context missing")
        q = q.filter(User.facility_id == current_user.facility_id)

    q = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [
        _user_to_out(u, fname)
        for u, fname in q
    ]


@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    # Who can create what is enforced via can_change_target_role + can_manage_user on a synthetic target.
    # Minimal MVP-safe: block facility admin creating elevated roles.

    target_role = UserRole(payload.role)

    # Create a transient target_user object for rule checks
    target_user = User(
        id=-1,
        name=payload.name,
        email=payload.email,
        password_hash="",
        role=target_role,
        department=payload.department,
        phone=payload.phone if hasattr(User, "phone") else None,  # legacy-safe
        facility_id=None,
        is_active=True,
    )

    # Can current_user manage someone with target_role?
    # We treat this as role assignment constraint.
    can_change_target_role(current_user, target_user, target_role)

    # Facility assignment validation
    facility_id = None
    if hasattr(payload, "facility_id") and payload.facility_id is not None:
        facility_id = payload.facility_id
    # If Facility Admin, force to own facility.
    if UserRole(current_user.role) == UserRole.FACILITY_ADMIN:
        facility_id = current_user.facility_id
        if facility_id is None:
            raise HTTPException(status_code=403, detail="Facility context missing")

    # PLATFORM_ADMIN: cannot create SUPER_ADMIN
    if UserRole(current_user.role) == UserRole.PLATFORM_ADMIN and target_role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot create Super Admin")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=target_role,
        department=payload.department,
        # phone column is present on model; UserCreate includes phone in this repo
        phone=payload.phone,
        facility_id=facility_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    facility_name = None
    if user.facility_id is not None:
        fac = db.query(Facility).filter(Facility.id == user.facility_id, Facility.deleted_at.is_(None)).first()
        facility_name = fac.facility_name if fac else None

    log_audit(
        db,
        user_id=current_user.id,
        action="user_created",
        resource_type="user",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"role": user.role.value, "facility_id": user.facility_id},
    )

    return _user_to_out(user, facility_name)


@router.patch("/users/{user_id}", response_model=UserAdminOut)
def admin_update_user(
    user_id: int,
    payload: UserEdit,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    target_user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    can_manage_user(current_user, target_user)

    old_role = target_user.role
    old_active = target_user.is_active

    data = payload.model_dump(exclude_unset=True)

    # Role change guard
    if "role" in data:
        new_role = UserRole(data["role"])
        can_change_target_role(current_user, target_user, new_role)
        target_user.role = new_role

    # Facility assignment guard
    if "facility_id" in data:
        if UserRole(current_user.role) == UserRole.FACILITY_ADMIN:
            # Facility admin cannot move users out of their facility
            if data["facility_id"] != current_user.facility_id:
                raise HTTPException(status_code=403, detail="Cannot assign facility outside your facility")
        target_user.facility_id = data["facility_id"]

    # Basic fields
    for field in ["name", "email", "department", "phone"]:
        if field in data:
            setattr(target_user, field, data[field])

    # Email uniqueness
    if "email" in data:
        existing = db.query(User).filter(User.email == data["email"], User.id != target_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    db.commit()
    db.refresh(target_user)

    facility_name = None
    if target_user.facility_id is not None:
        fac = db.query(Facility).filter(Facility.id == target_user.facility_id, Facility.deleted_at.is_(None)).first()
        facility_name = fac.facility_name if fac else None

    changed = {}
    changed["from_role"] = str(old_role)
    if target_user.role != old_role:
        changed["to_role"] = str(target_user.role)

    log_details = {}
    if "role" in data:
        log_details.update({"from_role": str(old_role), "to_role": str(target_user.role)})
    if target_user.is_active != old_active:
        log_details.update({"from_is_active": old_active, "to_is_active": target_user.is_active})
    if data:
        log_details.update({k: v for k, v in data.items() if k not in {"role", "facility_id"}})

    log_audit(
        db,
        user_id=current_user.id,
        action="user_updated",
        resource_type="user",
        resource_id=target_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=log_details or None,
    )

    return _user_to_out(target_user, facility_name)


@router.post("/users/{user_id}/suspend", response_model=UserAdminOut)
def admin_suspend_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    target_user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    can_manage_user(current_user, target_user)
    prevent_lockout_last_super_admin(db, current_user, target_user)

    old_active = target_user.is_active
    target_user.is_active = False
    db.commit()
    db.refresh(target_user)

    log_audit(
        db,
        user_id=current_user.id,
        action="user_suspended",
        resource_type="user",
        resource_id=target_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"from_is_active": old_active, "to_is_active": False},
    )

    facility_name = None
    if target_user.facility_id is not None:
        fac = db.query(Facility).filter(Facility.id == target_user.facility_id, Facility.deleted_at.is_(None)).first()
        facility_name = fac.facility_name if fac else None

    return _user_to_out(target_user, facility_name)


@router.post("/users/{user_id}/reactivate", response_model=UserAdminOut)
def admin_reactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    target_user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    can_manage_user(current_user, target_user)

    old_active = target_user.is_active
    target_user.is_active = True
    db.commit()
    db.refresh(target_user)

    log_audit(
        db,
        user_id=current_user.id,
        action="user_reactivated",
        resource_type="user",
        resource_id=target_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"from_is_active": old_active, "to_is_active": True},
    )

    facility_name = None
    if target_user.facility_id is not None:
        fac = db.query(Facility).filter(Facility.id == target_user.facility_id, Facility.deleted_at.is_(None)).first()
        facility_name = fac.facility_name if fac else None

    return _user_to_out(target_user, facility_name)


@router.get("/facilities", response_model=List[FacilityListOut])
def admin_list_facilities(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("facilities:read")),
):
    # Keep it simple: list active facilities.
    facilities = (
        db.query(Facility)
        .filter(Facility.deleted_at.is_(None), Facility.is_active.is_(True))
        .order_by(Facility.facility_name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        FacilityListOut(id=f.id, facility_name=f.facility_name, region=f.region, city=f.city)
        for f in facilities
    ]

