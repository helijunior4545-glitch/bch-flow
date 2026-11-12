"""Authenticated preparation endpoint. Signed bytes use the existing submit form."""
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.cache import never_cache
from app_bch_flow.models import FlowWithdrawal
from app_bch_flow.financial.views import _member
from app_bch_flow.financial.amounts import PaymentError, ProviderUnavailable
from app_bch_flow.wallets.manager import request_payment_authorization


@never_cache
@require_POST
def signing_request(request, org_id, withdrawal_id):
    member = _member(request, org_id)
    if member is None:
        return JsonResponse({'error':'authentication_required'},status=401)
    if member.role not in ('owner', 'admin') or member.identity.is_demo:
        return JsonResponse({'error':'not_authorized'},status=403)
    withdrawal = get_object_or_404(FlowWithdrawal.objects.select_related('account__wallet'),
                                 pk=withdrawal_id, account__organization_id=org_id)
    try:
        payload = request_payment_authorization(member.identity, withdrawal)
    except ProviderUnavailable:
        return JsonResponse({'error':'provider_unavailable'},status=503)
    except PaymentError as exc:
        return JsonResponse({'error':str(exc)},status=400)
    return JsonResponse(payload)
