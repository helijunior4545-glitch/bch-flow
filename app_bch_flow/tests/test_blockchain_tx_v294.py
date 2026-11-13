"""Offline transaction cross-validation tests; no network and no database writes."""
import os
from unittest.mock import Mock, patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.transaction_validation_v294 import compare_tx, _sats

TX = 'a' * 64
BLOCK = 'b' * 64
URL = 'https://late-misty-daylight.bch-mainnet.quiknode.pro/fake-token/'
ENV = {'BCHFLOW_V26_PROVIDER_A_URL': 'https://bchbook.nownodes.io',
       'BCHFLOW_V26_PROVIDER_A_KEY': 'fake-key', 'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}
STATUS = {'blockbook': {'coin': 'Bcash', 'inSync': True, 'initialSync': False},
          'backend': {'chain': 'main', 'blocks': 975771}}
A = {'txid': TX, 'blockHash': BLOCK, 'vout': [{'n': 0, 'value': '1', 'scriptPubKey': {'hex': '76a9'}}]}
B = {'txid': TX, 'blockhash': BLOCK, 'vout': [{'n': 0, 'value': '0.00000001', 'scriptPubKey': {'hex': '76a9'}}]}

def factory(*args, **kwargs):
    book = Mock()
    book._get.side_effect = lambda path: STATUS if path == '/api' else A
    return book

def rpc(url, method, params=()):
    return {'chain': 'main', 'initialblockdownload': False} if method == 'getblockchaininfo' else B

class TransactionTests(SimpleTestCase):
    def test_invalid_txid(self):
        self.assertEqual(compare_tx('not-a-txid', probe=True)['state'], 'INVALID_TXID')
    def test_missing_configuration(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(compare_tx(TX, probe=True)['state'], 'NOT_CONFIGURED')
    def test_no_network_default(self):
        with patch.dict(os.environ, ENV, clear=True):
            book = Mock()
            result = compare_tx(TX, book_factory=lambda *a, **k: book)
            self.assertEqual(result['state'], 'NOT_TESTED')
            book._get.assert_not_called()
    def test_match_never_verifies_payment(self):
        with patch.dict(os.environ, ENV, clear=True):
            result = compare_tx(TX, probe=True, book_factory=factory, rpc=rpc)
            self.assertEqual(result['state'], 'MATCHING_TRANSACTION')
            self.assertTrue(result['matching_transaction'])
            self.assertFalse(result['payment_verified'])
            self.assertFalse(result['utxo_consensus'])
            self.assertFalse(result['settlement_authorized'])
    def test_block_conflict(self):
        with patch.dict(os.environ, ENV, clear=True):
            def altered(url, method, params=()):
                return {'**': None, 'chain': 'main'} if method == 'getblockchaininfo' else {**B, 'blockhash': 'c'*64}
            self.assertEqual(compare_tx(TX, probe=True, book_factory=factory, rpc=altered)['state'], 'BLOCK_HASH_CONFLICT')
    def test_output_conflict(self):
        with patch.dict(os.environ, ENV, clear=True):
            def altered(url, method, params=()):
                return {'chain': 'main'} if method == 'getblockchaininfo' else {**B, 'vout': [{**B['vout'][0], 'value': '0.00000002'}]}
            self.assertEqual(compare_tx(TX, probe=True, book_factory=factory, rpc=altered)['state'], 'OUTPUT_CONFLICT')
    def test_unavailable_rpc_is_not_conflict(self):
        with patch.dict(os.environ, ENV, clear=True):
            def broken(url, method, params=()):
                if method == 'getblockchaininfo': return {'chain': 'main'}
                raise ValueError('secret-token')
            result = compare_tx(TX, probe=True, book_factory=factory, rpc=broken)
            self.assertEqual(result['state'], 'RPC_TX_UNAVAILABLE')
            self.assertNotIn('secret-token', str(result))
    def test_unconfirmed_is_insufficient(self):
        with patch.dict(os.environ, ENV, clear=True):
            def altered(url, method, params=()):
                return {'chain': 'main'} if method == 'getblockchaininfo' else {**B, 'blockhash': None}
            self.assertEqual(compare_tx(TX, probe=True, book_factory=factory, rpc=altered)['state'], 'INSUFFICIENT_BLOCK_EVIDENCE')
    def test_amount_precision(self):
        self.assertEqual(_sats('0.00000001'), 1)
        with self.assertRaises(ValueError): _sats('0.000000001')
        with self.assertRaises(ValueError): _sats('NaN')
    def test_script_mismatch(self):
        with patch.dict(os.environ, ENV, clear=True):
            def altered(url, method, params=()):
                return {'chain': 'main'} if method == 'getblockchaininfo' else {**B, 'vout': [{**B['vout'][0], 'scriptPubKey': {'hex': '76aa'}}]}
            self.assertEqual(compare_tx(TX, probe=True, book_factory=factory, rpc=altered)['state'], 'OUTPUT_CONFLICT')
