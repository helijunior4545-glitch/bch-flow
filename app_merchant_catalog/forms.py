from decimal import Decimal
from django import forms
from django.utils.translation import gettext_lazy as _
from .models import MerchantProduct

class ProductForm(forms.ModelForm):
    class Meta:
        model = MerchantProduct
        fields = ("name", "sku", "description", "price", "currency")
    def clean_name(self):
        value = self.cleaned_data["name"].strip()
        if not value:
            raise forms.ValidationError(_("Enter a product name."))
        return value
    def clean_price(self):
        value = self.cleaned_data["price"]
        if value is None or value <= Decimal("0"):
            raise forms.ValidationError(_("Price must be greater than zero."))
        return value
