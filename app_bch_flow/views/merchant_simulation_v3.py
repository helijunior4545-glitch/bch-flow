"""Merchant-only, visual-only simulation. Never changes financial records."""
from decimal import Decimal
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET
from app_bch_flow.models import BCHInvoice
from app_bch_flow.views.v3_workspace import _member

@require_GET
def merchant_payment_simulation(request, org_id, invoice_id):
    member = _member(request, org_id, write=True)
    if member is None:
        return redirect('bch_flow:login')
    invoice = get_object_or_404(BCHInvoice, pk=invoice_id, organization=member.organization)
    return render(request, 'app_bch_flow/dashboard/merchant_payment_simulation.html', {
        'member': member,
        'invoice': invoice,
        'amount_bch': Decimal(invoice.amount_satoshis) / Decimal(100_000_000),
    })
