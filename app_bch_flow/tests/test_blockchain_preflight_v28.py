"""V2.8 configuration safety regression tests; no network, no database."""
import os
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.runtime_v26 import provider_status, observe_configured

class ProviderPreflightV28Tests(SimpleTestCase):
    def test_default_disabled(self):
        with patch.dict(os.environ, {}, clear=True):
            status, providers = provider_status()
            self.assertEqual(status['state'], 'DISABLED')
            self.assertFalse(status['ready'])
            self.assertEqual(providers, ())

    def test_enabled_without_endpoints_is_not_ready(self):
        with patch.dict(os.environ, {'BCHFLOW_V26_ENABLE_OBSERVATION':'1'}, clear=True):
            status, providers = provider_status()
            self.assertEqual(status['state'], 'INCOMPLETE_CONFIGURATION')
            self.assertEqual(providers, ())

    def test_reject_duplicate_origins(self):
        env={'BCHFLOW_V26_ENABLE_OBSERVATION':'1', 'BCHFLOW_V26_PROVIDER_A_URL':'https://example.org', 'BCHFLOW_V26_PROVIDER_B_URL':'https://example.org/'}
        with patch.dict(os.environ, env, clear=True):
            status, providers = provider_status()
            self.assertFalse(status['ready'])
            self.assertEqual(len(providers), 1)
            self.assertEqual(status['providers'][1]['state'], 'DUPLICATE_ORIGIN')

    def test_reject_insecure_url(self):
        env={'BCHFLOW_V26_ENABLE_OBSERVATION':'1', 'BCHFLOW_V26_PROVIDER_A_URL':'http://example.org', 'BCHFLOW_V26_PROVIDER_B_URL':'https://example.net'}
        with patch.dict(os.environ, env, clear=True):
            status, _ = provider_status()
            self.assertFalse(status['ready'])
            self.assertEqual(status['providers'][0]['state'], 'INVALID_CONFIGURATION')

    def test_distinct_https_origins_are_ready_not_tested(self):
        env={'BCHFLOW_V26_ENABLE_OBSERVATION':'1', 'BCHFLOW_V26_PROVIDER_A_URL':'https://example.org', 'BCHFLOW_V26_PROVIDER_B_URL':'https://example.net'}
        with patch.dict(os.environ, env, clear=True):
            status, providers = provider_status()
            self.assertTrue(status['ready'])
            self.assertEqual(status['state'], 'READY_NOT_TESTED')
            self.assertEqual(len(providers), 2)

    def test_incomplete_config_fails_closed_without_network(self):
        with patch.dict(os.environ, {'BCHFLOW_V26_ENABLE_OBSERVATION':'1'}, clear=True):
            result=observe_configured('bitcoincash:qz9h7mng9zhu963c8umgnyh6ehhw69553q8uz8dm0v')
            self.assertEqual(result.state, 'DISABLED')
            self.assertFalse(result.verified_payment)
            self.assertFalse(result.settlement_authorized)
