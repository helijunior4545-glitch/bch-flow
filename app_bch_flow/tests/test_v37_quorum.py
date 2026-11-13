"""Offline deterministic V3.7 tests: no external network required."""
import os
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v33_engine import OutputEvidence
from app_bch_flow.blockchain.v37_quorum import compare_evidence, probe_two_providers, QuorumError, _secondary_url

def out(*, txid='a'*64, block='b'*64, sats=1200, confirmations=3, address='bitcoincash:qtest', vout=0):
    return OutputEvidence(txid=txid, vout=vout, address=address, satoshis=sats,
                          network='mainnet', confirmations=confirmations,
                          block_hash=block if confirmations else '')

class FakeProvider:
    def __init__(self, items): self.items=items
    def outputs_for_address(self, *, network, address): return self.items

class V37QuorumTests(SimpleTestCase):
    def test_equal_confirmed(self):
        self.assertEqual(compare_evidence((out(),), (out(),)).status, 'corroborated_external')
    def test_different_value(self):
        self.assertEqual(compare_evidence((out(),), (out(sats=999),)).status, 'disagreement')
    def test_different_block(self):
        self.assertEqual(compare_evidence((out(),), (out(block='c'*64),)).status, 'disagreement')
    def test_missing_output(self):
        self.assertEqual(compare_evidence((out(),), (out(vout=1),)).status, 'disagreement')
    def test_unconfirmed(self):
        self.assertEqual(compare_evidence((out(confirmations=0),), (out(confirmations=0),)).status, 'inconclusive')
    def test_confirmation_drift_one_allowed(self):
        self.assertEqual(compare_evidence((out(confirmations=3),), (out(confirmations=4),)).status, 'corroborated_external')
    def test_confirmation_drift_two_rejected(self):
        self.assertEqual(compare_evidence((out(confirmations=3),), (out(confirmations=5),)).status, 'disagreement')
    def test_duplicate_rejected(self):
        with self.assertRaises(QuorumError): compare_evidence((out(),out()), (out(),))
    def test_empty_inconclusive(self):
        self.assertEqual(compare_evidence((), ()).status, 'inconclusive')
    def test_invalid_policy(self):
        with self.assertRaises(QuorumError): compare_evidence((out(),), (out(),), min_confirmations=0)
    def test_probe_fake_providers(self):
        a=FakeProvider((out(),));b=FakeProvider((out(),))
        self.assertEqual(probe_two_providers(network='mainnet',address='bitcoincash:qtest',primary=a,secondary=b).status,'corroborated_external')
    def test_same_instance_denied(self):
        a=FakeProvider((out(),))
        with self.assertRaises(QuorumError): probe_two_providers(network='mainnet',address='bitcoincash:qtest',primary=a,secondary=a)
    def test_secondary_disabled(self):
        with patch.dict(os.environ, {'BCHFLOW_V37_ENABLE_SECONDARY':'0'}):
            with self.assertRaises(QuorumError): _secondary_url()
    def test_same_hostname_denied(self):
        env={'BCHFLOW_V37_ENABLE_SECONDARY':'1','BCHFLOW_V37_SECONDARY_BLOCKBOOK_URL':'https://node.example',
             'BCHFLOW_V37_SECONDARY_ALLOWED_HOSTS':'node.example','BCHFLOW_V34_ENABLE_NETWORK':'1',
             'BCHFLOW_V34_BLOCKBOOK_URL':'https://node.example','BCHFLOW_V34_ALLOWED_HOSTS':'node.example'}
        with patch.dict(os.environ,env):
            with self.assertRaises(QuorumError): _secondary_url()
    def test_http_denied(self):
        env={'BCHFLOW_V37_ENABLE_SECONDARY':'1','BCHFLOW_V37_SECONDARY_BLOCKBOOK_URL':'http://other.example',
             'BCHFLOW_V37_SECONDARY_ALLOWED_HOSTS':'other.example','BCHFLOW_V34_ENABLE_NETWORK':'1',
             'BCHFLOW_V34_BLOCKBOOK_URL':'https://node.example','BCHFLOW_V34_ALLOWED_HOSTS':'node.example'}
        with patch.dict(os.environ,env):
            with self.assertRaises(QuorumError): _secondary_url()
