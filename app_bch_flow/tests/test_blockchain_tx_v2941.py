"""V2.9.4.1: Blockbook direct vout.hex compatibility; no network or DB writes."""
import os
from unittest.mock import Mock, patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.transaction_validation_v294 import _outputs, compare_tx

TX = 'a' * 64
BLOCK = 'b' * 64
ENV = {
    'BCHFLOW_V26_PROVIDER_A_URL': 'https://bchbook.nownodes.io',
    'BCHFLOW_V26_PROVIDER_A_KEY': 'fake-key',
    'BCHFLOW_V292_QUICKNODE_RPC_URL': 'https://test.bch-mainnet.quiknode.pro/fake-token/',
}
STATUS = {'blockbook': {'coin': 'Bcash', 'inSync': True, 'initialSync': False},
          'backend': {'chain': 'main', 'blocks': 975771}}
BOOK = {'txid': TX, 'blockHash': BLOCK,
        'vout': [{'n': 0, 'value': '1', 'hex': '76a9'}]}
RPC = {'txid': TX, 'blockhash': BLOCK,
       'vout': [{'n': 0, 'value': '0.00000001', 'scriptPubKey': {'hex': '76a9'}}]}

def factory(*args, **kwargs):
    obj = Mock()
    obj._get.side_effect = lambda path: STATUS if path == '/api' else BOOK
    return obj

def rpc(url, method, params=()):
    return {'chain': 'main', 'initialblockdownload': False} if method == 'getblockchaininfo' else RPC

class V2941Tests(SimpleTestCase):
    def test_blockbook_direct_hex_normalized(self):
        self.assertEqual(_outputs(BOOK, source='blockbook'), {0: (1, '76a9')})

    def test_rpc_nested_hex_normalized(self):
        self.assertEqual(_outputs(RPC, source='rpc'), {0: (1, '76a9')})

    def test_legacy_blockbook_nested_hex_supported(self):
        old = {'vout': [{'n': 0, 'value': '1', 'scriptPubKey': {'hex': '76a9'}}]}
        self.assertEqual(_outputs(old, source='blockbook'), {0: (1, '76a9')})

    def test_conflicting_blockbook_scripts_rejected(self):
        bad = {'vout': [{'n': 0, 'value': '1', 'hex': '76a9', 'scriptPubKey': {'hex': '76aa'}}]}
        with self.assertRaises(ValueError):
            _outputs(bad, source='blockbook')

    def test_invalid_script_rejected(self):
        for value in ('zz', '7', 17, None):
            with self.subTest(value=value):
                bad = {'vout': [{'n': 0, 'value': '1', 'hex': value}]}
                with self.assertRaises(ValueError):
                    _outputs(bad, source='blockbook')

    def test_rpc_does_not_accept_direct_hex_only(self):
        with self.assertRaises(ValueError):
            _outputs(BOOK, source='rpc')

    def test_live_shape_matches_without_payment_authorization(self):
        with patch.dict(os.environ, ENV, clear=True):
            result = compare_tx(TX, probe=True, book_factory=factory, rpc=rpc)
        self.assertEqual(result['state'], 'MATCHING_TRANSACTION')
        self.assertTrue(result['matching_transaction'])
        self.assertFalse(result['payment_verified'])
        self.assertFalse(result['settlement_authorized'])
        self.assertFalse(result['utxo_consensus'])
