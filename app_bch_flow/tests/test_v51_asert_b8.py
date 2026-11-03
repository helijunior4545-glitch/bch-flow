"""B.8 integer ASERT regression and adversarial tests (offline)."""
from unittest import TestCase
from app_bch_flow.blockchain.v51_asert_b8 import (
    next_asert_bits, check_asert_window, ASERTError)
from app_bch_flow.blockchain.v51_electrum_b7 import compact_to_target

A = dict(anchor_height=700000, anchor_parent_time=1600000000, anchor_bits=0x1c0fffff)

def calc(height=700000, delta=600, **updates):
    args = dict(A, evaluation_height=height, evaluation_time=A['anchor_parent_time'] + delta)
    args.update(updates)
    return next_asert_bits(**args)

def header(timestamp, bits):
    return (bytes(68) + timestamp.to_bytes(4,'little') + bits.to_bytes(4,'little') + bytes(4)).hex()

class ASERTB8Tests(TestCase):
    def test_ideal_spacing_anchor(self): self.assertEqual(calc(), A['anchor_bits'])
    def test_ideal_spacing_many(self): self.assertEqual(calc(700050, 600*51), A['anchor_bits'])
    def test_one_halflife_slower(self): self.assertGreater(compact_to_target(calc(delta=600+172800)), compact_to_target(A['anchor_bits']))
    def test_one_halflife_faster(self): self.assertLess(compact_to_target(calc(height=700288, delta=600*289-172800)), compact_to_target(A['anchor_bits']))
    def test_non_float_precision(self): self.assertEqual(calc(delta=600), calc(delta=601))
    def test_deterministic(self): self.assertEqual(calc(700010, 123456), calc(700010, 123456))
    def test_min_target_clamp(self): self.assertEqual(calc(height=1000000, delta=0), 0x01010000)
    def test_max_target_clamp(self): self.assertEqual(calc(delta=2000000000, anchor_bits=0x1d00ffff), 0x1d00ffff)
    def test_return_integer(self): self.assertIs(type(calc()), int)
    def test_reference_anchor_target(self): self.assertEqual(calc(delta=600), 0x1c0fffff)
    def test_monotonic_slower(self): self.assertGreaterEqual(compact_to_target(calc(delta=10000)), compact_to_target(calc(delta=600)))
    def test_monotonic_faster(self): self.assertLessEqual(compact_to_target(calc(delta=100)), compact_to_target(calc(delta=600)))
    def test_height_raises_difficulty(self): self.assertLessEqual(compact_to_target(calc(height=700010)), compact_to_target(calc()))
    def test_negative_time_delta(self): self.assertIs(type(calc(delta=-500)), int)
    def test_anchor_zero(self):
        with self.assertRaises(ASERTError): calc(anchor_height=0)
    def test_height_before_anchor(self):
        with self.assertRaises(ASERTError): calc(height=699999)
    def test_height_equal_limit(self):
        with self.assertRaises(ASERTError): calc(height=100000000)
    def test_anchor_negative(self):
        with self.assertRaises(ASERTError): calc(anchor_height=-1)
    def test_height_negative(self):
        with self.assertRaises(ASERTError): calc(height=-1)
    def test_anchor_bool(self):
        with self.assertRaises(ASERTError): calc(anchor_height=True)
    def test_height_bool(self):
        with self.assertRaises(ASERTError): calc(height=True)
    def test_time_bool(self):
        with self.assertRaises(ASERTError): calc(evaluation_time=True)
    def test_anchor_time_bool(self):
        with self.assertRaises(ASERTError): calc(anchor_parent_time=False)
    def test_anchor_time_negative(self):
        with self.assertRaises(ASERTError): calc(anchor_parent_time=-1)
    def test_eval_time_negative(self):
        with self.assertRaises(ASERTError): calc(evaluation_time=-1)
    def test_eval_time_overflow(self):
        with self.assertRaises(ASERTError): calc(evaluation_time=0x100000000)
    def test_anchor_bits_bool(self):
        with self.assertRaises(ASERTError): calc(anchor_bits=True)
    def test_anchor_bits_zero(self):
        with self.assertRaises(ASERTError): calc(anchor_bits=0)
    def test_anchor_bits_above_limit(self):
        with self.assertRaises(ASERTError): calc(anchor_bits=0x1e00ffff)
    def test_anchor_bits_noncanonical(self):
        with self.assertRaises(ASERTError): calc(anchor_bits=0x1c0000ff)
    def test_anchor_bits_negative(self):
        with self.assertRaises(ASERTError): calc(anchor_bits=-1)
    def test_window_good(self):
        raw=header(1600001200,0x1c0fffff)+header(1600001800,0x1c0fffff)
        r=check_asert_window(**A, first_height=700001, headers_hex=raw)
        self.assertEqual(r['asert_bits_checked'],1)
        self.assertFalse(r['settlement_authorized'])
    def test_window_mismatch(self):
        raw=header(1600001200,0x1c0fffff)+header(1600001800,0x1c0ffffe)
        with self.assertRaisesRegex(ASERTError, 'mismatch'): check_asert_window(**A, first_height=700001, headers_hex=raw)
    def test_window_single(self):
        with self.assertRaises(ASERTError): check_asert_window(**A, first_height=700001, headers_hex=header(1600000600,0x1c0fffff))
    def test_window_bad_hex(self):
        with self.assertRaises(ASERTError): check_asert_window(**A, first_height=700001, headers_hex='z'*320)
    def test_window_wrong_length(self):
        with self.assertRaises(ASERTError): check_asert_window(**A, first_height=700001, headers_hex='0'*319)
    def test_window_wrong_height(self):
        with self.assertRaises(ASERTError): check_asert_window(**A, first_height=700000, headers_hex='0'*320)
    def test_window_oversized(self):
        with self.assertRaises(ASERTError): check_asert_window(**A, first_height=700001, headers_hex='0'*160*145)
    def test_window_invalid_type(self):
        with self.assertRaises(ASERTError): check_asert_window(**A, first_height=700001, headers_hex=None)
    def test_window_forged_earlier_time(self):
        raw=header(1600000600,0x1c0fffff)+header(1600000600,0x1c0fffff)
        with self.assertRaises(ASERTError): check_asert_window(**A, first_height=700001, headers_hex=raw)
    def test_window_no_financial_mutation(self):
        raw=header(1600001200,0x1c0fffff)+header(1600001800,0x1c0fffff)
        r=check_asert_window(**A, first_height=700001, headers_hex=raw)
        self.assertFalse(r['bch_consensus_verified'])
        self.assertFalse(r['anchor_authenticated'])
