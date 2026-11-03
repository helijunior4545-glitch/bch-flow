"""Offline V2.9.2 tests. No real network, secrets, DB or invoice changes."""
import os
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.quicknode_rpc_v292 import diagnose_rpc
from app_bch_flow.blockchain.engine_v25.hybrid_health_v292 import diagnose_hybrid

URL = 'https://late-misty-daylight.bch-mainnet.quiknode.pro/secret-test-token/'
INFO = {'chain': 'main', 'blocks': 900000, 'headers': 900000, 'initialblockdownload': False}
HASH = 'a' * 64


class HybridV292Tests(SimpleTestCase):
    def test_missing(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(diagnose_rpc()['state'], 'NOT_CONFIGURED')

    def test_no_implicit_network(self):
        with patch.dict(os.environ, {'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}, clear=True):
            with patch('app_bch_flow.blockchain.engine_v25.quicknode_rpc_v292._rpc') as rpc:
                self.assertEqual(diagnose_rpc()['state'], 'CONFIGURED_NOT_TESTED')
                rpc.assert_not_called()

    def test_invalid_endpoints(self):
        for url in ('http://late-misty-daylight.bch-mainnet.quiknode.pro/token/',
                    'https://evil.com/token/', 'https://bch-mainnet.quiknode.pro/token/',
                    'https://late-misty-daylight.bch-mainnet.quiknode.pro/token/?x=1',
                    'https://late-misty-daylight.bch-mainnet.quiknode.pro/'):
            with self.subTest(url=url), patch.dict(os.environ, {'BCHFLOW_V292_QUICKNODE_RPC_URL': url}, clear=True):
                self.assertEqual(diagnose_rpc(probe=True)['state'], 'INVALID_CONFIGURATION')

    def test_healthy(self):
        def rpc(url, method, params=()):
            return INFO if method == 'getblockchaininfo' else HASH
        with patch.dict(os.environ, {'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}, clear=True):
            result = diagnose_rpc(probe=True, rpc=rpc)
        self.assertEqual(result['state'], 'HEALTHY')
        self.assertEqual(result['blocks'], 900000)
        self.assertNotIn('secret-test-token', str(result))

    def test_wrong_network(self):
        with patch.dict(os.environ, {'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}, clear=True):
            result = diagnose_rpc(probe=True, rpc=lambda *a: {**INFO, 'chain': 'test'})
        self.assertEqual(result['state'], 'WRONG_NETWORK')

    def test_unsynced(self):
        with patch.dict(os.environ, {'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}, clear=True):
            result = diagnose_rpc(probe=True, rpc=lambda *a: {**INFO, 'headers': 900100})
        self.assertEqual(result['state'], 'NOT_SYNCED')

    def test_invalid_response(self):
        with patch.dict(os.environ, {'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}, clear=True):
            result = diagnose_rpc(probe=True, rpc=lambda *a: {'chain': 'main', 'blocks': True, 'headers': 1})
        self.assertEqual(result['state'], 'INVALID_RESPONSE')

    def test_rpc_failure_is_sanitized(self):
        with patch.dict(os.environ, {'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}, clear=True):
            def bad(*a):
                raise RuntimeError('secret-test-token')
            result = diagnose_rpc(probe=True, rpc=bad)
        self.assertEqual(result['state'], 'RPC_UNAVAILABLE')
        self.assertNotIn('secret-test-token', str(result))

    def test_hybrid_does_not_claim_utxo_consensus(self):
        with patch('app_bch_flow.blockchain.engine_v25.hybrid_health_v292.diagnose_one', return_value={'state':'HEALTHY'}), patch('app_bch_flow.blockchain.engine_v25.hybrid_health_v292.diagnose_rpc', return_value={'state':'HEALTHY'}):
            result = diagnose_hybrid(probe=True)
        self.assertEqual(result['state'], 'HEALTHY_DIAGNOSTICS_ONLY')
        self.assertFalse(result['utxo_consensus'])
        self.assertFalse(result['payment_verified'])
        self.assertFalse(result['settlement_authorized'])
