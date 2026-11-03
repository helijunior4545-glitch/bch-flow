"""V2.9.1 tests: all HTTP mocked, no database access."""
import os
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.single_health_v291 import diagnose_one
from app_bch_flow.blockchain.engine_v25.blockbook_v26 import BlockbookProvider
from app_bch_flow.blockchain.engine_v25.engine import ProviderFailure

ENV = {'BCHFLOW_V26_PROVIDER_A_URL': 'https://bchbook.nownodes.io',
       'BCHFLOW_V26_PROVIDER_A_KEY': 'fake-test-key',
       'BCHFLOW_V26_ENABLE_OBSERVATION': '0'}
HEALTHY = {'blockbook': {'coin': 'Bcash', 'inSync': True, 'initialSync': False},
           'backend': {'chain': 'main'}}


class SingleProviderV291Tests(SimpleTestCase):
    def test_missing_configuration(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(diagnose_one()['state'], 'NOT_CONFIGURED')

    def test_configuration_only_does_not_probe(self):
        with patch.dict(os.environ, ENV, clear=True), patch.object(BlockbookProvider, '_get') as get:
            result = diagnose_one()
            self.assertEqual(result['state'], 'CONFIGURED_NOT_TESTED')
            self.assertFalse(result['probed'])
            get.assert_not_called()

    def test_bcash_healthy_with_observation_disabled(self):
        with patch.dict(os.environ, ENV, clear=True), patch.object(BlockbookProvider, '_get', return_value=HEALTHY) as get:
            result = diagnose_one(probe=True)
            self.assertEqual(result['state'], 'HEALTHY')
            self.assertTrue(result['probed'])
            get.assert_called_once_with('/api')

    def test_wrong_coin(self):
        with patch.dict(os.environ, ENV, clear=True), patch.object(BlockbookProvider, '_get', return_value={**HEALTHY, 'blockbook': {**HEALTHY['blockbook'], 'coin': 'BTC'}}):
            self.assertEqual(diagnose_one(probe=True)['state'], 'WRONG_NETWORK')

    def test_unsynced(self):
        with patch.dict(os.environ, ENV, clear=True), patch.object(BlockbookProvider, '_get', return_value={**HEALTHY, 'blockbook': {**HEALTHY['blockbook'], 'inSync': False}}):
            self.assertEqual(diagnose_one(probe=True)['state'], 'NOT_SYNCED')

    def test_auth_failure_no_secret_leak(self):
        with patch.dict(os.environ, ENV, clear=True), patch.object(BlockbookProvider, '_get', side_effect=ProviderFailure('provider_auth_error')):
            result = diagnose_one(probe=True)
            self.assertEqual(result['state'], 'PROVIDER_AUTH_ERROR')
            self.assertNotIn('fake-test-key', str(result))

    def test_invalid_endpoint(self):
        with patch.dict(os.environ, {'BCHFLOW_V26_PROVIDER_A_URL': 'http://example.org'}, clear=True):
            self.assertEqual(diagnose_one(probe=True)['state'], 'INVALID_CONFIGURATION')

    def test_invalid_suffix(self):
        with self.assertRaises(ValueError):
            diagnose_one('C')

    def test_second_provider_independent(self):
        with patch.dict(os.environ, {'BCHFLOW_V26_PROVIDER_B_URL': 'https://example.net'}, clear=True):
            self.assertEqual(diagnose_one('B')['state'], 'CONFIGURED_NOT_TESTED')
