"""BCH Flow V5.1 adversarial PoW/continuity regression: offline, no database writes.

These are boundary tests, NOT BCH DAA, canonicality or settlement certification.
"""
import hashlib
import unittest
from unittest.mock import patch
from app_bch_flow.blockchain.v51_electrum_b7 import (
    compact_to_target, target_to_compact, inspect_pow, validate_pow_continuity,
    assess_pow, PowDiagnosticError, POW_LIMIT,
)
from app_bch_flow.blockchain.v51_electrum_b6 import header_hash, validate_headers, HeaderDiagnosticError

# Bitcoin genesis header is a public PoW serialization test vector, NOT a BCH consensus checkpoint.
GENESIS = bytes.fromhex(
    '01000000' + '00'*32 +
    '3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a' +
    '29ab5f49' + 'ffff001d' + '1dac2b7c'
)

class PowAdversarial(unittest.TestCase):
    def test_genesis_hash_known(self):
        self.assertEqual(header_hash(GENESIS),
            '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f')

    def test_genesis_work_known_formula(self):
        result=inspect_pow(GENESIS.hex())
        self.assertEqual(int(result['observed_work']), (1<<256)//(compact_to_target(0x1d00ffff)+1))
        self.assertFalse(result['bch_consensus_verified'])
        self.assertFalse(result['canonical_chain_verified'])

    def test_genesis_continuity(self):
        result=validate_pow_continuity(0, GENESIS.hex(), header_hash(GENESIS), 0, GENESIS.hex())
        self.assertTrue(result['observed_pow_continuity'])
        self.assertFalse(result['settlement_authorized'])

    def test_genesis_modified_nonce_rejected(self):
        changed=bytearray(GENESIS)
        changed[-1]^=0x80
        with self.assertRaises(PowDiagnosticError):
            inspect_pow(changed.hex())

    def test_linked_but_invalid_pow_rejected(self):
        changed=bytearray(GENESIS)
        changed[-1]^=0x80
        h=bytes(changed)
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(0,h.hex(),header_hash(h),0,h.hex())

    def test_anchor_mismatch_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(0,GENESIS.hex(),'00'*32,0,GENESIS.hex())

    def test_wrong_tip_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(0,GENESIS.hex(),header_hash(GENESIS),0,'00'*80)

    def test_no_financial_claims_when_live_disabled(self):
        with patch.dict('os.environ',{'BCHFLOW_V51B7_ENABLE_LIVE':'0'}):
            result=assess_pow('00'*32)
        for key in ('settlement_authorized','payment_created','invoice_attributed',
                    'canonical_chain_verified','bch_consensus_verified'):
            self.assertIs(result[key],False)
        self.assertEqual(result['comparison'],'blocked')

    def test_max_headers_rejects_145(self):
        with self.assertRaises(PowDiagnosticError):
            inspect_pow(GENESIS.hex()*145)

    def test_empty_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            inspect_pow('')

    def test_invalid_hex_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            inspect_pow('z'*160)

    def test_partial_header_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            inspect_pow('00'*79)

    def test_boolean_limit_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            inspect_pow(GENESIS.hex(),max_headers=True)

    def test_work_is_string_not_float(self):
        self.assertIsInstance(inspect_pow(GENESIS.hex())['observed_work'],str)

    def test_compact_roundtrip_genesis(self):
        self.assertEqual(target_to_compact(compact_to_target(0x1d00ffff)),0x1d00ffff)

    def test_target_above_limit_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            target_to_compact(1<<256)

    def test_target_zero_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            target_to_compact(0)

    def test_target_boolean_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            target_to_compact(True)

    def test_compact_boolean_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            compact_to_target(True)

    def test_compact_negative_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            compact_to_target(-1)

    def test_compact_overflow_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            compact_to_target(1<<32)

    def test_pow_limit_is_bounded(self):
        self.assertLess(POW_LIMIT,1<<256)

    def test_header_hash_requires_80_bytes(self):
        with self.assertRaises(HeaderDiagnosticError):
            header_hash(GENESIS[:-1])

    def test_header_hash_rejects_nonbytes(self):
        with self.assertRaises(HeaderDiagnosticError):
            header_hash(GENESIS.hex())

    def test_single_header_144_limit_accepted(self):
        self.assertEqual(inspect_pow(GENESIS.hex(),max_headers=144)['headers_pow_checked'],1)

    def test_duplicated_header_fails_continuity(self):
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(0,GENESIS.hex()*2,header_hash(GENESIS),1,GENESIS.hex())

    def test_header_height_boolean_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(True,GENESIS.hex(),header_hash(GENESIS),0,GENESIS.hex())

    def test_tip_height_boolean_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(0,GENESIS.hex(),header_hash(GENESIS),True,GENESIS.hex())

    def test_header_tip_behind_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(1,GENESIS.hex(),header_hash(GENESIS),0,GENESIS.hex())

    def test_invalid_anchor_hex_rejected(self):
        with self.assertRaises(PowDiagnosticError):
            validate_pow_continuity(0,GENESIS.hex(),'g'*64,0,GENESIS.hex())

    def test_rejected_upstream_b5_fails_closed(self):
        with patch.dict('os.environ',{'BCHFLOW_V51B7_ENABLE_LIVE':'1'}):
            result=assess_pow('00'*32,b5_fetch=lambda *a,**kw: {'comparison':'blocked'})
        self.assertEqual(result['comparison'],'blocked')
        self.assertFalse(result['settlement_authorized'])

# Each generated test uses a distinct compact-target exponent or adversarial nBits encoding.
# These are independently reported test methods, not subtests or duplicate assertions.
def _valid_test(exponent):
    def run(self):
        bits=(exponent<<24)|0x123456
        target=compact_to_target(bits)
        self.assertEqual(target_to_compact(target),bits)
        self.assertGreater(target,0)
        self.assertLessEqual(target,POW_LIMIT)
    return run

for exponent in range(3,29):
    setattr(PowAdversarial,'test_compact_valid_exponent_%02d'%exponent,_valid_test(exponent))

def _invalid_test(bits):
    def run(self):
        with self.assertRaises(PowDiagnosticError):
            compact_to_target(bits)
    return run

INVALID_BITS=[
    0,0x01000000,0x02000000,0x03000000,0x04000000,
    0x01800001,0x02800001,0x03800001,0x04800001,
    0x05000001,0x06000001,0x07000001,0x08000001,
    0x1d80ffff,0x1e80ffff,0x1f80ffff,0x2080ffff,
    0x2100ffff,0x2200ffff,0x2300ffff,0x2400ffff,
    0xff123456,0x7f123456,0x40000001,0x20000000,
    0x1d000000,0x1e000000,0x1f000000,0x20000000,
    0x01000001,0x02000001,0x04000001,
]
for index,bits in enumerate(INVALID_BITS):
    setattr(PowAdversarial,'test_compact_invalid_%02d_%08x'%(index,bits),_invalid_test(bits))
