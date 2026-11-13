"""B.8.1: adversarial, deterministic replay tests; no network, no DB."""
import hashlib
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.v51_asert_b81 import replay_asert_headers, HistoricalReplayError

ANCHOR = dict(anchor_height=700000, anchor_parent_time=1600000000, anchor_bits=0x1d00ffff)

def header(ts, bits=0x1d00ffff, prev=None):
    return (bytes([1,0,0,0]) + (prev or bytes(32)) + bytes(32)
            + ts.to_bytes(4,"little") + bits.to_bytes(4,"little") + bytes(4))

def batch():
    a=header(1600001200)
    digest=hashlib.sha256(hashlib.sha256(a).digest()).digest()
    b=header(1600001800,prev=digest)
    return (a+b).hex()

def replay(**kw):
    args=dict(ANCHOR,first_height=700001,headers_hex=batch())
    args.update(kw)
    with patch("app_bch_flow.blockchain.v51_asert_b81.compact_to_target",return_value=(1<<256)-1):
        return replay_asert_headers(**args)

class B81ReplayTests(TestCase):
    def test_valid_internal_replay(self):
        with patch("app_bch_flow.blockchain.v51_asert_b81.next_asert_bits",return_value=0x1d00ffff):
            x=replay()
        self.assertEqual(x["headers_checked"],2)
        self.assertTrue(x["internal_links_valid"])
    def test_replay_never_authorizes(self):
        with patch("app_bch_flow.blockchain.v51_asert_b81.next_asert_bits",return_value=0x1d00ffff):
            x=replay()
        for key in ("anchor_authenticated","historical_provenance_verified","canonical_chain_verified","bch_consensus_verified","invoice_attributed","payment_created","settlement_authorized"):
            self.assertIs(x[key],False)
    def test_real_pow_rejects_forged_headers(self):
        with self.assertRaisesRegex(HistoricalReplayError,"insufficient_pow"):
            replay_asert_headers(**ANCHOR,first_height=700001,headers_hex=batch())
    def test_asert_mismatch(self):
        with patch("app_bch_flow.blockchain.v51_asert_b81.next_asert_bits",return_value=0x1d00fffe):
            with self.assertRaisesRegex(HistoricalReplayError,"asert_mismatch"): replay()
    def test_broken_link(self):
        data=bytearray(bytes.fromhex(batch()));data[80+4]^=1
        with self.assertRaisesRegex(HistoricalReplayError,"broken_header_link"):
            replay(headers_hex=data.hex())
    def test_wrong_first_hash(self):
        with self.assertRaisesRegex(HistoricalReplayError,"first_hash_mismatch"):
            replay(expected_first_hash="0"*64)
    def test_correct_first_hash(self):
        first=bytes.fromhex(batch())[:80]
        h=hashlib.sha256(hashlib.sha256(first).digest()).digest()[::-1].hex()
        with patch("app_bch_flow.blockchain.v51_asert_b81.next_asert_bits",return_value=0x1d00ffff):
            self.assertEqual(replay(expected_first_hash=h)["first_hash"],h)
    def test_bad_first_hash(self):
        with self.assertRaisesRegex(HistoricalReplayError,"invalid_expected_first_hash"):
            replay(expected_first_hash="g"*64)
    def test_bool_height(self):
        with self.assertRaises(HistoricalReplayError): replay(first_height=True)
    def test_before_anchor(self):
        with self.assertRaises(HistoricalReplayError): replay(first_height=700000)
    def test_height_limit(self):
        with self.assertRaises(HistoricalReplayError): replay(first_height=100000001)
    def test_non_string_hex(self):
        with self.assertRaises(HistoricalReplayError): replay(headers_hex=None)
    def test_bad_hex(self):
        with self.assertRaises(HistoricalReplayError): replay(headers_hex="z"*320)
    def test_odd_hex(self):
        with self.assertRaises(HistoricalReplayError): replay(headers_hex="0"*319)
    def test_empty(self):
        with self.assertRaises(HistoricalReplayError): replay(headers_hex="")
    def test_one_header(self):
        with self.assertRaises(HistoricalReplayError): replay(headers_hex=batch()[:160])
    def test_too_many_headers(self):
        with self.assertRaises(HistoricalReplayError): replay(headers_hex="00"*80*145)
    def test_invalid_target(self):
        with patch("app_bch_flow.blockchain.v51_asert_b81.compact_to_target",side_effect=ValueError):
            with self.assertRaisesRegex(HistoricalReplayError,"invalid_target"):
                replay_asert_headers(**ANCHOR,first_height=700001,headers_hex=batch())
    def test_invalid_asert_context(self):
        with patch("app_bch_flow.blockchain.v51_asert_b81.next_asert_bits",side_effect=ValueError):
            with self.assertRaisesRegex(HistoricalReplayError,"asert_context_invalid"): replay()
    def test_timestamp_mutation_rejected_by_pow(self):
        data=bytearray(bytes.fromhex(batch()));data[68]^=1
        with self.assertRaisesRegex(HistoricalReplayError,"insufficient_pow"):
            replay_asert_headers(**ANCHOR,first_height=700001,headers_hex=data.hex())
