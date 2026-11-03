"""B.8.2 security boundary tests: supplied anchor evidence is never authenticated by assertion."""
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.v51_asert_b82 import historical_asert_diagnostic, MainnetAnchorError
A=dict(anchor_height=661647,anchor_parent_time=1605440000,anchor_bits=0x1c0fffff,
       evaluation_height=661647,evaluation_time=1605440600,observed_next_bits=0x1c0fffff,
       anchor_hash='a'*64,anchor_parent_hash='b'*64)

def run(**kw):
    d=dict(A);d.update(kw)
    with patch('app_bch_flow.blockchain.v51_asert_b82.next_asert_bits',return_value=0x1c0fffff):
        return historical_asert_diagnostic(**d)

class B82Tests(TestCase):
    def test_known_anchor_height(self):self.assertEqual(run()['anchor_height'],661647)
    def test_first_asert_height(self):self.assertEqual(run()['first_asert_height'],661648)
    def test_equal_bits(self):self.assertTrue(run()['asert_bits_match'])
    def test_mismatch_bits(self):self.assertFalse(run(observed_next_bits=0x1c0ffffe)['asert_bits_match'])
    def test_financial_flags_false(self):
        x=run(independent_anchor_hash='A'*64)
        for k in ('source_independence_verified','anchor_authenticated','historical_provenance_verified','canonical_chain_verified','bch_consensus_verified','invoice_attributed','payment_created','settlement_authorized'):
            self.assertIs(x[k],False)
    def test_supplied_hash_match_not_independence(self):
        x=run(independent_anchor_hash='A'*64)
        self.assertTrue(x['two_supplied_anchor_hashes_agree'])
        self.assertFalse(x['source_independence_verified'])
    def test_no_second_hash(self):self.assertFalse(run()['two_supplied_anchor_hashes_agree'])
    def test_anchor_wrong_height(self):
        with self.assertRaises(MainnetAnchorError):run(anchor_height=661648)
    def test_anchor_bool(self):
        with self.assertRaises(MainnetAnchorError):run(anchor_height=True)
    def test_eval_before_anchor(self):
        with self.assertRaises(MainnetAnchorError):run(evaluation_height=661646)
    def test_eval_bool(self):
        with self.assertRaises(MainnetAnchorError):run(evaluation_height=True)
    def test_observed_bool(self):
        with self.assertRaises(MainnetAnchorError):run(observed_next_bits=True)
    def test_bad_anchor_hash(self):
        with self.assertRaises(MainnetAnchorError):run(anchor_hash='x'*64)
    def test_short_parent_hash(self):
        with self.assertRaises(MainnetAnchorError):run(anchor_parent_hash='b')
    def test_invalid_second_hash(self):
        with self.assertRaises(MainnetAnchorError):run(independent_anchor_hash='g'*64)
    def test_conflicting_supplied_hashes(self):
        with self.assertRaisesRegex(MainnetAnchorError,'disagreement'):run(independent_anchor_hash='c'*64)
    def test_bad_asert_context(self):
        with patch('app_bch_flow.blockchain.v51_asert_b82.next_asert_bits',side_effect=ValueError):
            with self.assertRaisesRegex(MainnetAnchorError,'invalid_asert_context'):
                historical_asert_diagnostic(**A)
