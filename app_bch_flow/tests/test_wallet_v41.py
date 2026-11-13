"""BCH Flow V4.1: fail-closed wallet UI contract tests (no network)."""
from django.test import SimpleTestCase
from django.urls import reverse, resolve
from app_bch_flow.views import wallet_v41
import uuid

class WalletV41RoutesTests(SimpleTestCase):
    def test_wallet_route_resolves(self):
        url = reverse('bch_flow:wallet_v41_home', kwargs={'org_id': uuid.uuid4()})
        self.assertIs(resolve(url).func, wallet_v41.wallet_home)

    def test_send_route_resolves(self):
        url = reverse('bch_flow:wallet_v41_send', kwargs={'org_id': uuid.uuid4()})
        self.assertIs(resolve(url).func, wallet_v41.send_preview)

    def test_no_transfer_mutation_in_view(self):
        from pathlib import Path
        source = Path(wallet_v41.__file__).read_text(encoding='utf-8')
        for prohibited in ('BCHTransfer.objects.create', 'broadcast(', 'signed_transaction', 'private_key', 'seed_phrase'):
            self.assertNotIn(prohibited, source)
