"""Deterministic V4.0 gate and fail-closed tests; no network/DB access."""
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v40_payment_observer import observe_invoice_txid, ObservationError

class V40Tests(SimpleTestCase):
    def test_opt_in_required(self):
        with patch.dict('os.environ', {'BCHFLOW_V40_ENABLE_OBSERVATION': '0'}):
            with self.assertRaises(ObservationError):
                observe_invoice_txid('123', 'a'*64)

    def test_invalid_txid_rejected(self):
        with patch.dict('os.environ', {'BCHFLOW_V40_ENABLE_OBSERVATION': '1'}):
            for txid in ('', 'not-a-txid', 'x'*64, 'a'*65):
                with self.subTest(txid=txid), self.assertRaises(ObservationError):
                    observe_invoice_txid('123', txid)

    def test_invalid_confirmation_policy(self):
        with patch.dict('os.environ', {'BCHFLOW_V40_ENABLE_OBSERVATION': '1'}):
            for value in (0, 101, True, '2'):
                with self.subTest(value=value), self.assertRaises(ObservationError):
                    observe_invoice_txid('123', 'a'*64, min_confirmations=value)

    def test_no_invoice_lookup_when_disabled(self):
        with patch.dict('os.environ', {'BCHFLOW_V40_ENABLE_OBSERVATION': '0'}):
            with patch('app_bch_flow.blockchain.v40_payment_observer.BCHInvoice') as model:
                with self.assertRaises(ObservationError):
                    observe_invoice_txid('123', 'a'*64)
                model.objects.using.assert_not_called()
