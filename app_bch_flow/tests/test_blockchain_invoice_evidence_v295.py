"""V2.9.5 isolated, offline fail-closed invoice evidence tests."""
from types import SimpleNamespace
from unittest.mock import Mock, patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.invoice_evidence_v295 import evaluate

TX = 'a' * 64
ADDR = 'bitcoincash:qtest'
INV = SimpleNamespace(network='mainnet', receiving_cashaddr=ADDR, amount_satoshis=100)

def compare(txid, probe=False):
    return {'state': 'MATCHING_TRANSACTION', 'matching_transaction': True}

def factory(*args, **kwargs):
    book = Mock()
    book._get.return_value = {'txid': TX, 'confirmations': 3, 'vout': [
        {'n': 0, 'value': '125', 'hex': '76a9', 'addresses': [ADDR]},
        {'n': 1, 'value': '5', 'hex': '76a9', 'addresses': ['bitcoincash:other']} ]}
    return book

class InvoiceEvidenceV295Tests(SimpleTestCase):
    def test_no_probe_no_network(self):
        book = Mock()
        result = evaluate(INV, TX, compare=book, book_factory=book)
        self.assertEqual(result['state'], 'NOT_TESTED')
        book.assert_not_called()
    def test_wrong_network_fails(self):
        result = evaluate(SimpleNamespace(network='chipnet'), TX, probe=True)
        self.assertEqual(result['state'], 'UNSUPPORTED_NETWORK')
    def test_invalid_txid_fails(self):
        self.assertEqual(evaluate(INV, 'abc', probe=True)['state'], 'INVALID_TXID')
    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_matching_output_does_not_verify_payment(self):
        result = evaluate(INV, TX, probe=True, compare=compare, book_factory=factory)
        self.assertEqual(result['state'], 'ADDRESS_OUTPUT_OBSERVED')
        self.assertEqual(result['observed_satoshis'], 125)
        self.assertEqual(result['matched_output_indexes'], [0])
        self.assertEqual(result['confirmations_reported'], 3)
        self.assertFalse(result['payment_verified'])
        self.assertFalse(result['settlement_authorized'])
        self.assertFalse(result['utxo_consensus'])
    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_unmatched_output(self):
        other = SimpleNamespace(network='mainnet', receiving_cashaddr='bitcoincash:unmatched', amount_satoshis=100)
        result = evaluate(other, TX, probe=True, compare=compare, book_factory=factory)
        self.assertEqual(result['state'], 'NO_ADDRESS_OUTPUT')
        self.assertEqual(result['observed_satoshis'], 0)
    def test_cross_provider_failure_no_blockbook_fetch(self):
        book = Mock()
        result = evaluate(INV, TX, probe=True, compare=lambda *a, **kw: {'state': 'OUTPUT_CONFLICT'}, book_factory=book)
        self.assertEqual(result['state'], 'CROSS_PROVIDER_OUTPUT_CONFLICT')
        book.assert_not_called()
    @patch.dict('os.environ', {'BCHFLOW_V26_PROVIDER_A_URL': 'https://example.org'})
    def test_missing_address_list_never_infers_from_script(self):
        book = factory()
        book._get.return_value['vout'][0].pop('addresses')
        result = evaluate(INV, TX, probe=True, compare=compare, book_factory=lambda *a, **kw: book)
        self.assertEqual(result['state'], 'NO_ADDRESS_OUTPUT')
