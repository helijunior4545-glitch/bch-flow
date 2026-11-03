"""Deterministic, database-free unit tests for V5.0 assessment policy."""
from datetime import datetime, timedelta, timezone
from unittest import TestCase
from app_bch_flow.blockchain.v50_attribution import assess_payment, AttributionError

NOW = datetime(2026, 11, 2, 11, tzinfo=timezone.utc)
TX = 'a' * 64
ADDR = 'bitcoincash:q' + 'a' * 41

def sample():
    obs = dict(schema='bchflow.v49.real_transaction_diagnostic', network='mainnet',
               provider_status='in_sync', assessment='external_single_provider_observation_only',
               payment_created=False, settlement_authorized=False,
               independent_corroboration=False, txid=TX, confirmations=3,
               block_height=98, tip_height=100, observed_at=NOW.isoformat(),
               outputs=[dict(vout=0, satoshis=10000, addresses=[ADDR])])
    inv = dict(id='invoice-1', network='mainnet', status='created',
               amount_satoshis=10000, receiving_cashaddr=ADDR, expires_at=NOW + timedelta(hours=1))
    return obs, inv

class V50Tests(TestCase):
    def check(self, change_obs=None, change_inv=None, **kwargs):
        obs, inv = sample()
        if change_obs: obs.update(change_obs)
        if change_inv: inv.update(change_inv)
        return assess_payment(observation=obs, invoice=inv, now=NOW, coinbase=False, **kwargs)

    def test_single_provider_blocked(self): self.assertIn('no_independent_corroboration', self.check()['reasons'])
    def test_address_mismatch(self): self.assertIn('address_not_found', self.check(change_inv={'receiving_cashaddr': 'bitcoincash:q' + 'b'*41})['reasons'])
    def test_amount_mismatch(self): self.assertIn('amount_mismatch', self.check(change_inv={'amount_satoshis': 10001})['reasons'])
    def test_confirmations(self): self.assertIn('insufficient_confirmations', self.check(change_obs={'confirmations': 1, 'block_height': 100})['reasons'])
    def test_expired(self): self.assertIn('invoice_expired', self.check(change_inv={'expires_at': NOW - timedelta(seconds=1)})['reasons'])
    def test_paid_invoice(self): self.assertIn('invoice_not_payable', self.check(change_inv={'status': 'paid'})['reasons'])
    def test_reserved(self): self.assertIn('outpoint_already_reserved', self.check(reserved_outpoints=[(TX, 0)])['reasons'])
    def test_coinbase(self):
        o, i = sample()
        r = assess_payment(observation=o, invoice=i, now=NOW, coinbase=True)
        self.assertIn('coinbase_or_unverified_transaction_type', r['reasons'])
    def test_unknown_type(self):
        o, i = sample()
        self.assertIn('coinbase_or_unverified_transaction_type', assess_payment(observation=o, invoice=i, now=NOW)['reasons'])
    def test_stale(self): self.assertIn('stale_or_future_observation', self.check(change_obs={'observed_at': (NOW - timedelta(minutes=10)).isoformat()})['reasons'])
    def test_height_mismatch(self): self.assertIn('inconsistent_chain_height', self.check(change_obs={'tip_height': 101})['reasons'])
    def test_wrong_network(self): self.assertIn('network_mismatch', self.check(change_inv={'network': 'testnet'})['reasons'])
    def test_ambiguous_outputs(self):
        o, _ = sample()
        o['outputs'].append(dict(vout=1, satoshis=10000, addresses=[ADDR]))
        self.assertIn('ambiguous_multiple_outputs', self.check(change_obs={'outputs': o['outputs']})['reasons'])
    def test_no_write_flags(self):
        r = self.check()
        self.assertFalse(r['invoice_attributed'])
        self.assertFalse(r['payment_created'])
        self.assertFalse(r['settlement_authorized'])
    def test_duplicate_vout_rejected(self):
        o, i = sample()
        o['outputs'].append(o['outputs'][0].copy())
        with self.assertRaises(AttributionError): assess_payment(observation=o, invoice=i, now=NOW)
    def test_candidate_only_when_corroborated(self):
        r = self.check(change_obs={'independent_corroboration': True})
        self.assertEqual(r['assessment'], 'eligible_for_manual_review_only')
        self.assertFalse(r['settlement_authorized'])
