from django.utils.translation import gettext_lazy as _
from django import forms
from .amounts import units, PaymentError


class RequestForm(forms.Form):
    amount = forms.CharField(
        label=_("Amount"),
        max_length=30,
        widget=forms.TextInput(
            attrs={
                "inputmode": "decimal",
                "placeholder": "0.00000000",
                "autocomplete": "off",
            }
        ),
    )
    description = forms.CharField(
        label=_("Description"), max_length=160, required=False
    )
    payer_email = forms.EmailField(
        label=_("Payer email (connected Pix)"), required=False
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
        label=_("Destination"),
        max_length=180,
        widget=forms.TextInput(attrs={"autocomplete": "off", "spellcheck": "false"}),
    )
    fee_limit = forms.CharField(
        label=_("Maximum authorized fee"), max_length=30, initial="0"
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
