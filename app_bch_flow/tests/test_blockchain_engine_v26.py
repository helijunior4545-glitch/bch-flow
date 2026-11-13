"""Offline contract tests: no HTTP or DB."""
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.engine_v25.blockbook_v26 import BlockbookProvider
from app_bch_flow.blockchain.engine_v25.runtime_v26 import observe_configured
from app_bch_flow.blockchain.engine_v25.engine import ProviderFailure

ADDR='bitcoincash:qz9h7mng9zhu963c8umgnyh6ehhw69553q8uz8dm0v'

class V26Tests(TestCase):
    def test_https_origin_only(self):
        for origin in ('http://example.org','https://user:pass@example.org','https://example.org/path','https://example.org:8080','https://example.org/?q=1'):
            with self.assertRaises(ValueError): BlockbookProvider('x',origin)
    def test_disabled_never_calls(self):
        with patch.dict('os.environ', {'BCHFLOW_V26_ENABLE_OBSERVATION':'0'}):
            self.assertEqual(observe_configured(ADDR).state,'DISABLED')
    def test_enabled_without_providers_fails_closed(self):
        # V2.8 contract: an incomplete configuration cannot activate observation.
        with patch.dict('os.environ', {'BCHFLOW_V26_ENABLE_OBSERVATION':'1','BCHFLOW_V26_PROVIDER_A_URL':'','BCHFLOW_V26_PROVIDER_B_URL':''}):
            self.assertEqual(observe_configured(ADDR).state,'DISABLED')
    def test_blockbook_parse(self):
        p=BlockbookProvider('a','https://example.org')
        with patch.object(p,'_get',side_effect=[{'blockbook':{'inSync':True,'initialSync':False,'coin':'BCH'},'backend':{'chain':'main'}}, [{'txid':'a'*64,'vout':0,'value':'1500','confirmations':2}]]):
            snap=p.observe(ADDR)
        self.assertEqual(snap.outpoints[0].satoshis,1500)
    def test_wrong_network_rejected(self):
        p=BlockbookProvider('a','https://example.org')
        with patch.object(p,'_get',return_value={'blockbook':{'inSync':True,'initialSync':False,'coin':'BTC'},'backend':{'chain':'main'}}):
            with self.assertRaises(ProviderFailure): p.observe(ADDR)
    def test_invalid_utxo_rejected(self):
        p=BlockbookProvider('a','https://example.org')
        with patch.object(p,'_get',side_effect=[{'blockbook':{'inSync':True,'initialSync':False,'coin':'BCH'},'backend':{'chain':'main'}}, [{'txid':'a'*64,'vout':True,'value':'1','confirmations':0}]]):
            with self.assertRaises(ProviderFailure): p.observe(ADDR)
