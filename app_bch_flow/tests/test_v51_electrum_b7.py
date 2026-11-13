"""B.7 pure PoW and fail-closed tests; no network, no database."""
import hashlib
import os
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.v51_electrum_b7 import (
    POW_LIMIT, PowDiagnosticError, compact_to_target, target_to_compact,
    inspect_pow, validate_pow_continuity, assess_pow)

def genesis():
    # Bitcoin genesis header, legitimate compact target and PoW; shared PoW format.
    return bytes.fromhex(
        "01000000" + "00"*32 +
        "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a" +
        "29ab5f49" + "ffff001d" + "1dac2b7c")

class B7Tests(TestCase):
    def test_pow_limit(self): self.assertLessEqual(compact_to_target(0x1d00ffff), POW_LIMIT)
    def test_roundtrip(self): self.assertEqual(target_to_compact(POW_LIMIT), 0x1d00ffff)
    def test_negative(self):
        with self.assertRaises(PowDiagnosticError): compact_to_target(0x1d80ffff)
    def test_zero(self):
        with self.assertRaises(PowDiagnosticError): compact_to_target(0)
    def test_above_limit(self):
        with self.assertRaises(PowDiagnosticError): compact_to_target(0x1e00ffff)
    def test_noncanonical(self):
        with self.assertRaises(PowDiagnosticError): compact_to_target(0x1c0000ff)
    def test_bool_rejected(self):
        with self.assertRaises(PowDiagnosticError): compact_to_target(True)
    def test_real_genesis_pow(self):
        result=inspect_pow(genesis().hex())
        self.assertTrue(result['per_header_pow_valid'])
        self.assertEqual(result['headers_pow_checked'],1)
    def test_modified_nonce_fails(self):
        raw=bytearray(genesis()); raw[-1] ^= 1
        with self.assertRaises(PowDiagnosticError): inspect_pow(raw.hex())
    def test_invalid_hex(self):
        with self.assertRaises(PowDiagnosticError): inspect_pow('z'*160)
    def test_invalid_length(self):
        with self.assertRaises(PowDiagnosticError): inspect_pow('ab')
    def test_limit(self):
        with self.assertRaises(PowDiagnosticError): inspect_pow(genesis().hex()*2,max_headers=1)
    def test_linked_genesis_single(self):
        raw=genesis(); anchor=hashlib.sha256(hashlib.sha256(raw).digest()).digest()[::-1].hex()
        r=validate_pow_continuity(0,raw.hex(),anchor,0,raw.hex())
        self.assertTrue(r['observed_pow_continuity'])
        self.assertFalse(r['canonical_chain_verified'])
    def test_wrong_anchor(self):
        raw=genesis()
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(0,raw.hex(),'0'*64,0,raw.hex())
    def test_live_disabled(self):
        with patch.dict(os.environ,{},clear=True):
            self.assertEqual(assess_pow('a'*64)['comparison'],'blocked')
    def test_b5_blocked(self):
        with patch.dict(os.environ,{'BCHFLOW_V51B7_ENABLE_LIVE':'1'}):
            r=assess_pow('a'*64,b5_fetch=lambda *a,**kw:{'comparison':'blocked'})
        self.assertEqual(r['comparison'],'blocked')
    def test_live_injected(self):
        raw=genesis(); anchor=hashlib.sha256(hashlib.sha256(raw).digest()).digest()[::-1].hex()
        prior={'comparison':'consistent_unverified_sources','merkle_verified':True,'block_height':0,'block_hash':anchor}
        headers={'headers_hex':raw.hex(),'tip_height':0,'tip_header_hex':raw.hex()}
        with patch.dict(os.environ,{'BCHFLOW_V51B7_ENABLE_LIVE':'1'}):
            r=assess_pow('a'*64,b5_fetch=lambda *a,**kw:prior,header_fetch=lambda *a,**kw:headers)
        self.assertEqual(r['comparison'],'observed_pow_continuity_unverified_consensus')
        self.assertFalse(r['settlement_authorized'])
