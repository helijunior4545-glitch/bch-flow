"""BCH Flow V2.4: read-only, single-provider UTXO evidence for an invoice.

This is NOT payment verification: spent outputs are absent from UTXO sets,
confirmed outputs lack block-hash proof, and shared addresses are ambiguous.
"""
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET
from app_bch_flow.models import BCHInvoice, BCHMembership
from app_bch_flow.views.authentication import current_identity
from app_bch_flow.blockchain.engine_v25.runtime_v26 import observe_configured, provider_status
from app_bch_flow.core.address_validation import validate_cashaddr
from django.core.exceptions import ValidationError

@require_GET
def invoice_evidence(request, org_id, invoice_id):
    identity = current_identity(request)
    if identity is None:
        return redirect('bch_flow:login')
    member = get_object_or_404(BCHMembership.objects.select_related('organization'),
        identity=identity, organization_id=org_id, is_active=True,
        organization__is_active=True, role__in=('owner','admin','operator','viewer'))
    invoice = get_object_or_404(BCHInvoice, pk=invoice_id, organization=member.organization)
    shared = BCHInvoice.objects.filter(network=invoice.network,
        receiving_cashaddr=invoice.receiving_cashaddr).exclude(pk=invoice.pk).exists()
    provider_preflight, _ = provider_status()
    observation = None
    engine_result = None
    error = None
    if request.GET.get('inspect') == '1':
        if invoice.network != 'mainnet':
            error = 'External inspection is limited to mainnet.'
        elif not invoice.receiving_cashaddr:
            error = 'This request has no receiving address.'
        else:
            try:
                address = validate_cashaddr(invoice.receiving_cashaddr, "mainnet")
                engine_result = observe_configured(address)
            except (ValidationError, ValueError, TypeError):
                error = "Invalid receiving address. No financial state changed."
    return render(request, 'app_bch_flow/wallet_v41/evidence_v24.html', {
        'member': member, 'invoice': invoice, 'shared': shared,
        'observation': observation, 'engine_result': engine_result, 'error': error,
        'provider_preflight': provider_preflight,
        'settlement_authorized': False, 'verified_payment': False,
    })
