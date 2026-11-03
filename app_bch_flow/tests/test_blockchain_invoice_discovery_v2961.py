"""Offline regression tests for Blockbook empty-history response."""
from types import SimpleNamespace
from unittest.mock import Mock, patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.invoice_discovery_v296 import discover

ADDR = 'bitcoincash:' + 'q' * 42
INV = SimpleNamespace(id='invoice', network='mainnet', receiving_cashaddr=ADDR, amount_satoshis=100)

def factory(payload):
    book = Mock()
    book._get.return_value = payload
    return lambda *args, **kwargs: book

class V2961EmptyHistoryTests(SimpleTestCase):
    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_real_empty_history_response(self):
        payload = {'address': ADDR, 'txs': 0, 'page': 1, 'totalPages': 1,
                   'itemsOnPage': 5, 'unconfirmedTxs': 0, 'balance': '0'}
        evaluator = Mock()
        result = discover(INV, probe=True, book_factory=factory(payload), evaluator=evaluator)
        self.assertEqual(result['state'], 'NO_TRANSACTIONS_FOUND')
        self.assertEqual(result['candidate_count'], 0)
        self.assertEqual(result['observed_satoshis'], 0)
        self.assertFalse(result['history_complete'])
        self.assertFalse(result['payment_verified'])
        self.assertFalse(result['settlement_authorized'])
        evaluator.assert_not_called()

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_missing_txids_with_positive_txs_rejected(self):
        payload = {'address': ADDR, 'txs': 1, 'page': 1, 'totalPages': 1}
        result = discover(INV, probe=True, book_factory=factory(payload))
        self.assertEqual(result['state'], 'DISCOVERY_UNAVAILABLE_OR_INVALID')

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_missing_txids_with_missing_metadata_rejected(self):
        result = discover(INV, probe=True, book_factory=factory({'address': ADDR}))
        self.assertEqual(result['state'], 'DISCOVERY_UNAVAILABLE_OR_INVALID')

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_missing_txids_with_nonzero_unconfirmed_rejected(self):
        payload = {'address': ADDR, 'txs': 0, 'page': 1, 'totalPages': 1, 'unconfirmedTxs': 1}
        result = discover(INV, probe=True, book_factory=factory(payload))
        self.assertEqual(result['state'], 'DISCOVERY_UNAVAILABLE_OR_INVALID')

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_missing_txids_with_invalid_page_rejected(self):
        payload = {'address': ADDR, 'txs': 0, 'page': 2, 'totalPages': 1}
        result = discover(INV, probe=True, book_factory=factory(payload))
        self.assertEqual(result['state'], 'DISCOVERY_UNAVAILABLE_OR_INVALID')
