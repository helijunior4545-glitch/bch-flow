"""Offline tests for V2.9: never perform network requests."""
from unittest.mock import Mock
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.health_v29 import diagnose, inspect_status
from app_bch_flow.blockchain.engine_v25.engine import ProviderFailure


def healthy():
    return {'blockbook': {'coin':'BCH', 'inSync': True, 'initialSync': False}, 'backend': {'chain':'main'}}


def configured(providers, ready=True, state='READY_NOT_TESTED'):
    return lambda: ({'state':state, 'ready':ready, 'providers':()}, tuple(providers))


class V29HealthTests(SimpleTestCase):
    def test_no_probe_no_http(self):
        a=Mock(name='a'); a.name='a'
        b=Mock(name='b'); b.name='b'
        result=diagnose(status_provider=configured([a,b]))
        self.assertEqual(result['overall'],'NOT_TESTED')
        a._get.assert_not_called(); b._get.assert_not_called()

    def test_disabled_never_probes_even_when_requested(self):
        a=Mock(); a.name='a'
        result=diagnose(probe=True,status_provider=configured([a],False,'DISABLED'))
        self.assertEqual(result['overall'],'DISABLED')
        a._get.assert_not_called()

    def test_incomplete_never_probes(self):
        a=Mock(); a.name='a'
        result=diagnose(probe=True,status_provider=configured([a],False,'INCOMPLETE_CONFIGURATION'))
        self.assertEqual(result['overall'],'INCOMPLETE_CONFIGURATION')
        a._get.assert_not_called()

    def test_two_healthy(self):
        a=Mock(); a.name='a'; a._get.return_value=healthy()
        b=Mock(); b.name='b'; b._get.return_value=healthy()
        result=diagnose(probe=True,status_provider=configured([a,b]))
        self.assertEqual(result['overall'],'HEALTHY')
        a._get.assert_called_once_with('/api'); b._get.assert_called_once_with('/api')

    def test_wrong_network(self):
        x=healthy(); x['blockbook']['coin']='BTC'
        self.assertEqual(inspect_status(x),'WRONG_NETWORK')

    def test_unsynced(self):
        x=healthy(); x['blockbook']['inSync']=False
        self.assertEqual(inspect_status(x),'NOT_SYNCED')

    def test_missing_fields(self):
        self.assertEqual(inspect_status({'blockbook':{}}),'INVALID_RESPONSE')

    def test_one_failing_provider_is_degraded(self):
        a=Mock(); a.name='a'; a._get.return_value=healthy()
        b=Mock(); b.name='b'; b._get.side_effect=ProviderFailure('provider_timeout')
        result=diagnose(probe=True,status_provider=configured([a,b]))
        self.assertEqual(result['overall'],'DEGRADED')
        self.assertEqual(result['providers'][1]['state'],'PROVIDER_TIMEOUT')

    def test_unexpected_error_does_not_leak(self):
        a=Mock(); a.name='a'; a._get.side_effect=RuntimeError('secret-api-key')
        b=Mock(); b.name='b'; b._get.return_value=healthy()
        result=diagnose(probe=True,status_provider=configured([a,b]))
        self.assertNotIn('secret-api-key',str(result))
