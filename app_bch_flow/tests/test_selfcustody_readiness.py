"""Testes unitários das barreiras; não substituem integração real."""
import unittest
from app_bch_flow.wallet.selfcustody.readiness import REQUIRED_EVIDENCE, evaluate_live_gate, assert_live_gate

class SelfCustodyReadinessTests(unittest.TestCase):
    def test_empty_evidence_denied(self):
        self.assertFalse(evaluate_live_gate({}, network="mainnet", explicitly_enabled=True).allowed)

    def test_truthy_strings_denied(self):
        evidence = {k: "true" for k in REQUIRED_EVIDENCE}
        self.assertFalse(evaluate_live_gate(evidence, network="mainnet", explicitly_enabled=True).allowed)

    def test_chipnet_not_mainnet(self):
        evidence = {k: True for k in REQUIRED_EVIDENCE}
        self.assertFalse(evaluate_live_gate(evidence, network="chipnet", explicitly_enabled=True).allowed)

    def test_explicit_activation_required(self):
        evidence = {k: True for k in REQUIRED_EVIDENCE}
        self.assertFalse(evaluate_live_gate(evidence, network="mainnet").allowed)

    def test_missing_single_gate_denied(self):
        evidence = {k: True for k in REQUIRED_EVIDENCE}
        evidence[REQUIRED_EVIDENCE[-1]] = False
        self.assertFalse(evaluate_live_gate(evidence, network="mainnet", explicitly_enabled=True).allowed)

    def test_exception_on_denial(self):
        with self.assertRaises(RuntimeError):
            assert_live_gate({}, network="mainnet", explicitly_enabled=True)
