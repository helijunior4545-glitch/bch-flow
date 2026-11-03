from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v51_electrum_b5 import validate_pair, collect_diagnostic, assess_diagnostic
from app_bch_flow.blockchain.v51_live import LiveEvidenceError

TX = "ab" * 32
HASH = "cd" * 32
P = {"height": 100, "block_hash": HASH, "confirmations": 3,
     "outputs": [{"vout": 0, "satoshis": 10000}]}
E = {"txid": TX, "block_height": 100, "block_hash": HASH,
     "merkle_verified": True, "external_anchor_match": True,
     "raw_txid_verified": True, "confirmations_arithmetic": 3,
     "outputs": [{"vout": 0, "satoshis": 10000, "script_pubkey_hex": "51"}]}

class ElectrumB5Tests(SimpleTestCase):
    def test_matching_never_settles(self):
        r = validate_pair(P, E, TX)
        self.assertEqual(r["comparison"], "consistent_unverified_sources")
        self.assertFalse(r["settlement_authorized"])
        self.assertFalse(r["independent_corroboration"])
        self.assertFalse(r["canonical_chain_verified"])
    def test_height_mismatch(self):
        self.assertIn("height_mismatch", validate_pair(P, dict(E, block_height=101), TX)["reasons"])
    def test_hash_mismatch(self):
        self.assertIn("block_hash_mismatch", validate_pair(P, dict(E, block_hash="ef"*32), TX)["reasons"])
    def test_merkle_missing(self):
        self.assertIn("merkle_not_verified", validate_pair(P, dict(E, merkle_verified=False), TX)["reasons"])
    def test_anchor_missing(self):
        self.assertIn("anchor_not_verified", validate_pair(P, dict(E, external_anchor_match=False), TX)["reasons"])
    def test_raw_txid_missing(self):
        self.assertIn("raw_txid_not_verified", validate_pair(P, dict(E, raw_txid_verified=False), TX)["reasons"])
    def test_output_mismatch(self):
        self.assertIn("output_amounts_mismatch", validate_pair(P, dict(E, outputs=[{"vout":0,"satoshis":9}]), TX)["reasons"])
    def test_tip_divergence(self):
        self.assertIn("confirmations_disagree", validate_pair(P, dict(E, confirmations_arithmetic=7), TX)["reasons"])
    def test_disabled_by_default(self):
        with patch.dict("os.environ", {"BCHFLOW_V51B5_ENABLE_LIVE": "0"}):
            with self.assertRaises(LiveEvidenceError): collect_diagnostic(TX)
    def test_live_injected_provider_contract(self):
        def primary_fetch(url, headers, opener):
            return {"txid": TX, "blockHeight": 100, "confirmations": 3,
                    "blockHash": HASH, "vout": [{"n": 0, "value": "10000",
                    "addresses": ["bitcoincash:qplrn4mdqrakml5yqels9q432nkdkjkd85u3zsmljn"]}]}
        def electrum_fetch(txid, host, **kwargs):
            self.assertEqual(kwargs["block_height"], 100)
            self.assertEqual(kwargs["trusted_block_hash"], HASH)
            self.assertEqual(kwargs["trusted_tip_height"], 102)
            return E
        with patch.dict("os.environ", {"BCHFLOW_V51B5_ENABLE_LIVE": "1", "BCHFLOW_V48_PRIMARY_KEY": "fake"}):
            r = collect_diagnostic(TX, primary_fetch=primary_fetch, electrum_fetch=electrum_fetch)
        self.assertEqual(r["comparison"], "consistent_unverified_sources")
        self.assertFalse(r["settlement_authorized"])
    def test_safe_failure_response(self):
        with patch.dict("os.environ", {"BCHFLOW_V51B5_ENABLE_LIVE": "0"}):
            r = assess_diagnostic(TX)
        self.assertEqual(r["comparison"], "blocked")
        self.assertEqual(r["reasons"], ["diagnostic_unavailable"])
