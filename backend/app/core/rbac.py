from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.core.permissions import role_has_permission, expand_role_names
from app.models.user import User, UserRole


def require_permission(permission: str):
    def permission_checker(current_user: User = Depends(get_current_user)):
        role = current_user.role
        if isinstance(role, str):
            role = UserRole(role)
        if not role_has_permission(role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required permission: {permission}",
            )
        return current_user

    return permission_checker


def require_role(*roles: str):
    allowed = expand_role_names(*roles)

    def role_checker(current_user: User = Depends(get_current_user)):
        role_value = (
            current_user.role.value
            if isinstance(current_user.role, UserRole)
            else str(current_user.role)
        )
        if role_value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(sorted(allowed))}",
            )
        return current_user

    return role_checker


def is_specialist(user: User) -> bool:
    role = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
    return role in {
        UserRole.DOCTOR,
        UserRole.GASTROENTEROLOGIST,
        UserRole.HEPATOLOGIST,
    }
