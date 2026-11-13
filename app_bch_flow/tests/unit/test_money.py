import unittest
from decimal import Decimal
from app_bch_flow.core.money import bch_to_satoshis, satoshis_to_bch, fiat_to_bch_satoshis

class MoneyTests(unittest.TestCase):
    def test_exact(self):
        self.assertEqual(bch_to_satoshis("0.00000001"), 1)
        self.assertEqual(satoshis_to_bch(1), Decimal("0.00000001"))
    def test_fractional_satoshi_rejected(self):
        with self.assertRaises(ValueError): bch_to_satoshis("0.000000001")
    def test_fiat(self):
        self.assertEqual(fiat_to_bch_satoshis("50", "1000"), 5_000_000)
