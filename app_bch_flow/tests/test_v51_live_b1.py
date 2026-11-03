"""BCH Flow V5.1-B.1: isolated adapter and failure-stage regression tests."""
import json
from datetime import datetime, timezone
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v51_live import assess, _outputs, LiveEvidenceError

TX = 'a' * 64
BH = 'b' * 64
ADDR = 'bitcoincash:qplrn4mdqrakml5yqels9q432nkdkjkd85u3zsmljn'
NOW = datetime(2026, 11, 2, tzinfo=timezone.utc)

class Response:
    status = 200
    def __init__(self, payload): self.payload = payload
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, count): return json.dumps(self.payload).encode()

class Opener:
    def __init__(self, change=None): self.change = change
    def open(self, req, timeout):
        url = req.full_url
        if 'nownodes' in url:
            payload = {'txid': TX, 'blockHeight': 100, 'confirmations': 3,
                       'blockHash': BH, 'vout': [{'n': 0, 'value': '10000', 'addresses': [ADDR]}]}
        elif '/transaction/' in url:
            payload = {'context': {'state': 102}, 'data': {TX: {
                'transaction': {'hash': TX, 'block_id': 100},
                'outputs': [{'index': 0, 'value': 10000, 'recipient': ADDR}]}}}
        else:
            payload = {'data': {'100': {'block': {'id': 100, 'hash': BH}}}}
        if self.change: self.change(payload, url)
        return Response(payload)

class LiveB1Tests(SimpleTestCase):
    def run_assessment(self, change=None):
        with patch.dict('os.environ', {'BCHFLOW_V51B_ENABLE_LIVE': '1',
                                     'BCHFLOW_V48_PRIMARY_KEY': 'dummy'}):
            return assess(TX, opener=Opener(change), now=NOW)

    def test_blockchair_recipient_cashaddr(self):
        result = self.run_assessment()
        self.assertEqual(result['comparison'], 'consistent_unverified_sources')
        self.assertIs(result['settlement_authorized'], False)

    def test_legacy_recipient_is_blocked_not_guessed(self):
        def change(data, url):
            if '/transaction/' in url: data['data'][TX]['outputs'][0]['recipient'] = '1LegacyBitcoinAddress'
        result = self.run_assessment(change)
        self.assertEqual(result['comparison'], 'blocked')
        self.assertIn('blockchair_tx_parse:unsupported_address_format', result['reasons'])

    def test_missing_recipient_is_blocked(self):
        def change(data, url):
            if '/transaction/' in url: del data['data'][TX]['outputs'][0]['recipient']
        result = self.run_assessment(change)
        self.assertIn('blockchair_tx_parse:missing_addresses', result['reasons'])

    def test_missing_block_hash_is_diagnosed(self):
        def change(data, url):
            if '/dashboards/block/' in url: del data['data']['100']['block']['hash']
        result = self.run_assessment(change)
        self.assertIn('blockchair_block_parse:secondary_block_hash_missing', result['reasons'])

    def test_invalid_txid_type_fails_closed(self):
        def change(data, url):
            if 'nownodes' in url: data['txid'] = None
        result = self.run_assessment(change)
        self.assertIn('nownodes_tx_parse:primary_txid_mismatch', result['reasons'])

    def test_no_settlement_even_if_outputs_match(self):
        result = self.run_assessment()
        for flag in ('independent_corroboration', 'invoice_attributed', 'payment_created', 'settlement_authorized'):
            self.assertIs(result[flag], False)

    def test_noncontiguous_vout_blocked(self):
        with self.assertRaises(LiveEvidenceError):
            _outputs([{'index': 2, 'value': 10000, 'recipient': ADDR}], 'blockchair')
