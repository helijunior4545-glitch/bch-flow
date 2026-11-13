"""V6.0 audit-tool self-tests; never certify settlement."""
from pathlib import Path
import unittest
from app_bch_flow.v60_five_gate_audit import (
    GATES, build_report, source_inventory
)

class V60AuditToolTests(unittest.TestCase):
    def test_five_independent_gates(self):
        self.assertEqual(len(GATES), 5)

    def test_source_inventory_does_not_prove_consensus(self):
        for item in source_inventory().values():
            self.assertNotEqual(item["status"], "PROVEN")

    def test_report_never_authorizes_settlement(self):
        result = build_report()
        self.assertFalse(result["commercial_settlement_authorized"])
        self.assertEqual(result["settlement_release"], "BLOCKED")

    def test_no_evidence_means_no_gate_passes(self):
        result = build_report()
        self.assertFalse(result["all_gates_proven"])
        self.assertTrue(all(x["status"] in {"NOT_PROVEN", "FAIL"}
                            for x in result["gates"].values()))

    def test_regression_is_opt_in(self):
        self.assertEqual(build_report()["regression"]["status"], "NOT_RUN")
