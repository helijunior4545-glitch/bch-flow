from django.test import SimpleTestCase
from unittest.mock import patch
from app_bch_flow.blockchain.v51_receive_policy import assess_receiving

ADDR = 'bitcoincash:qz9h7mng9zhu963c8umgnyh6ehhw69553q8uz8dm0v'

class ReceivingPolicyTests(SimpleTestCase):
    def evaluate(self, **changes):
        args = dict(network='mainnet', address=ADDR, amount_satoshis=10000,
                    invoice_count_for_address=1, wallet_ownership_verified=True,
                    wallet_active=True, invoice_active=True,
                    address_derived_from_wallet=True,
                    address_exclusive_reservation=True, provider_network_verified=True)
        args.update(changes)
        with patch('app_bch_flow.core.address_validation.validate_cashaddr', return_value=ADDR):
            return assess_receiving(**args)

    def test_eligible_is_never_settled(self):
        r = self.evaluate()
        self.assertTrue(r.eligible)
        self.assertFalse(r.can_mark_paid)
        self.assertFalse(r.can_settle)

    def test_reused_address_fails(self):
        self.assertIn('address_not_unique_across_all_invoices',
                      self.evaluate(invoice_count_for_address=2).reasons)

    def test_unknown_ownership_fails(self):
        self.assertIn('wallet_ownership_not_verified',
                      self.evaluate(wallet_ownership_verified=False).reasons)

    def test_derived_address_required(self):
        self.assertFalse(self.evaluate(address_derived_from_wallet=False).eligible)

    def test_network_required(self):
        self.assertFalse(self.evaluate(network='chipnet').eligible)

    def test_unverified_provider_fails(self):
        self.assertFalse(self.evaluate(provider_network_verified=False).eligible)

    def test_no_browser_truthy_shortcut(self):
        self.assertFalse(self.evaluate(wallet_ownership_verified='true').eligible)

    def test_bad_amount(self):
        self.assertFalse(self.evaluate(amount_satoshis=True).eligible)
