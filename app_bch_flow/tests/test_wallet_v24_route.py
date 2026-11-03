"""Regression tests for V2.4 evidence access and fail-closed behavior."""
from django.test import SimpleTestCase
from django.urls import reverse, resolve

class EvidenceRouteTests(SimpleTestCase):
    def test_route_resolves(self):
        from uuid import uuid4
        from app_bch_flow.views.wallet_v24 import invoice_evidence
        url = reverse('bch_flow:wallet_v24_evidence', args=[uuid4(), uuid4()])
        self.assertIs(resolve(url).func, invoice_evidence)

    def test_view_is_get_only(self):
        from app_bch_flow.views.wallet_v24 import invoice_evidence
        from django.test import RequestFactory
        from uuid import uuid4
        response = invoice_evidence(RequestFactory().post('/'), uuid4(), uuid4())
        self.assertEqual(response.status_code, 405)
