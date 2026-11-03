"""V4.2 route, fail-closed and access tests; no external network."""
import uuid
from unittest.mock import patch
from django.test import SimpleTestCase, RequestFactory
from django.urls import reverse, resolve
from app_bch_flow.views import wallet_v42

class WalletV42Tests(SimpleTestCase):
    def test_route_resolves(self):
        u = reverse('bch_flow:wallet_v42_diagnostic', kwargs={'org_id':uuid.uuid4()})
        self.assertIs(resolve(u).func, wallet_v42.transaction_lookup)

    def test_unauthenticated_redirects_before_network(self):
        req = RequestFactory().get('/unused', {'txid':'a'*64})
        with patch.object(wallet_v42, 'current_identity', return_value=None):
            with patch('app_bch_flow.blockchain.v49_real_transaction.inspect_transaction') as call:
                response = wallet_v42.transaction_lookup(req, uuid.uuid4())
                self.assertEqual(response.status_code, 302)
                call.assert_not_called()

    def test_view_is_get_only(self):
        req = RequestFactory().post('/unused')
        response = wallet_v42.transaction_lookup(req, uuid.uuid4())
        self.assertEqual(response.status_code, 405)
