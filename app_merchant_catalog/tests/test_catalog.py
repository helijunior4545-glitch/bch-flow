from decimal import Decimal
from django.test import TestCase
from app_merchant_catalog.forms import ProductForm

class ProductValidationTests(TestCase):
    def test_positive_price_required(self):
        form = ProductForm(data={"name": "Consulting", "price": "0", "currency": "BCH"})
        self.assertFalse(form.is_valid())
    def test_valid_product(self):
        form = ProductForm(data={"name": "Consulting", "price": "0.10000000", "currency": "BCH"})
        self.assertTrue(form.is_valid(), form.errors)
