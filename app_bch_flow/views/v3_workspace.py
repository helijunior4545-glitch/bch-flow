"""BCH Flow V3: authenticated watch-only receiving addresses and draft invoices.
No custody, signatures, broadcast, blockchain verification or settlement.
"""
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from django import forms
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from app_bch_flow.core.address_validation import validate_cashaddr
from app_bch_flow.models import BCHMembership, BCHInvoice
from app_bch_flow.views.authentication import current_identity

MAX_SATOSHIS = 21_000_000 * 100_000_000

class AddressForm(forms.Form):
    network = forms.ChoiceField(choices=[('chipnet','Chipnet — testing'),('mainnet','Mainnet — no payments enabled')])
    address = forms.CharField(max_length=160, label='Receiving CashAddr (watch-only)')
    def clean(self):
        data = super().clean()
        if 'network' in data and 'address' in data:
            try:
                data['address'] = validate_cashaddr(data['address'].strip(), data['network'])
            except ValidationError as exc:
                self.add_error('address', exc)
        return data

class InvoiceForm(AddressForm):
    amount_bch = forms.DecimalField(min_value=Decimal('0.00000001'), max_value=Decimal('21000000'), decimal_places=8, max_digits=16)
    description = forms.CharField(max_length=255, required=False)
    def clean_amount_bch(self):
        amount = self.cleaned_data['amount_bch']
        satoshis = amount * 100_000_000
        if satoshis != satoshis.to_integral_value() or not (0 < satoshis <= MAX_SATOSHIS):
            raise forms.ValidationError('Invalid satoshi amount')
        return amount

def _member(request, org_id, write=False):
    identity = current_identity(request)
    if identity is None:
        return None
    roles = ('owner','admin','operator') if write else ('owner','admin','operator','viewer')
    return get_object_or_404(BCHMembership.objects.select_related('organization'), identity=identity,
                             organization_id=org_id, is_active=True, organization__is_active=True, role__in=roles)

@require_http_methods(['GET'])
def workspace(request, org_id):
    member = _member(request, org_id)
    if member is None:
        return redirect('bch_flow:login')
    invoices = BCHInvoice.objects.filter(organization=member.organization).order_by('-created_at')[:50]
    return render(request, 'app_bch_flow/dashboard/v3_workspace.html', {'member':member,'invoices':invoices})

@require_http_methods(['GET','POST'])
def create_invoice(request, org_id):
    member = _member(request, org_id, write=True)
    if member is None:
        return redirect('bch_flow:login')
    form = InvoiceForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        sats = int(form.cleaned_data['amount_bch'] * 100_000_000)
        invoice = BCHInvoice(organization=member.organization, amount_satoshis=sats,
                             receiving_cashaddr=form.cleaned_data['address'], network=form.cleaned_data['network'],
                             description=form.cleaned_data['description'], status='created',
                             expires_at=timezone.now()+timedelta(minutes=30))
        invoice.full_clean()
        invoice.save(using='default')
        return redirect('bch_flow:v3_invoice', org_id=member.organization_id, invoice_id=invoice.id)
    return render(request, 'app_bch_flow/dashboard/v3_invoice_form.html', {'member':member,'form':form})

@require_http_methods(['GET'])
def invoice_detail(request, org_id, invoice_id):
    member = _member(request, org_id)
    if member is None:
        return redirect('bch_flow:login')
    invoice = get_object_or_404(BCHInvoice, pk=invoice_id, organization=member.organization)
    amount_bch = Decimal(invoice.amount_satoshis)/Decimal(100_000_000)
    # URI is for display and copy only. No payment status is inferred from it.
    from urllib.parse import quote
    payment_uri = invoice.receiving_cashaddr + '?amount=' + format(amount_bch, 'f')
    return render(request, 'app_bch_flow/dashboard/v3_invoice_detail.html',
                  {'member':member,'invoice':invoice,'amount_bch':amount_bch,'payment_uri':payment_uri,
                   'is_expired':invoice.expires_at <= timezone.now()})
