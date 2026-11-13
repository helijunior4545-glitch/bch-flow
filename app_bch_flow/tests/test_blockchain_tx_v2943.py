"""V2.9.4.3: JSON-RPC floating BCH amounts, strict satoshi validation."""
from decimal import Decimal
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.transaction_validation_v294 import _sats, _outputs

class RPCFloatV2943Tests(SimpleTestCase):
    def test_rpc_float_bch_amounts(self):
        for amount, expected in [(0.001,100000),(1.0,100000000),(0.00000001,1),(1.23456789,123456789),(0.0,0)]:
            with self.subTest(amount=amount):
                self.assertEqual(_sats(amount), expected)
    def test_rpc_output_float(self):
        tx={'vout':[{'n':0,'value':0.001,'scriptPubKey':{'hex':'76a9'}}]}
        self.assertEqual(_outputs(tx,source='rpc'),{0:(100000,'76a9')})
    def test_rpc_invalid_values(self):
        for value in [True,False,None,-0.1,float('nan'),float('inf'),float('-inf'),0.000000001,21000001.0,object()]:
            with self.subTest(value=repr(value)), self.assertRaises(ValueError):
                _sats(value)
    def test_rpc_decimal_precision(self):
        self.assertEqual(_sats(Decimal('0.00000001')),1)
        with self.assertRaises(ValueError):
            _sats(Decimal('0.000000001'))
    def test_blockbook_float_still_rejected(self):
        tx={'vout':[{'n':0,'value':1.0,'hex':'76a9'}]}
        with self.assertRaises(ValueError):
            _outputs(tx,source='blockbook')
