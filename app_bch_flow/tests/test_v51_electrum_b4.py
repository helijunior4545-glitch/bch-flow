from django.test import SimpleTestCase
from app_bch_flow.blockchain.v51_electrum import ElectrumEvidenceError, hash256
from app_bch_flow.blockchain.v51_electrum_b4 import verify_inclusion, collect_inclusion

TXID = "ab" * 32
HEADER = (b"\x00" * 36 + bytes.fromhex(TXID)[::-1] + b"\x00" * 12).hex()
BLOCK_HASH = hash256(bytes.fromhex(HEADER))[::-1].hex()
PROOF = {"block_height": 123, "merkle": [], "pos": 0}

class ElectrumB4Tests(SimpleTestCase):
    def test_merkle_only_does_not_verify_chain(self):
        r = verify_inclusion(TXID, 123, PROOF, HEADER)
        self.assertTrue(r["merkle_verified"])
        self.assertFalse(r["external_anchor_match"])
        self.assertFalse(r["canonical_chain_verified"])
        self.assertFalse(r["settlement_authorized"])
    def test_matching_external_anchor(self):
        r = verify_inclusion(TXID, 123, PROOF, HEADER, trusted_block_hash=BLOCK_HASH)
        self.assertTrue(r["external_anchor_match"])
        self.assertFalse(r["independent_corroboration"])
    def test_confirmations_are_arithmetic_only(self):
        r = verify_inclusion(TXID, 123, PROOF, HEADER, trusted_tip_height=125)
        self.assertEqual(r["confirmations_arithmetic"], 3)
        self.assertFalse(r["canonical_chain_verified"])
    def test_wrong_anchor_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_inclusion(TXID, 123, PROOF, HEADER, trusted_block_hash="ff" * 32)
    def test_wrong_height_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_inclusion(TXID, 124, PROOF, HEADER)
    def test_wrong_merkle_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_inclusion("cd" * 32, 123, PROOF, HEADER)
    def test_tip_behind_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_inclusion(TXID, 123, PROOF, HEADER, trusted_tip_height=122)
    def test_invalid_bool_height_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_inclusion(TXID, True, PROOF, HEADER)
    def test_invalid_merkle_position_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_inclusion(TXID, 123, {"block_height": 123, "merkle": [], "pos": -1}, HEADER)
    def test_server_allowlist_rejected_before_network(self):
        with self.assertRaises(ElectrumEvidenceError):
            collect_inclusion(TXID, "evil.example", block_height=123)
