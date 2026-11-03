"""V4.2 external TX diagnostic: read-only, organization scoped, fail closed."""
import re
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET
from app_bch_flow.models import BCHMembership, BCHInvoice
from app_bch_flow.views.authentication import current_identity

HEX64 = re.compile(r"[0-9a-fA-F]{64}\Z")

@require_GET
def transaction_lookup(request, org_id):
    identity = current_identity(request)
    if identity is None:
        return redirect('bch_flow:login')
    member = get_object_or_404(BCHMembership.objects.select_related('organization'),
        identity=identity, organization_id=org_id, is_active=True,
        organization__is_active=True, role__in=('owner','admin','operator','viewer'))
    txid = request.GET.get('txid', '').strip()
    invoice_id = request.GET.get('invoice', '').strip()
    invoice = None
    if invoice_id:
        from uuid import UUID
        try: invoice_uuid = UUID(invoice_id)
        except (ValueError, TypeError, AttributeError): raise Http404('Invalid invoice')
        invoice = get_object_or_404(BCHInvoice, pk=invoice_uuid, organization=member.organization)
    report = None
    error = None
    if txid:
        if not HEX64.fullmatch(txid):
            error = 'Enter a 64-character hexadecimal transaction ID.'
        else:
            try:
                from app_bch_flow.blockchain.v49_real_transaction import inspect_transaction, DiagnosticError
                report = inspect_transaction(txid)
            except (DiagnosticError, ValueError, TypeError, OSError):
                error = 'External diagnostic unavailable or disabled. No payment status changed.'
    matched_satoshis = None
    if report is not None and invoice is not None:
        # Diagnostic only: single provider; NEVER infer settlement or address ownership.
        matched_satoshis = sum(o['satoshis'] for o in report['outputs']
            if invoice.receiving_cashaddr in o['addresses'])
    return render(request, 'app_bch_flow/wallet_v42/diagnostic.html', {
        'member': member, 'txid': txid, 'invoice': invoice, 'report': report,
        'error': error, 'matched_satoshis': matched_satoshis,
        'settlement_authorized': False, 'wallet_balance_verified': False,
    })
