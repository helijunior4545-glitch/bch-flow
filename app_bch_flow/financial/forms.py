from django import forms
from .amounts import units, PaymentError


class RequestForm(forms.Form):
    amount = forms.CharField(
        label="Valor",
        max_length=30,
        widget=forms.TextInput(
            attrs={
                "inputmode": "decimal",
                "placeholder": "0.00000000",
                "autocomplete": "off",
            }
        ),
    )
    description = forms.CharField(label="Descrição", max_length=160, required=False)
    payer_email = forms.EmailField(
        label="Email do pagador (Pix conectado)", required=False
    )
    key = forms.CharField(widget=forms.HiddenInput, max_length=80)

    def __init__(self, *args, asset="BCH", **kwargs):
        self.asset = asset
        super().__init__(*args, **kwargs)

    def clean_amount(self):
        try:
            return units(self.cleaned_data["amount"], self.asset)
        except PaymentError as exc:
            raise forms.ValidationError(str(exc)) from None


class WithdrawalForm(RequestForm):
    destination = forms.CharField(
        label="Destino",
        max_length=180,
        widget=forms.TextInput(attrs={"autocomplete": "off", "spellcheck": "false"}),
    )
    fee_limit = forms.CharField(
        label="Taxa máxima autorizada", max_length=30, initial="0"
    )
    description = None
    payer_email = None

    def clean_fee_limit(self):
        value = self.cleaned_data["fee_limit"]
        if value in ("0", "0.00", "0.00000000"):
            return 0
        try:
            return units(value, self.asset)
        except PaymentError as exc:
            raise forms.ValidationError(str(exc)) from None
