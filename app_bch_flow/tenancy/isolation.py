"""Explicit queryset scoping. Use for ALL organization-owned resources."""
from app_bch_flow.core.exceptions import TenantAccessDenied

def scope_to_organization(queryset, organization_id):
    if organization_id is None:
        raise TenantAccessDenied("Missing validated organization context")
    return queryset.filter(organization_id=organization_id)
