"""Offline V2.9.3 contract tests: no HTTP calls or DB writes."""
import os
from unittest.mock import Mock, patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.cross_validation_v293 import compare

URL = 'https://late-misty-daylight.bch-mainnet.quiknode.pro/test-token/'
ENV = {'BCHFLOW_V26_PROVIDER_A_URL': 'https://bchbook.nownodes.io',
       'BCHFLOW_V26_PROVIDER_A_KEY': 'fake-key', 'BCHFLOW_V292_QUICKNODE_RPC_URL': URL}
BOOK = {'blockbook': {'coin': 'Bcash', 'inSync': True, 'initialSync': False},
        'backend': {'chain': 'main', 'blocks': 975771}}
INFO = {'chain': 'main', 'blocks': 975771, 'headers': 975771, 'initialblockdownload': False}
HASH = 'a' * 64


def factory(*args, **kwargs):
    obj = Mock()
    obj._get.side_effect = lambda path: BOOK if path == '/api' else {'blockHash': HASH}
    return obj


def rpc(url, method, params=()):
    return INFO if method == 'getblockchaininfo' else HASH


class CrossV293Tests(SimpleTestCase):
    def test_unconfigured(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(compare(probe=True)['state'], 'NOT_CONFIGURED')

    def test_no_network_by_default(self):
        with patch.dict(os.environ, ENV, clear=True):
            provider = Mock()
            result = compare(book_factory=lambda *a, **k: provider)
            self.assertEqual(result['state'], 'NOT_TESTED')
            provider._get.assert_not_called()

    def test_matching_hash(self):
        with patch.dict(os.environ, ENV, clear=True):
            result = compare(probe=True, book_factory=factory, rpc=rpc)
        self.assertEqual(result['state'], 'MATCHING_BLOCK')
        self.assertEqual(result['compared_height'], 975765)
        self.assertTrue(result['matching_block'])
        self.assertFalse(result['payment_verified'])
        self.assertFalse(result['utxo_consensus'])

    def test_hash_conflict(self):
        with patch.dict(os.environ, ENV, clear=True):
            result = compare(probe=True, book_factory=factory,
                             rpc=lambda url, method, params=(): INFO if method == 'getblockchaininfo' else 'b'*64)
        self.assertEqual(result['state'], 'BLOCK_HASH_CONFLICT')
        self.assertFalse(result['matching_block'])

    def test_height_divergence(self):
        with patch.dict(os.environ, ENV, clear=True):
            result = compare(probe=True, book_factory=factory,
                             rpc=lambda url, method, params=(): {**INFO, 'blocks': 975700, 'headers': 975700})
        self.assertEqual(result['state'], 'HEIGHT_DIVERGENCE')

    def test_wrong_network(self):
        with patch.dict(os.environ, ENV, clear=True):
            result = compare(probe=True, book_factory=factory,
                             rpc=lambda url, method, params=(): {**INFO, 'chain': 'test'})
        self.assertEqual(result['state'], 'RPC_WRONG_NETWORK')

    def test_secret_never_leaks(self):
        with patch.dict(os.environ, ENV, clear=True):
            def broken(url, method, params=()):
                raise RuntimeError('test-token fake-key')
            result = compare(probe=True, book_factory=factory, rpc=broken)
        self.assertNotIn('test-token', str(result))
        self.assertNotIn('fake-key', str(result))

    def test_invalid_block_hash(self):
        with patch.dict(os.environ, ENV, clear=True):
            result = compare(probe=True, book_factory=factory,
                             rpc=lambda url, method, params=(): INFO if method == 'getblockchaininfo' else 'not-hash')
        self.assertEqual(result['state'], 'PROVIDER_UNAVAILABLE_OR_INVALID_RESPONSE')
