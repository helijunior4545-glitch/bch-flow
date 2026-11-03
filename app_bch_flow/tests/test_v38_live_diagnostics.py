"""Offline V3.8 deterministic diagnostics tests; no live internet access."""
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v33_engine import OutputEvidence
from app_bch_flow.blockchain.v38_live_diagnostics import diagnose, DiagnosticError

ADDR='bitcoincash:qexample'

def out(value=1500, block='b'*64, confirmations=3):
    return OutputEvidence(txid='a'*64, vout=0, address=ADDR, satoshis=value,
                          network='mainnet', confirmations=confirmations, block_hash=block)

class FakeProvider:
    def __init__(self, *, coin='Bitcoin Cash', items=None, host='a.example', error=False):
        self.coin=coin; self.items=(out(),) if items is None else items
        self.base='https://'+host
        self.error=error
    def _get(self, path, params):
        if self.error: raise ValueError('unavailable')
        if path != '/api/v2': raise ValueError('unexpected path')
        return {'coin':self.coin}
    def outputs_for_address(self, *, network, address):
        return self.items

class V38DiagnosticTests(SimpleTestCase):
    def providers(self, **kwargs):
        return FakeProvider(**kwargs), FakeProvider(host='b.example')
    def test_corroborated(self):
        a,b=self.providers()
        self.assertEqual(diagnose(address=ADDR,primary=a,secondary=b).status,'corroborated_external')
    def test_coin_mismatch(self):
        a,b=self.providers(coin='Bitcoin')
        with self.assertRaises(DiagnosticError): diagnose(address=ADDR,primary=a,secondary=b)
    def test_same_hostname(self):
        a=FakeProvider(); b=FakeProvider()
        with self.assertRaises(DiagnosticError): diagnose(address=ADDR,primary=a,secondary=b)
    def test_same_instance(self):
        a=FakeProvider()
        with self.assertRaises(DiagnosticError): diagnose(address=ADDR,primary=a,secondary=a)
    def test_value_disagreement(self):
        a=FakeProvider(items=(out(100),)); b=FakeProvider(items=(out(200),),host='b.example')
        self.assertEqual(diagnose(address=ADDR,primary=a,secondary=b).status,'disagreement')
    def test_empty_inconclusive(self):
        a=FakeProvider(items=()); b=FakeProvider(items=(),host='b.example')
        self.assertEqual(diagnose(address=ADDR,primary=a,secondary=b).status,'inconclusive')
    def test_invalid_threshold(self):
        a,b=self.providers()
        with self.assertRaises(DiagnosticError): diagnose(address=ADDR,primary=a,secondary=b,min_confirmations=0)
    def test_provider_error(self):
        a=FakeProvider(error=True); b=FakeProvider(host='b.example')
        with self.assertRaises(DiagnosticError): diagnose(address=ADDR,primary=a,secondary=b)
    def test_empty_address(self):
        a,b=self.providers()
        with self.assertRaises(DiagnosticError): diagnose(address='',primary=a,secondary=b)
    def test_unconfirmed_inconclusive(self):
        a=FakeProvider(items=(out(confirmations=0,block=''),))
        b=FakeProvider(items=(out(confirmations=0,block=''),),host='b.example')
        self.assertEqual(diagnose(address=ADDR,primary=a,secondary=b).status,'inconclusive')
