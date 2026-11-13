import unittest
from app_bch_flow.wallet.selfcustody.change_policy import (
    UnsafeChangeAddress, require_dedicated_change_address, require_bch_signer_ready,
)

class ChangePolicyTests(unittest.TestCase):
    def test_invoice_reuse_rejected(self):
        with self.assertRaises(UnsafeChangeAddress):
            require_dedicated_change_address(change_address="invoice", invoice_addresses={"invoice"}, destination="merchant")

    def test_missing_change_rejected(self):
        with self.assertRaises(UnsafeChangeAddress):
            require_dedicated_change_address(change_address="", invoice_addresses=set(), destination="merchant")

    def test_destination_reuse_rejected(self):
        with self.assertRaises(UnsafeChangeAddress):
            require_dedicated_change_address(change_address="merchant", invoice_addresses=set(), destination="merchant")

    def test_separate_change_allowed_by_shape_only(self):
        self.assertEqual("change", require_dedicated_change_address(change_address="change", invoice_addresses={"invoice"}, destination="merchant"))

    def test_bch_blocked(self):
        class Account: asset = "BCH"
        with self.assertRaises(UnsafeChangeAddress):
            require_bch_signer_ready(Account())
