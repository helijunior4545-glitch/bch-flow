from decimal import Decimal
from django import forms
from app_bch_flow.models import FlowAccount
from app_bch_flow.financial.amounts import units, PaymentError
from .software import inspect_archive


class GuestCheckoutForm(forms.Form):
    email = forms.EmailField(max_length=254, label='Email for this purchase',
                             widget=forms.EmailInput(attrs={'autocomplete': 'email', 'placeholder': 'you@example.com'}))


class ReleaseForm(forms.Form):
    version = forms.RegexField(r'^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$', max_length=40)
    archive = forms.FileField(help_text='ZIP, up to 100 MB. Include README.md and LICENSE.txt.')
    requirements = forms.CharField(max_length=2000, widget=forms.Textarea, help_text='Operating systems, runtime versions, installation and external services/costs.')
    license_text = forms.CharField(max_length=12000, widget=forms.Textarea, help_text='Usage rights, redistribution, support and update policy.')
    notes = forms.CharField(max_length=2000, required=False, widget=forms.Textarea)
    account = forms.ModelChoiceField(queryset=FlowAccount.objects.none(), label='Receiving account')
    price = forms.DecimalField(max_digits=22, decimal_places=8, min_value=Decimal('0.00000001'))

    def __init__(self, *args, organization, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['account'].queryset = FlowAccount.objects.filter(
            organization=organization, environment='live', asset__in=('BTC', 'BCH', 'BRL'), frozen=False,
        ).select_related('wallet')
        self.fields['account'].label_from_instance = lambda a: f'{a.asset} · {a.wallet.name if a.wallet_id else "Receiving account"}'

    def clean_archive(self):
        upload = self.cleaned_data['archive']
        self.archive_digest = inspect_archive(upload)
        return upload

    def clean(self):
        data = super().clean()
        if data.get('account') and data.get('price'):
            try:
                data['amount_units'] = units(str(data['price']), data['account'].asset)
            except PaymentError as exc:
                self.add_error('price', str(exc))
        return data


class OfferForm(forms.Form):
    account = forms.ModelChoiceField(queryset=FlowAccount.objects.none())
    price = forms.DecimalField(max_digits=22, decimal_places=8, min_value=Decimal('0.00000001'))

    def __init__(self, *args, organization, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['account'].queryset = FlowAccount.objects.filter(organization=organization,
            environment='live', asset__in=('BTC', 'BCH', 'BRL'), frozen=False)
        self.fields['account'].label_from_instance = lambda a: f'{a.asset} · {a.pk}'

    def clean(self):
        data = super().clean()
        if data.get('account') and data.get('price'):
            try:
                data['amount_units'] = units(str(data['price']), data['account'].asset)
            except PaymentError as exc:
                self.add_error('price', str(exc))
        return data
