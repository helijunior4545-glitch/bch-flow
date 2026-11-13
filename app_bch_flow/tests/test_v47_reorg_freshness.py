from dataclasses import replace
from datetime import datetime, timedelta, timezone
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v47_reorg_freshness import (
    ChainSnapshot, FreshnessInputError, assess_chain_freshness,
)

NOW = datetime(2026, 11, 2, 12, 0, tzinfo=timezone.utc)
TX = 'a' * 64
BLOCK = 'b' * 64


def snapshot(**kwargs):
    data = dict(txid=TX, network='mainnet', block_hash=BLOCK,
                block_height=100, tip_height=103, confirmations=4,
                observed_at=NOW, provider_hosts=('a.example', 'b.example'),
                corroborated=True, outpoints=((0, 10000),))
    data.update(kwargs)
    return ChainSnapshot(**data)


class V47FreshnessTests(SimpleTestCase):
    def check(self, previous=None, current=None, **kwargs):
        return assess_chain_freshness(previous or snapshot(), current or snapshot(), now=NOW, **kwargs)

    def test_fresh_external_evidence_not_settlement(self):
        result = self.check()
        self.assertEqual(result.decision, 'current_external_only')
        self.assertFalse(result.settlement_authorized)

    def test_stale_evidence(self):
        result = self.check(previous=snapshot(observed_at=NOW - timedelta(seconds=121)), current=snapshot(observed_at=NOW - timedelta(seconds=121)))
        self.assertEqual(result.decision, 'stale')

    def test_exact_age_boundary(self):
        self.assertEqual(self.check(previous=snapshot(observed_at=NOW - timedelta(seconds=120)), current=snapshot(observed_at=NOW - timedelta(seconds=120))).decision, 'current_external_only')

    def test_changed_block_hash_reorg(self):
        self.assertEqual(self.check(current=snapshot(block_hash='c' * 64)).decision, 'reorg_suspected')

    def test_block_height_change_reorg(self):
        current = snapshot(block_height=101, confirmations=3)
        self.assertEqual(self.check(current=current).decision, 'reorg_suspected')

    def test_tip_regression_reorg(self):
        current = snapshot(tip_height=102, confirmations=3)
        self.assertIn('tip_height_regressed', self.check(current=current).reasons)

    def test_confirmation_regression_reorg(self):
        current = snapshot(tip_height=102, confirmations=3)
        self.assertIn('confirmations_regressed', self.check(current=current).reasons)

    def test_outpoint_change_blocks(self):
        self.assertEqual(self.check(current=snapshot(outpoints=((1, 10000),))).decision, 'blocked')

    def test_txid_change_blocks(self):
        self.assertEqual(self.check(current=snapshot(txid='d' * 64)).decision, 'blocked')

    def test_missing_corroboration_blocks(self):
        self.assertEqual(self.check(current=snapshot(corroborated=False)).decision, 'blocked')

    def test_future_observation_blocks(self):
        self.assertEqual(self.check(current=snapshot(observed_at=NOW + timedelta(seconds=11))).decision, 'blocked')

    def test_time_regression_blocks(self):
        old = snapshot(observed_at=NOW)
        current = snapshot(observed_at=NOW - timedelta(seconds=1))
        self.assertEqual(self.check(previous=old, current=current).decision, 'blocked')

    def test_confirmation_threshold_blocks(self):
        current = snapshot(tip_height=103, block_height=102, confirmations=2)
        self.assertEqual(self.check(previous=current, current=current, min_confirmations=3).decision, 'blocked')

    def test_inconsistent_confirmations_fail_closed(self):
        with self.assertRaises(FreshnessInputError):
            self.check(current=snapshot(confirmations=100))

    def test_duplicate_provider_host_fail_closed(self):
        with self.assertRaises(FreshnessInputError):
            self.check(current=snapshot(provider_hosts=('A.example', 'a.example')))

    def test_naive_timestamp_fail_closed(self):
        with self.assertRaises(FreshnessInputError):
            self.check(current=snapshot(observed_at=datetime(2026, 11, 2)))

    def test_zero_age_is_not_persistent_authorization(self):
        result = self.check()
        self.assertFalse(result.settlement_authorized)
        self.assertEqual(result.warning, 'EXTERNAL EVIDENCE ONLY; NO CONSENSUS PROOF OR SETTLEMENT')
