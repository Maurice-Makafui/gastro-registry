from app.models.user import UserRole

SPECIALIST_ROLES = {
    UserRole.DOCTOR,
    UserRole.GASTROENTEROLOGIST,
    UserRole.HEPATOLOGIST,
}

CLINICAL_ROLES = SPECIALIST_ROLES | {UserRole.NURSE, UserRole.ADMIN}

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.ADMIN: {
        "facilities:read",
        "facilities:write",
        "facilities:delete",
        "audit:read",
        "patients:read",
        "patients:write",
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
        "members:admin",
    },
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
