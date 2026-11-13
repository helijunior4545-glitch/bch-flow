"""V4.3: membership-scoped, read-only address inspector."""
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET
from django.core.exceptions import ValidationError
from app_bch_flow.models import BCHMembership, BCHInvoice
from app_bch_flow.views.authentication import current_identity
from app_bch_flow.core.address_validation import validate_cashaddr
from app_bch_flow.blockchain.v43_address_utxo import observe_address, ObservationUnavailable

@require_GET
def address_monitor(request, org_id):
    identity=current_identity(request)
    if identity is None:
        return redirect('bch_flow:login')
    member=get_object_or_404(BCHMembership.objects.select_related('organization'), identity=identity,
        organization_id=org_id, is_active=True, organization__is_active=True,
        role__in=('owner','admin','operator','viewer'))
    invoices=list(BCHInvoice.objects.filter(organization=member.organization, network='mainnet')
        .order_by('-created_at')[:30])
    address=(request.GET.get('address') or '').strip()
    observation=None; error=None
    if address:
        if len(address)>160:
            error='Invalid address length.'
        else:
            try:
                address=validate_cashaddr(address,'mainnet')
                # Only addresses already present on invoices for this organization may be queried.
                if not BCHInvoice.objects.filter(organization=member.organization, network='mainnet',
                                                 receiving_cashaddr=address).exists():
                    error='Address is not registered on an invoice in this organization.'
                else:
                    observation=observe_address(address)
            except (ValidationError, ObservationUnavailable, ValueError, TypeError):
                error='Address invalid or external observation unavailable. No financial state changed.'
    return render(request,'app_bch_flow/wallet_v43/monitor.html', {
        'member':member,'invoices':invoices,'address':address,'observation':observation,
        'error':error,'settlement_authorized':False,'ownership_verified':False,
    })
