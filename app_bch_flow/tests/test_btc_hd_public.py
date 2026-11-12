"""No mainnet funds, seeds, or external services involved."""
import unittest
from embit import bip32, networks
from app_bch_flow.blockchain.btc_hd_public import (
    PublicWalletError, derive_bip84_mainnet_address,
)


class PublicHDTests(unittest.TestCase):
    def setUp(self):
        # Ephemeral deterministic TEST key; never use these addresses for money.
        seed = bytes(range(64))
        self.xpub = bip32.HDKey.from_seed(seed, version=networks.NETWORKS["main"]["xprv"]).derive(
            "m/84h/0h/0h"
        ).to_public().to_base58(version=networks.NETWORKS["main"]["xpub"])

    def test_deterministic_unique(self):
        a = derive_bip84_mainnet_address(self.xpub, 0)
        b = derive_bip84_mainnet_address(self.xpub, 1)
        self.assertTrue(a.startswith("bc1q"))
        self.assertNotEqual(a, b)
        self.assertEqual(a, derive_bip84_mainnet_address(self.xpub, 0))

    def test_reject_bad_indexes(self):
        for index in (-1, 2**31, True, "0"):
            with self.subTest(index=index), self.assertRaises(PublicWalletError):
                derive_bip84_mainnet_address(self.xpub, index)

    def test_reject_non_account_xpub(self):
        root = bip32.HDKey.from_seed(bytes(range(64))).to_public().to_base58()
        with self.assertRaises(PublicWalletError):
            derive_bip84_mainnet_address(root, 0)

    def test_reject_invalid_key(self):
        with self.assertRaises(PublicWalletError):
            derive_bip84_mainnet_address("xpub-invalid", 0)
