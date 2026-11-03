import unittest
from app_bch_flow.wallet.v53b_cashaddr import (
    compressed_pubkey_to_cashaddr, encode_p2pkh_hash160, validate_cashaddr_checksum,
)

class V53BPublicAddressTests(unittest.TestCase):
    def test_nonzero_hash_roundtrip(self):
        h = bytes.fromhex("76a04053bda0a88bda5177b86a15c3b29f559873")
        address = encode_p2pkh_hash160(h)
        self.assertTrue(validate_cashaddr_checksum(address))
        self.assertEqual(len(address.split(":")[1]), 42)
    def test_zero_hash_known_vector(self):
        # Published CashAddr encoding for 20-byte zero P2PKH hash.
        self.assertEqual(encode_p2pkh_hash160(bytes(20)), "bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfnhks603")
    def test_chipnet(self):
        a = encode_p2pkh_hash160(bytes(20), network="chipnet")
        self.assertTrue(validate_cashaddr_checksum(a, network="chipnet"))
        self.assertFalse(validate_cashaddr_checksum(a, network="mainnet"))
    def test_reject_invalid_hash(self):
        with self.assertRaises(ValueError): encode_p2pkh_hash160(bytes(19))
    def test_reject_invalid_pubkey(self):
        with self.assertRaises(ValueError): compressed_pubkey_to_cashaddr(bytes(33))
    def test_reject_mutated_checksum(self):
        a = encode_p2pkh_hash160(bytes(20))
        self.assertFalse(validate_cashaddr_checksum(a[:-1] + ("q" if a[-1] != "q" else "p")))
    def test_reject_mixed_case(self):
        a = encode_p2pkh_hash160(bytes(20))
        self.assertFalse(validate_cashaddr_checksum("Bitcoincash:" + a.split(":")[1]))
    def test_reject_unknown_network(self):
        with self.assertRaises(ValueError): encode_p2pkh_hash160(bytes(20), network="other")

if __name__ == "__main__": unittest.main()
