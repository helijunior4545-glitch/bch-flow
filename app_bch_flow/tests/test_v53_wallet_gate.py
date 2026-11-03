"""Dependency-free V5.3-A policy tests. Run: python -m unittest app_bch_flow.tests.test_v53_wallet_gate"""
import unittest
from types import SimpleNamespace
from app_bch_flow.wallet.v53_ownership_gate import (
    WalletDecision, assess_wallet_connection, authorize_real_receive,
)

class V53WalletGateTests(unittest.TestCase):
    def make_wallet(self, **overrides):
        values = dict(network="mainnet", organization_id="org1", public_address="example-public-address",
                      revoked_at=None, verified_at="untrusted-metadata", proof_method="claimed")
        values.update(overrides)
        return SimpleNamespace(**values)

    def test_missing_wallet(self):
        self.assertEqual(assess_wallet_connection(None).decision, WalletDecision.BLOCKED)
    def test_revoked_wallet(self):
        self.assertEqual(assess_wallet_connection(self.make_wallet(revoked_at="today")).decision, WalletDecision.BLOCKED)
    def test_network_mismatch(self):
        self.assertEqual(assess_wallet_connection(self.make_wallet(network="chipnet")).decision, WalletDecision.BLOCKED)
    def test_organization_mismatch(self):
        self.assertEqual(assess_wallet_connection(self.make_wallet(), expected_organization_id="other").decision, WalletDecision.BLOCKED)
    def test_missing_address(self):
        self.assertEqual(assess_wallet_connection(self.make_wallet(public_address="")).decision, WalletDecision.BLOCKED)
    def test_verified_at_is_not_proof(self):
        decision = assess_wallet_connection(self.make_wallet(), expected_organization_id="org1")
        self.assertEqual(decision.decision, WalletDecision.READY_FOR_PROOF)
        self.assertFalse(decision.can_receive_real_funds)
        self.assertFalse(decision.can_sign)
        self.assertFalse(decision.can_settle)
    def test_real_receive_is_fail_closed(self):
        self.assertEqual(authorize_real_receive().decision, WalletDecision.BLOCKED)

if __name__ == "__main__":
    unittest.main()
