"""No network, DB, or credentials required."""
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.engine_v25.contracts import Outpoint, Snapshot
from app_bch_flow.blockchain.engine_v25.engine import observe, ProviderFailure

ADDRESS = "bitcoincash:qz9h7mng9zhu963c8umgnyh6ehhw69553q8uz8dm0v"
TXID = "a" * 64

class Fake:
    def __init__(self, name, outputs=(), failure=None):
        self.name, self.outputs, self.failure = name, outputs, failure
    def observe(self, address):
        if self.failure:
            raise ProviderFailure(self.failure)
        return Snapshot(self.name, address, "mainnet", tuple(self.outputs))

class EngineTests(TestCase):
    def test_disabled_never_calls_provider(self):
        class Forbidden:
            name = "never"
            def observe(self, address):
                raise AssertionError("network invoked")
        result = observe(ADDRESS, [Forbidden()])
        self.assertEqual(result.state, "DISABLED")

    def test_agreement_not_payment_proof(self):
        out = (Outpoint(TXID, 0, 100000, 2),)
        result = observe(ADDRESS, [Fake("a", out), Fake("b", out)], enabled=True)
        self.assertEqual(result.state, "OBSERVED")
        self.assertTrue(result.provider_agreement)
        self.assertFalse(result.verified_payment)
        self.assertFalse(result.settlement_authorized)

    def test_disagreement_fails_closed(self):
        result = observe(ADDRESS, [Fake("a", ()), Fake("b", (Outpoint(TXID, 0, 100, 1),))], enabled=True)
        self.assertEqual(result.state, "CONFLICT")
        self.assertFalse(result.provider_agreement)

    def test_partial_provider_failure(self):
        result = observe(ADDRESS, [Fake("a", ()), Fake("b", failure="provider_timeout")], enabled=True)
        self.assertEqual(result.state, "DEGRADED")
        self.assertEqual(result.errors, (("b", "provider_timeout"),))

    def test_unavailable(self):
        result = observe(ADDRESS, [Fake("a", failure="provider_auth_error")], enabled=True)
        self.assertEqual(result.state, "UNAVAILABLE")

    def test_invalid_snapshot_rejected(self):
        result = observe(ADDRESS, [Fake("a", (Outpoint(TXID, True, 10, 0),))], enabled=True)
        self.assertEqual(result.state, "UNAVAILABLE")
        self.assertEqual(result.errors[0][1], "provider_invalid_response")

    def test_duplicate_names_fail_closed(self):
        with self.assertRaises(ValueError):
            observe(ADDRESS, [Fake("a"), Fake("a")], enabled=True)
