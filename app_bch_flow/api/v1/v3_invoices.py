"""Read-only V3 invoice API. No settlement claims or blockchain access."""
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from app_bch_flow.models import BCHMembership, BCHInvoice
from app_bch_flow.views.authentication import current_identity

@require_GET
def invoices(request, org_id):
    identity = current_identity(request)
    if identity is None:
        return JsonResponse({'error': 'authentication_required'}, status=401)
    membership = get_object_or_404(BCHMembership, identity=identity, organization_id=org_id, is_active=True, organization__is_active=True)
    items = BCHInvoice.objects.filter(organization=membership.organization).order_by('-created_at')[:100]
    return JsonResponse({'items': [{'id': str(i.id), 'amount_satoshis': i.amount_satoshis,
        'network': i.network, 'status': i.status, 'created_at': i.created_at.isoformat(),
        'verified_on_chain': False} for i in items], 'payment_monitoring_enabled': False})
