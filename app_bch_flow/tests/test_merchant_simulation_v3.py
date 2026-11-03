from django.test import SimpleTestCase
from django.urls import resolve, reverse

class MerchantSimulationRoutingTests(SimpleTestCase):
    def test_route_resolves_to_read_only_view(self):
        from app_bch_flow.views.merchant_simulation_v3 import merchant_payment_simulation
        from uuid import uuid4
        url=reverse('bch_flow:merchant_payment_simulation_v3', args=[uuid4(),uuid4()])
        self.assertIs(resolve(url).func, merchant_payment_simulation)
        self.assertEqual(merchant_payment_simulation.__name__, 'merchant_payment_simulation')
