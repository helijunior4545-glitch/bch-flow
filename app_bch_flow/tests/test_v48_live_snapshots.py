"""Offline tests: no real blockchain traffic or database mutations."""
import os
from datetime import datetime, timezone, timedelta
from unittest import TestCase, mock
from app_bch_flow.blockchain.v48_live_snapshots import collect_live_snapshots, SnapshotError

TX='a'*64
BLOCK='b'*64
ADDR='bitcoincash:qtestonly'
A='https://node-a.example'
B='https://node-b.example'

def payload(url, headers):
    if url.endswith('/api/v2'):
        return {'blockbook': {'coin':'Bitcoin Cash','inSync':True,'initialSync':False,'bestHeight':103}, 'backend': {'chain':'main'}}
    return {'txid':TX,'blockHeight':100,'confirmations':4,'blockHash':BLOCK,
            'blockTime':1600000000,'vout':[{'n':0,'value':'10000','addresses':[ADDR]}]}

class V48Tests(TestCase):
    def call(self, **kw):
        args=dict(primary_url=A,secondary_url=B,fetch=payload)
        args.update(kw)
        return collect_live_snapshots(TX,ADDR,{0:10000},**args)
    def setUp(self):
        self.env=mock.patch.dict(os.environ,{'BCHFLOW_V48_ENABLE_LIVE':'1','BCHFLOW_V48_ALLOWED_HOSTS':'node-a.example,node-b.example'})
        self.env.start()
    def tearDown(self): self.env.stop()
    def test_live_readonly(self):
        result=self.call()
        self.assertEqual(result.assessment.decision,'current_external_only')
        self.assertFalse(result.settlement_authorized)
    def test_opt_in(self):
        os.environ['BCHFLOW_V48_ENABLE_LIVE']='0'
        with self.assertRaises(SnapshotError): self.call()
    def test_allowlist(self):
        os.environ['BCHFLOW_V48_ALLOWED_HOSTS']='node-a.example'
        with self.assertRaises(SnapshotError): self.call()
    def test_same_host(self):
        with self.assertRaises(SnapshotError): self.call(secondary_url=A)
    def test_http_rejected(self):
        with self.assertRaises(SnapshotError): self.call(primary_url='http://node-a.example')
    def test_url_credentials_rejected(self):
        with self.assertRaises(SnapshotError): self.call(primary_url='https://user:pass@node-a.example')
    def test_wrong_amount(self):
        with self.assertRaises(SnapshotError): self.call(fetch=lambda u,h: ({**payload(u,h),'vout':[{'n':0,'value':'9999','addresses':[ADDR]}]} if '/tx/' in u else payload(u,h)))
    def test_wrong_network(self):
        with self.assertRaises(SnapshotError): self.call(fetch=lambda u,h: ({**payload(u,h),'backend':{'chain':'test'}} if u.endswith('/api/v2') else payload(u,h)))
    def test_out_of_sync(self):
        with self.assertRaises(SnapshotError): self.call(fetch=lambda u,h: ({**payload(u,h),'blockbook':{**payload(u,h)['blockbook'],'inSync':False}} if u.endswith('/api/v2') else payload(u,h)))
    def test_provider_disagreement(self):
        def f(u,h):
            p=payload(u,h)
            return {**p,'blockHash':'c'*64} if 'node-b' in u and '/tx/' in u else p
        with self.assertRaises(SnapshotError): self.call(fetch=f)
    def test_confirmations_below_threshold(self):
        self.assertEqual(self.call(min_confirmations=5).assessment.decision,'blocked')
    def test_reorg_between_observations(self):
        calls=[0]
        def f(u,h):
            p=payload(u,h)
            if u.endswith('/api/v2') and 'node-b' in u: calls[0]+=1
            if calls[0]>=1 and '/tx/' in u:
                return {**p,'blockHash':'c'*64}
            return p
        # In a real reorg, two hosts must agree on the changed hash within the second pair.
        self.assertEqual(self.call(fetch=f).assessment.decision,'reorg_suspected')
    def test_no_redirect_class(self):
        from app_bch_flow.blockchain.v48_live_snapshots import NoRedirect
        with self.assertRaises(SnapshotError): NoRedirect().redirect_request(None,None,302,'',{},'https://evil.example')
