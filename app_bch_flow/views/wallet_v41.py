"""BCH Flow V4.1 merchant wallet: read-only interface and fail-closed actions."""
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET, require_http_methods
from app_bch_flow.models import BCHMembership, BCHInvoice, BCHMerchant, BCHWalletConnection
from app_bch_flow.views.authentication import current_identity


def _member(request, org_id):
    identity = current_identity(request)
    if identity is None:
        return None
    return get_object_or_404(
        BCHMembership.objects.select_related('organization'),
        identity=identity, organization_id=org_id,
        is_active=True, organization__is_active=True,
        role__in=('owner', 'admin', 'operator', 'viewer'),
    )


@require_GET
def wallet_home(request, org_id):
    member = _member(request, org_id)
    if member is None:
        return redirect('bch_flow:login')
    invoices = list(BCHInvoice.objects.filter(
        organization=member.organization
    ).order_by('-created_at')[:20])
    # Only organization-scoped records. No external network requests or balance claims.
    merchant_wallet = BCHMerchant.objects.filter(organization=member.organization).first()
    wallet_connections = list(BCHWalletConnection.objects.filter(
        organization=member.organization, revoked_at__isnull=True,
        identity__memberships__organization=member.organization,
        identity__memberships__is_active=True,
    ).distinct().order_by('-connected_at')[:10])
    invoice_addresses = list(BCHInvoice.objects.filter(
        organization=member.organization
    ).order_by('network', 'receiving_cashaddr').values('network', 'receiving_cashaddr').distinct()[:20])
    # A request-volume chart, never a claimed balance or payment confirmation.
    today = timezone.localdate()
    days = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
    counts = {day: 0 for day in days}
    for invoice in invoices:
        day = timezone.localtime(invoice.created_at).date()
        if day in counts:
            counts[day] += 1
    peak = max(counts.values(), default=0) or 1
    request_activity = [
        {'day': day, 'count': counts[day], 'height': round(counts[day] / peak * 100)}
        for day in days
    ]
    return render(request, 'app_bch_flow/wallet_v41/home.html', {
        'request_activity': request_activity,
        'merchant_wallet': merchant_wallet,
        'wallet_connections': wallet_connections,
        'invoice_addresses': invoice_addresses,
        'member': member,
        'invoices': invoices,
        'wallet_mode': 'WATCH_ONLY',
        'chain_balance_verified': False,
        'broadcast_enabled': False,
        'settlement_enabled': False,
    })


@require_http_methods(['GET', 'POST'])
def send_preview(request, org_id):
    member = _member(request, org_id)
    if member is None:
        return redirect('bch_flow:login')
    # Intentionally no transaction creation, wallet key access, or network calls.
    # POST is never interpreted as authorization and is rejected fail-closed.
    if request.method == 'POST':
        from django.http import HttpResponseNotAllowed
        return HttpResponseNotAllowed(['GET'])
    return render(request, 'app_bch_flow/wallet_v41/send.html', {
        'member': member, 'broadcast_enabled': False,
    })
