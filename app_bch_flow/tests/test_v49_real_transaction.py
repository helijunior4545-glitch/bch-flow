"""Deterministic tests; no actual provider network call."""
from datetime import datetime, timezone
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.v49_real_transaction import inspect_transaction, DiagnosticError

TXID = "a" * 64
BLOCK = "b" * 64
NOW = datetime(2026, 11, 2, tzinfo=timezone.utc)

def fixture(path):
    if path == "/api":
        return {"blockbook": {"coin": "Bcash", "inSync": True, "initialSync": False, "bestHeight": 100}, "backend": {"chain": "main"}}
    if path.startswith("/api/v2/tx/"):
        return {"txid": TXID, "confirmations": 3, "blockHeight": 98, "blockHash": BLOCK,
                "blockTime": 1700000000, "vout": [{"n": 0, "value": "12345", "addresses": ["bitcoincash:qtest"]}]}
    if path == "/api/v2/block-index/98":
        return {"blockHash": BLOCK}
    raise AssertionError(path)

class V49Tests(TestCase):
    def run_case(self, overrides=None):
        overrides = overrides or {}
        def get(path):
            result = fixture(path).copy()
            if path == "/api":
                result["blockbook"] = result["blockbook"].copy()
                result["backend"] = result["backend"].copy()
            if path.startswith("/api/v2/tx/"):
                result["vout"] = [v.copy() for v in result["vout"]]
            if path == "/api/v2/block-index/98":
                result.update(overrides.get("index", {}))
            else:
                for k, v in overrides.get("status" if path == "/api" else "tx", {}).items():
                    if k in ("blockbook", "backend"):
                        result[k].update(v)
                    else:
                        result[k] = v
            return result
        return inspect_transaction(TXID, api_key="test", fetch=get, clock=lambda: NOW)

    def test_disabled_by_default(self):
        with patch.dict("os.environ", {"BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC": "0"}):
            with self.assertRaises(DiagnosticError): self.run_case()

    def test_valid_external_observation_not_paid(self):
        with patch.dict("os.environ", {"BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC": "1"}):
            r = self.run_case()
            self.assertEqual(r["outputs"][0]["satoshis"], 12345)
            self.assertFalse(r["settlement_authorized"])
            self.assertFalse(r["independent_corroboration"])

    def test_wrong_coin(self):
        self.assert_error({"status": {"blockbook": {"coin": "Bitcoin"}}})
    def test_wrong_network(self):
        self.assert_error({"status": {"backend": {"chain": "test"}}})
    def test_out_of_sync(self):
        self.assert_error({"status": {"blockbook": {"inSync": False}}})
    def test_txid_mismatch(self):
        self.assert_error({"tx": {"txid": "c" * 64}})
    def test_wrong_confirmation_count(self):
        self.assert_error({"tx": {"confirmations": 2}})
    def test_unconfirmed_not_accepted(self):
        self.assert_error({"tx": {"confirmations": 0}})
    def test_block_index_mismatch(self):
        self.assert_error({"index": {"blockHash": "c" * 64}})
    def test_duplicate_output(self):
        self.assert_error({"tx": {"vout": [{"n": 0, "value": "1", "addresses": []}, {"n": 0, "value": "2", "addresses": []}]}})
    def test_decimal_amount_rejected(self):
        self.assert_error({"tx": {"vout": [{"n": 0, "value": "0.01", "addresses": []}]}})
    def test_future_block_time(self):
        self.assert_error({"tx": {"blockTime": 9999999999}})
    def test_bad_txid(self):
        with patch.dict("os.environ", {"BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC": "1"}):
            with self.assertRaises(DiagnosticError):
                inspect_transaction("invalid", api_key="test", fetch=fixture)
    def test_missing_key(self):
        with patch.dict("os.environ", {"BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC": "1"}):
            with self.assertRaises(DiagnosticError):
                inspect_transaction(TXID, api_key="", fetch=fixture)
    def assert_error(self, overrides):
        with patch.dict("os.environ", {"BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC": "1"}):
            with self.assertRaises(DiagnosticError): self.run_case(overrides)
