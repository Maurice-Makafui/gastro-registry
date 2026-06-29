from app.models.user import UserRole

SPECIALIST_ROLES = {
    UserRole.DOCTOR,
    UserRole.GASTROENTEROLOGIST,
    UserRole.HEPATOLOGIST,
}

CLINICAL_ROLES = SPECIALIST_ROLES | {UserRole.NURSE, UserRole.ADMIN}

# Full permission set — reused by SUPER_ADMIN and ADMIN
_FULL_PERMISSIONS = {
    "facilities:read", "facilities:write", "facilities:delete",
    "audit:read",
    "patients:read", "patients:write",
    "referrals:read", "referrals:write", "referrals:feedback",
    "specialists:read", "specialists:write",
    "procedures:read", "procedures:write",
    "liver_registry:read", "liver_registry:write", "liver_registry:scan",
    "analytics:read",
    "mdt:read", "mdt:write", "mdt:conclude",
    "registries:read",
    "members:admin",
    "surveillance:read",
    "users:read", "users:write",
}

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.SUPER_ADMIN: _FULL_PERMISSIONS | {"system:config"},
    UserRole.PLATFORM_ADMIN: {
        # Operational admin across the platform (guarded server-side to exclude SUPER_ADMIN)
        "facilities:read",
        "audit:read",
        "patients:read",
        "referrals:read",
        "specialists:read",
        "procedures:read",
        "liver_registry:read",
        "analytics:read",
        "mdt:read",
        "registries:read",
        "surveillance:read",
        "users:read",
        "users:write",
    },
    UserRole.FACILITY_ADMIN: {
        # Facility-scoped admin (enforced server-side via facility_id + role guard)
        "facilities:read",
        "audit:read",
        "referrals:read",
        "referrals:write",
        "specialists:read",
        "specialists:write",
        "procedures:read",
        "procedures:write",
        "liver_registry:read",
        "liver_registry:write",
        "analytics:read",
        "mdt:read",
        "users:read",
        "users:write",
    },
    UserRole.ADMIN: _FULL_PERMISSIONS,

    UserRole.DOCTOR: {
        "facilities:read",
        "patients:read",
        "referrals:read",
        "referrals:write",
        "referrals:feedback",
        "specialists:read",
        "specialists:write",
        "procedures:read",
        "procedures:write",
        "liver_registry:read",
        "liver_registry:write",
        "analytics:read",
        "mdt:read",
        "mdt:write",
        "mdt:conclude",
        "registries:read",
    },
    UserRole.GASTROENTEROLOGIST: {
        "facilities:read",
        "patients:read",
        "referrals:read",
        "referrals:write",
        "referrals:feedback",
        "specialists:read",
        "specialists:write",
        "procedures:read",
        "procedures:write",
        "liver_registry:read",
        "liver_registry:write",
        "analytics:read",
        "mdt:read",
        "mdt:write",
        "mdt:conclude",
        "registries:read",
    },
    UserRole.HEPATOLOGIST: {
        "facilities:read",
        "patients:read",
        "referrals:read",
        "referrals:write",
        "referrals:feedback",
        "specialists:read",
        "specialists:write",
        "procedures:read",
        "procedures:write",
        "liver_registry:read",
        "liver_registry:write",
        "liver_registry:scan",
        "analytics:read",
        "mdt:read",
        "mdt:write",
        "mdt:conclude",
        "registries:read",
    },
    UserRole.NURSE: {
        "facilities:read",
        "patients:read",
        "patients:write",
        "referrals:read",
        "referrals:write",
        "specialists:read",
        "procedures:read",
        "liver_registry:read",
        "mdt:read",
    },
    UserRole.REFERRING_PHYSICIAN: {
        "facilities:read",
        "patients:read",
        "referrals:read",
        "referrals:write",
        "specialists:read",
        "procedures:read",
    },
    UserRole.RESEARCHER: {
        "facilities:read",
        "specialists:read",
        "procedures:read",
        "liver_registry:read",
        "analytics:read",
        "registries:read",
    },
}


def role_has_permission(role: UserRole, permission: str) -> bool:
    permissions = ROLE_PERMISSIONS.get(role, set())
    return permission in permissions


def expand_role_names(*roles: str) -> set[str]:
    expanded = set(roles)
    if "DOCTOR" in expanded:
        expanded.update(["GASTROENTEROLOGIST", "HEPATOLOGIST"])
    if "SPECIALIST" in expanded:
        expanded.update(["DOCTOR", "GASTROENTEROLOGIST", "HEPATOLOGIST"])
    return expanded
