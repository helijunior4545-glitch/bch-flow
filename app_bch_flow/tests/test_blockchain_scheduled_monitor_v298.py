"""Offline regression tests for V2.9.8; no network and no PostgreSQL required."""
import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.scheduled_monitor_v298 import (
    observe, differences, read_snapshot, save_snapshot,
)


def invoice(n=1):
    return SimpleNamespace(id=str(n), network='mainnet', receiving_cashaddr='bitcoincash:qqqq', amount_satoshis=100)


class ScheduledMonitorV298Tests(SimpleTestCase):
    def test_no_probe_no_provider_call(self):
        spy = Mock()
        result, changes = observe([invoice()], discoverer=spy)
        spy.assert_not_called()
        self.assertEqual(result['state'], 'NOT_TESTED')
        self.assertEqual(changes, [])

    def test_observation_flags_remain_false(self):
        result, _ = observe([invoice()], probe=True, discoverer=lambda *a, **kw: {
            'state': 'NO_TRANSACTIONS_FOUND', 'observed_satoshis': 0})
        for key in ('payment_verified', 'utxo_consensus', 'settlement_authorized', 'database_writes'):
            self.assertIs(result[key], False)

    def test_first_observation(self):
        result, changes = observe([invoice()], probe=True, discoverer=lambda *a, **kw: {
            'state': 'NO_TRANSACTIONS_FOUND', 'observed_satoshis': 0})
        self.assertEqual(changes, [{'invoice_id': '1', 'change': 'FIRST_OBSERVATION'}])

    def test_no_change(self):
        result, _ = observe([invoice()], probe=True, discoverer=lambda *a, **kw: {
            'state': 'NO_TRANSACTIONS_FOUND', 'observed_satoshis': 0})
        self.assertEqual(differences(result, result), [])

    def test_evidence_changed(self):
        old = {'reports': [{'invoice_id': '1', 'state': 'NO_TRANSACTIONS_FOUND', 'observed_satoshis': 0}]}
        new = {'reports': [{'invoice_id': '1', 'state': 'PARTIAL_EVIDENCE', 'observed_satoshis': 50}]}
        self.assertEqual(differences(old, new)[0]['fields'], ['state', 'observed_satoshis'])

    def test_snapshot_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'snapshot.json'
            save_snapshot(p, 'org-1', {'state': 'OBSERVATION_COMPLETE_FOR_BOUNDED_BATCH', 'reports': []})
            self.assertEqual(read_snapshot(p, 'org-1')['organization_id'], 'org-1')
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)

    def test_snapshot_wrong_org_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'snapshot.json'
            save_snapshot(p, 'org-1', {'reports': []})
            with self.assertRaises(ValueError):
                read_snapshot(p, 'org-2')

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            real = Path(d) / 'real.json'
            real.write_text('{}')
            link = Path(d) / 'link.json'
            link.symlink_to(real)
            with self.assertRaises(ValueError):
                read_snapshot(link, 'org-1')

    def test_provider_exception_is_sanitized(self):
        def bad(*a, **kw):
            raise RuntimeError('SECRET_API_KEY')
        result, _ = observe([invoice()], probe=True, discoverer=bad)
        self.assertNotIn('SECRET_API_KEY', json.dumps(result))
        self.assertEqual(result['state'], 'PARTIAL_MONITORING')

    def test_snapshot_omits_candidate_payloads(self):
        result, _ = observe([invoice()], probe=True, discoverer=lambda *a, **kw: {
            'state': 'NO_TRANSACTIONS_FOUND', 'candidates': [{'token': 'secret'}], 'observed_satoshis': 0})
        self.assertNotIn('secret', json.dumps(result))
