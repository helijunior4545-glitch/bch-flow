"""Offline monitoring tests: no network or database required."""
from types import SimpleNamespace
from unittest.mock import Mock
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.merchant_monitor_v297 import monitor

def inv(n, address='bitcoincash:qqqq'):
    return SimpleNamespace(id=str(n), network='mainnet', receiving_cashaddr=address, amount_satoshis=100)

def discovered(invoice, probe=False):
    return {'state': 'CANDIDATE_OUTPUTS_OBSERVED', 'observed_satoshis': 50, 'candidate_count': 1}

class MerchantMonitorV297Tests(SimpleTestCase):
    def test_no_probe_no_calls(self):
        spy = Mock()
        result = monitor([inv(1)], discoverer=spy)
        self.assertEqual(result['state'], 'NOT_TESTED')
        spy.assert_not_called()

    def test_empty_batch(self):
        self.assertEqual(monitor([], probe=True)['state'], 'NO_OPEN_INVOICES')

    def test_single_invoice_evidence_never_verifies(self):
        result = monitor([inv(1)], probe=True, discoverer=discovered)
        self.assertEqual(result['reports'][0]['state'], 'UNATTRIBUTED_OUTPUT_EVIDENCE')
        self.assertFalse(result['payment_verified'])
        self.assertFalse(result['reports'][0]['attribution_safe'])
        self.assertFalse(result['settlement_authorized'])

    def test_shared_address_detected(self):
        result = monitor([inv(1), inv(2)], probe=True, discoverer=discovered)
        self.assertTrue(all(r['state'] == 'SHARED_ADDRESS_ATTRIBUTION_UNSAFE' for r in result['reports']))

    def test_distinct_address_not_shared(self):
        result = monitor([inv(1, 'bitcoincash:aaaa'), inv(2, 'bitcoincash:bbbb')], probe=True, discoverer=discovered)
        self.assertFalse(any(r['shared_receiving_address'] for r in result['reports']))

    def test_bounded_batch(self):
        with self.assertRaises(ValueError):
            monitor([inv(i) for i in range(11)], probe=True)

    def test_provider_failure_isolated(self):
        def bad(*a, **k): raise RuntimeError('secret provider error')
        result = monitor([inv(1)], probe=True, discoverer=bad)
        self.assertEqual(result['state'], 'PARTIAL_MONITORING')
        self.assertEqual(result['reports'][0]['state'], 'MONITOR_UNAVAILABLE_OR_INVALID')
        self.assertNotIn('secret', str(result))

    def test_invalid_discovery_amount(self):
        result = monitor([inv(1)], probe=True, discoverer=lambda *a, **k: {'state': 'CANDIDATE_OUTPUTS_OBSERVED', 'observed_satoshis': True})
        self.assertEqual(result['state'], 'PARTIAL_MONITORING')

    def test_empty_history(self):
        result = monitor([inv(1)], probe=True, discoverer=lambda *a, **k: {'state': 'NO_TRANSACTIONS_FOUND', 'observed_satoshis': 0})
        self.assertEqual(result['reports'][0]['state'], 'NO_TRANSACTIONS_FOUND')
        self.assertFalse(result['history_complete'])
