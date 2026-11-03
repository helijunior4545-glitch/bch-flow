"""V4.3 no-network contract and parser tests."""
import os
import uuid
from unittest.mock import patch
from django.test import SimpleTestCase
from django.urls import reverse, resolve
from app_bch_flow.blockchain.v43_address_utxo import observe_address, ObservationUnavailable
from app_bch_flow.views.wallet_v43 import address_monitor

class V43Tests(SimpleTestCase):
    def test_route(self):
        url=reverse('bch_flow:wallet_v43_monitor',kwargs={'org_id':uuid.uuid4()})
        self.assertIs(resolve(url).func,address_monitor)
    def test_disabled_by_default(self):
        with patch.dict(os.environ,{'BCHFLOW_V43_ENABLE_ADDRESS_READ':'0'}):
            with self.assertRaises(ObservationUnavailable): observe_address('not-an-address')
    def test_no_external_call_when_disabled(self):
        with patch.dict(os.environ,{'BCHFLOW_V43_ENABLE_ADDRESS_READ':'0'}):
            with self.assertRaises(ObservationUnavailable): observe_address('not-an-address',fetch=lambda path: self.fail('network'))
    def test_no_financial_mutations_in_view(self):
        from pathlib import Path
        source=Path(__file__).resolve().parents[1].joinpath('views','wallet_v43.py').read_text()
        for text in ('BCHPayment.objects.create','BCHTransfer.objects.create','broadcast(','.save('):
            self.assertNotIn(text,source)
