import json
from datetime import datetime, timezone
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v51_live import assess, collect, LiveEvidenceError, _url

TX = 'a' * 64
BH = 'b' * 64
ADDR = 'bitcoincash:qplrn4mdqrakml5yqels9q432nkdkjkd85u3zsmljn'
NOW = datetime(2026, 11, 2, tzinfo=timezone.utc)

class FakeResponse:
    status = 200
    def __init__(self, value): self.value = value
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, size): return json.dumps(self.value).encode()

class FakeOpener:
    def __init__(self, change=None): self.calls=[]; self.change=change
    def open(self, req, timeout):
        self.calls.append(req.full_url)
        if 'nownodes' in req.full_url:
            data = {'txid': TX, 'blockHeight': 100, 'confirmations': 3,
                    'blockHash': BH, 'vout': [{'n': 0, 'value': '10000', 'addresses': [ADDR]}]}
        elif '/transaction/' in req.full_url:
            data = {'context': {'state': 102}, 'data': {TX: {'transaction': {'hash': TX, 'block_id': 100},
                    'outputs': [{'index': 0, 'value': 10000, 'addresses': [ADDR]}]}}}
        else:
            data = {'data': {'100': {'block': {'id': 100, 'hash': BH}}}}
        if self.change: self.change(data, req.full_url)
        return FakeResponse(data)

class V51LiveTests(SimpleTestCase):
    def test_disabled(self):
        with patch.dict('os.environ', {'BCHFLOW_V51B_ENABLE_LIVE': '0'}):
            self.assertIn('live_disabled', assess(TX)['reasons'])

    def test_no_key(self):
        with patch.dict('os.environ', {'BCHFLOW_V51B_ENABLE_LIVE': '1', 'BCHFLOW_V48_PRIMARY_KEY': ''}):
            self.assertIn('missing_or_invalid_nownodes_key', assess(TX)['reasons'])

    def test_http_rejected(self):
        with self.assertRaises(LiveEvidenceError): _url('http://bchbook.nownodes.io', 'bchbook.nownodes.io')

    def test_wrong_host(self):
        with self.assertRaises(LiveEvidenceError): _url('https://example.org', 'bchbook.nownodes.io')

    def test_valid_comparison_no_settlement(self):
        with patch.dict('os.environ', {'BCHFLOW_V51B_ENABLE_LIVE': '1', 'BCHFLOW_V48_PRIMARY_KEY': 'dummy'}):
            opener = FakeOpener()
            result = assess(TX, opener=opener, now=NOW)
        self.assertEqual(result['comparison'], 'consistent_unverified_sources')
        self.assertFalse(result['independent_corroboration'])
        self.assertFalse(result['payment_created'])
        self.assertFalse(result['settlement_authorized'])
        self.assertEqual(len(opener.calls), 3)

    def test_output_disagreement(self):
        def change(data, url):
            if '/transaction/' in url: data['data'][TX]['outputs'][0]['value'] = 9999
        with patch.dict('os.environ', {'BCHFLOW_V51B_ENABLE_LIVE': '1', 'BCHFLOW_V48_PRIMARY_KEY': 'dummy'}):
            result = assess(TX, opener=FakeOpener(change), now=NOW)
        self.assertIn('output_disagreement', result['reasons'])

    def test_missing_tip_blocks(self):
        def change(data, url):
            if '/transaction/' in url: data['context'] = {}
        with patch.dict('os.environ', {'BCHFLOW_V51B_ENABLE_LIVE': '1', 'BCHFLOW_V48_PRIMARY_KEY': 'dummy'}):
            result = assess(TX, opener=FakeOpener(change), now=NOW)
        self.assertIn('secondary_tip_unavailable', result['reasons'])

    def test_invalid_txid(self):
        with patch.dict('os.environ', {'BCHFLOW_V51B_ENABLE_LIVE': '1'}):
            self.assertIn('invalid_txid', assess('wrong')['reasons'])
