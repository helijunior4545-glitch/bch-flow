"""Pure, no-network tests for B.6; no DB or payment mutations."""
import hashlib
import os
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.v51_electrum_b6 import (
    HeaderDiagnosticError, hash256, header_hash, validate_headers, assess_continuity,
)

def make_header(prev=b"\0"*32, nonce=0):
    return (1).to_bytes(4,"little") + prev + b"\0"*32 + b"\0"*4 + b"\0"*4 + nonce.to_bytes(4,"little")

class B6Tests(TestCase):
    def setUp(self):
        self.a = make_header(nonce=1)
        self.b = make_header(hash256(self.a), nonce=2)
        self.anchor = header_hash(self.a)
        self.hexes = (self.a+self.b).hex()
        self.tip = self.b.hex()
        self.txid = "a"*64
        self.prior = {"comparison":"consistent_unverified_sources", "merkle_verified":True,
                      "block_height":10,"block_hash":self.anchor}
    def check(self, **kwargs):
        return validate_headers(10,self.hexes,self.anchor,11,self.tip,**kwargs)
    def test_good_chain(self):
        self.assertTrue(self.check()["observed_header_continuity"])
    def test_consensus_not_verified(self):
        self.assertFalse(self.check()["canonical_chain_verified"])
    def test_two_headers(self):
        self.assertEqual(self.check()["headers_verified"],2)
    def test_anchor_mismatch(self):
        with self.assertRaises(HeaderDiagnosticError):
            validate_headers(10,self.hexes,"0"*64,11,self.tip)
    def test_broken_link(self):
        bad=make_header(b"\x11"*32,2)
        with self.assertRaises(HeaderDiagnosticError):
            validate_headers(10,(self.a+bad).hex(),self.anchor,11,bad.hex())
    def test_tip_mismatch(self):
        with self.assertRaises(HeaderDiagnosticError):
            validate_headers(10,self.hexes,self.anchor,11,self.a.hex())
    def test_wrong_length(self):
        with self.assertRaises(HeaderDiagnosticError):
            validate_headers(10,self.hexes[:-2],self.anchor,11,self.tip)
    def test_tip_behind(self):
        with self.assertRaises(HeaderDiagnosticError):
            validate_headers(10,self.hexes,self.anchor,9,self.tip)
    def test_bounded(self):
        with self.assertRaises(HeaderDiagnosticError):
            validate_headers(10,self.hexes,self.anchor,11,self.tip,max_headers=1)
    def test_nonhex(self):
        with self.assertRaises(HeaderDiagnosticError):
            validate_headers(10,"zz"+self.hexes[2:],self.anchor,11,self.tip)
    def test_disabled(self):
        with patch.dict(os.environ,{},clear=True):
            self.assertEqual(assess_continuity(self.txid)["comparison"],"blocked")
    def test_live_injected(self):
        def prior(txid,**kw): return self.prior
        def headers(server,height,**kw): return {"headers_hex":self.hexes,"tip_height":11,"tip_header_hex":self.tip}
        with patch.dict(os.environ,{"BCHFLOW_V51B6_ENABLE_LIVE":"1"}):
            result=assess_continuity(self.txid,b5_fetch=prior,header_fetch=headers)
        self.assertEqual(result["comparison"],"observed_header_continuity_unverified_consensus")
        self.assertFalse(result["settlement_authorized"])
    def test_live_prior_blocked(self):
        with patch.dict(os.environ,{"BCHFLOW_V51B6_ENABLE_LIVE":"1"}):
            result=assess_continuity(self.txid,b5_fetch=lambda *a,**k:{"comparison":"blocked"})
        self.assertEqual(result["comparison"],"blocked")
    def test_live_broken_chain(self):
        def headers(*a,**k): return {"headers_hex":(self.a+make_header(b"\x22"*32)).hex(),"tip_height":11,"tip_header_hex":make_header(b"\x22"*32).hex()}
        with patch.dict(os.environ,{"BCHFLOW_V51B6_ENABLE_LIVE":"1"}):
            result=assess_continuity(self.txid,b5_fetch=lambda *a,**k:self.prior,header_fetch=headers)
        self.assertEqual(result["comparison"],"blocked")
