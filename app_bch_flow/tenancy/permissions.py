"""Explicit membership authorization; never trust URL-supplied organization IDs."""
ROLE_PERMISSIONS = {
    "owner": frozenset({"read", "invoice:create", "members:manage", "settings:manage", "payments:read"}),
    "admin": frozenset({"read", "invoice:create", "members:manage", "payments:read"}),
    "operator": frozenset({"read", "invoice:create", "payments:read"}),
    "viewer": frozenset({"read", "payments:read"}),
}

def has_permission(role, permission):
    return permission in ROLE_PERMISSIONS.get(role, frozenset())
