import unittest
from app_bch_flow.payments.state_machine import transition

class PaymentStateTests(unittest.TestCase):
    def test_valid(self): self.assertEqual(transition("created", "awaiting_payment"), "awaiting_payment")
    def test_not_directly_confirmed(self):
        with self.assertRaises(ValueError): transition("created", "confirmed")
