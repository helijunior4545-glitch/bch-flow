"""BCH Flow Pay V1: signed read-only checkout, never a settlement authority."""
from decimal import Decimal
from django.core import signing
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from app_bch_flow.models import BCHInvoice
from app_bch_flow.views.v3_workspace import _member

SALT = 'bch-flow-pay-v1-public-checkout'
MAX_AGE_SECONDS = 1800


def _get_open_invoice(org_id, invoice_id):
    inv = get_object_or_404(BCHInvoice.objects.select_related('organization'), pk=invoice_id, organization_id=org_id)
    if (not inv.organization.is_active or inv.status != 'created' or inv.paid_at is not None
            or inv.expires_at is None or inv.expires_at <= timezone.now()):
        raise Http404('Payment request unavailable')
    return inv


def _read_token(token):
    try:
        payload = signing.loads(token, salt=SALT, max_age=MAX_AGE_SECONDS)
        if not isinstance(payload, dict) or set(payload) != {'org', 'invoice'}:
            raise signing.BadSignature('Invalid payload')
        return _get_open_invoice(payload['org'], payload['invoice'])
    except (signing.BadSignature, ValueError, TypeError, OverflowError):
        raise Http404('Payment link invalid or expired')


@never_cache
@require_GET
def share(request, org_id, invoice_id):
    # Share URL generation requires the same authorized write membership as invoice creation.
    member = _member(request, org_id, write=True)
    if member is None:
        return redirect('bch_flow:login')
    inv = _get_open_invoice(member.organization_id, invoice_id)
    token = signing.dumps({'org': str(inv.organization_id), 'invoice': str(inv.pk)}, salt=SALT, compress=False)
    return redirect('bch_flow:pay_v1_checkout', token=token)


@never_cache
@require_GET
def checkout(request, token):
    inv = _read_token(token)
    amount = Decimal(inv.amount_satoshis) / Decimal(100_000_000)
    response = render(request, 'app_bch_flow/checkout/pay_v1.html', {
        'invoice': inv,
        'amount_bch': format(amount, '.8f').rstrip('0').rstrip('.'),
        'expires_at': inv.expires_at,
        'status_url': reverse('bch_flow:pay_v1_status', kwargs={'token': token}),
    })
    response['X-Robots-Tag'] = 'noindex, nofollow, noarchive'
    response['Referrer-Policy'] = 'no-referrer'
    response['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    return response


@never_cache
@require_GET
def status(request, token):
    inv = _read_token(token)
    response = JsonResponse({
        'state': 'awaiting_external_verification',
        'payment_verified': False,
        'settlement_authorized': False,
        'message': 'No payment verified. Demo checkout only.',
        'request_id': str(inv.pk),
    })
    response['X-Robots-Tag'] = 'noindex, nofollow, noarchive'
    response['Referrer-Policy'] = 'no-referrer'
    return response
