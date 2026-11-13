"""Offline tests for bounded, fail-closed V2.9.6 discovery."""
from types import SimpleNamespace
from unittest.mock import Mock, patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.invoice_discovery_v296 import discover

ADDR = 'bitcoincash:' + 'q' * 42
TX1 = 'a' * 64
TX2 = 'b' * 64
INV = SimpleNamespace(id='invoice', network='mainnet', receiving_cashaddr=ADDR, amount_satoshis=100)

def factory(payload):
    book = Mock()
    book._get.return_value = payload
    return lambda *a, **kw: book

def evidence(inv, txid, probe=False):
    return {'state': 'ADDRESS_OUTPUT_OBSERVED', 'matching_transaction': True,
            'observed_satoshis': 40, 'confirmations_reported': 3}

class InvoiceDiscoveryV296Tests(SimpleTestCase):
    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_no_probe_makes_no_network_calls(self):
        book = Mock()
        result = discover(INV, book_factory=book, evaluator=evidence)
        self.assertEqual(result['state'], 'NOT_TESTED')
        book.assert_not_called()

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_observed_candidates_not_payment(self):
        result = discover(INV, probe=True, book_factory=factory({'address': ADDR, 'txids': [TX1, TX2], 'txs': 7}), evaluator=evidence)
        self.assertEqual(result['state'], 'CANDIDATE_OUTPUTS_OBSERVED')
        self.assertEqual(result['observed_satoshis'], 80)
        self.assertFalse(result['history_complete'])
        self.assertFalse(result['payment_verified'])
        self.assertFalse(result['settlement_authorized'])
        self.assertFalse(result['utxo_consensus'])

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_duplicate_txids_fail_closed(self):
        result = discover(INV, probe=True, book_factory=factory({'txids': [TX1, TX1]}), evaluator=evidence)
        self.assertEqual(result['state'], 'DISCOVERY_UNAVAILABLE_OR_INVALID')
        self.assertEqual(result['observed_satoshis'], 0)

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_oversized_page_fails_closed(self):
        result = discover(INV, probe=True, book_factory=factory({'txids': [str(i).zfill(64) for i in range(6)]}), evaluator=evidence)
        self.assertEqual(result['state'], 'DISCOVERY_UNAVAILABLE_OR_INVALID')

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_partial_evidence_is_not_success(self):
        result = discover(INV, probe=True, book_factory=factory({'txids': [TX1]}), evaluator=lambda *a, **k: {'state': 'CROSS_PROVIDER_UNAVAILABLE', 'observed_satoshis': 0})
        self.assertEqual(result['state'], 'PARTIAL_EVIDENCE')
        self.assertEqual(result['observed_satoshis'], 0)

    def test_invalid_network_rejected(self):
        inv = SimpleNamespace(network='chipnet', receiving_cashaddr=ADDR, amount_satoshis=100)
        self.assertEqual(discover(inv, probe=True)['state'], 'UNSUPPORTED_NETWORK')

    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_no_transactions(self):
        result = discover(INV, probe=True, book_factory=factory({'address': ADDR, 'txids': [], 'txs': 0}), evaluator=evidence)
        self.assertEqual(result['state'], 'NO_TRANSACTIONS_FOUND')
        self.assertFalse(result['history_complete'])