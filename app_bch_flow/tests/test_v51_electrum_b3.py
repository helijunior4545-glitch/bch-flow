"""B.3 offline, deterministic, no DB and no network."""
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v51_electrum import (
    ElectrumEvidenceError, SERVERS, hash256, parse_outputs, verify_merkle, collect_one
)

TXID = "e415aca63768515434fede7cf823eb003f2111a46d56443a506915cf007861c3"

class ElectrumB3Tests(SimpleTestCase):
    def test_allowlist(self):
        with self.assertRaises(ElectrumEvidenceError):
            collect_one(TXID, "attacker.invalid")
    def test_txid_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            collect_one("not-a-txid", SERVERS[0][0])
    def test_empty_transaction_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            parse_outputs(b"")
    def test_truncated_transaction_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            parse_outputs(b"\x01" * 11)
    def test_merkle_single_leaf(self):
        txid = "ab" * 32
        header = bytearray(80)
        header[36:68] = bytes.fromhex(txid)[::-1]
        self.assertEqual(verify_merkle(txid, [], 0, header.hex()), hash256(header)[::-1].hex())
    def test_merkle_wrong_root_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_merkle("ab" * 32, [], 0, "00" * 80)
    def test_merkle_invalid_branch_rejected(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_merkle("ab" * 32, ["xx"], 0, "00" * 80)
    def test_merkle_position_out_of_range(self):
        with self.assertRaises(ElectrumEvidenceError):
            verify_merkle("ab" * 32, [], 1, "00" * 80)
    def test_single_output(self):
        raw = (b"\x01\x00\x00\x00" + b"\x01" + b"\x00" * 32 +
               b"\xff\xff\xff\xff" + b"\x01\x00" + b"\xff\xff\xff\xff" +
               b"\x01" + (312523172).to_bytes(8, "little") +
               b"\x01\x51" + b"\x00\x00\x00\x00")
        self.assertEqual(parse_outputs(raw), [
            {"vout": 0, "satoshis": 312523172, "script_pubkey_hex": "51"}])
    def test_trailing_bytes_rejected(self):
        raw = (b"\x01\x00\x00\x00" + b"\x01" + b"\x00" * 32 +
               b"\xff\xff\xff\xff" + b"\x01\x00" + b"\xff\xff\xff\xff" +
               b"\x01" + (1).to_bytes(8, "little") + b"\x00" +
               b"\x00\x00\x00\x00" + b"\x00")
        with self.assertRaises(ElectrumEvidenceError):
            parse_outputs(raw)
