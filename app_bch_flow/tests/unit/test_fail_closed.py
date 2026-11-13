import unittest
from app_bch_flow.blockchain.gateway import BCHGateway
from app_bch_flow.core.exceptions import PaymentUnavailable

class FailClosedTests(unittest.TestCase):
    def test_no_broadcast(self):
        with self.assertRaises(PaymentUnavailable): BCHGateway().broadcast("fake")
