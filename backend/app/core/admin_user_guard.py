from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User, UserRole


ELEVATED_ROLES: set[UserRole] = {UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN}


def _role_as_enum(role: UserRole | str) -> UserRole:
    return role if isinstance(role, UserRole) else UserRole(role)


def require_super_admin(current_user: User) -> None:
    role = _role_as_enum(current_user.role)
    if role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin only")


def require_platform_admin_or_super(current_user: User) -> None:
    role = _role_as_enum(current_user.role)
    if role not in {UserRole.PLATFORM_ADMIN, UserRole.SUPER_ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform Admin required")


def require_facility_admin(current_user: User) -> None:
    role = _role_as_enum(current_user.role)
    if role != UserRole.FACILITY_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Facility Admin required")


def can_manage_user(current_user: User, target_user: User) -> None:
    """MVP-safe rule-set:
    - SUPER_ADMIN can manage anyone
    - PLATFORM_ADMIN can manage anyone except SUPER_ADMIN
    - FACILITY_ADMIN can manage users in same facility only, and cannot manage elevated roles
    """

    actor = _role_as_enum(current_user.role)
    target_role = _role_as_enum(target_user.role)

    if actor == UserRole.SUPER_ADMIN:
        return

    if actor == UserRole.PLATFORM_ADMIN:
        if target_role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Cannot modify Super Admin accounts")
        return

    if actor == UserRole.FACILITY_ADMIN:
        if current_user.facility_id is None:
            raise HTTPException(status_code=403, detail="Facility context missing")
        if target_user.facility_id != current_user.facility_id:
            raise HTTPException(status_code=403, detail="Cannot manage users outside your facility")
        if target_role in ELEVATED_ROLES:
            raise HTTPException(status_code=403, detail="Cannot modify elevated roles")
        return

    raise HTTPException(status_code=403, detail="Access denied")


def can_change_target_role(current_user: User, target_user: User, new_role: UserRole) -> None:
    """Privilege escalation prevention.
    - PLATFORM_ADMIN cannot change SUPER_ADMIN roles
    - FACILITY_ADMIN cannot assign elevated roles (SUPER_ADMIN / PLATFORM_ADMIN)
    """

    actor = _role_as_enum(current_user.role)
    target_role = _role_as_enum(target_user.role)

    if actor == UserRole.SUPER_ADMIN:
        return

    if actor == UserRole.PLATFORM_ADMIN:
        if target_role == UserRole.SUPER_ADMIN or new_role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Cannot modify Super Admin accounts")
        return

    if actor == UserRole.FACILITY_ADMIN:
        if new_role in ELEVATED_ROLES:
            raise HTTPException(status_code=403, detail="Cannot assign elevated roles")
        # Additionally disallow changing roles for users not in same facility
        if current_user.facility_id is None or target_user.facility_id != current_user.facility_id:
            raise HTTPException(status_code=403, detail="Cannot modify users outside your facility")
        return

    raise HTTPException(status_code=403, detail="Access denied")


def prevent_lockout_last_super_admin(db: Session, current_user: User, target_user: User) -> None:
    """Prevent deactivating/suspending the last active SUPER_ADMIN."""

    actor = _role_as_enum(current_user.role)
    target_role = _role_as_enum(target_user.role)

    if actor != UserRole.SUPER_ADMIN:
        return
    if target_role != UserRole.SUPER_ADMIN:
        return

    active_super_admins = (
        db.query(User)
        .filter(User.deleted_at.is_(None))
        .filter(User.is_active.is_(True))
        .filter(User.role == UserRole.SUPER_ADMIN)
        .count()
    )

    # If target is currently active and there would be no active SUPER_ADMIN left
    if target_user.is_active and active_super_admins <= 1:
        raise HTTPException(status_code=400, detail="Cannot deactivate the last active Super Admin")

