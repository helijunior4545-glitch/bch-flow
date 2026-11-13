"""V2.9.4.2 strict provider-specific unit conversion; offline, read-only."""
from decimal import Decimal
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.transaction_validation_v294 import _blockbook_sats, _sats, _outputs

class V2942UnitTests(SimpleTestCase):
    def test_blockbook_integer_satoshis(self):
        self.assertEqual(_blockbook_sats('123456789'), 123456789)
        self.assertEqual(_blockbook_sats(1), 1)
        self.assertEqual(_blockbook_sats('0'), 0)
    def test_rpc_bch_decimal(self):
        self.assertEqual(_sats('1.23456789'), 123456789)
        self.assertEqual(_sats('0.00000001'), 1)
    def test_same_output_both_sources(self):
        book = {'vout': [{'n': 0, 'value': '123456789', 'hex': '76a9'}]}
        rpc = {'vout': [{'n': 0, 'value': '1.23456789', 'scriptPubKey': {'hex': '76a9'}}]}
        self.assertEqual(_outputs(book, source='blockbook'), _outputs(rpc, source='rpc'))
    def test_blockbook_fractional_rejected(self):
        for value in ('1.0', '1.5', Decimal('1.1'), '1e8'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                _blockbook_sats(value)
    def test_blockbook_invalid_types_rejected(self):
        for value in (True, False, None, 1.0, '-1', '+1', ' 1', '', 'NaN', 'Infinity', '0x10'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                _blockbook_sats(value)
    def test_blockbook_supply_limit(self):
        self.assertEqual(_blockbook_sats('2100000000000000'), 2100000000000000)
        for value in ('2100000000000001', '99999999999999999', -1):
            with self.subTest(value=value), self.assertRaises(ValueError):
                _blockbook_sats(value)
    def test_rpc_fractional_satoshi_rejected(self):
        with self.assertRaises(ValueError):
            _sats('0.000000001')
    def test_source_not_inferred_from_digits(self):
        book = {'vout': [{'n': 0, 'value': '100000000', 'hex': '76a9'}]}
        self.assertEqual(_outputs(book, source='blockbook'), {0: (100000000, '76a9')})
        with self.assertRaises(ValueError):
            _outputs(book, source='unknown')
