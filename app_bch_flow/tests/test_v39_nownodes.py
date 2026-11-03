"""V3.9 deterministic tests; no external network or DB."""
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v34_blockbook import NetworkReadError
from app_bch_flow.blockchain.v39_nownodes import NOWNodesBCHProvider

GOOD = {'blockbook':{'coin':'Bcash','network':'BCH','inSync':True,'initialSync':False,'inSyncMempool':True,'bestHeight':975538}, 'backend':{'chain':'main','blocks':975538,'headers':975538}}
ENV = {'BCHFLOW_V34_ENABLE_NETWORK':'1','BCHFLOW_V34_BLOCKBOOK_URL':'https://bchbook.nownodes.io','BCHFLOW_V34_ALLOWED_HOSTS':'bchbook.nownodes.io','BCHFLOW_V39_ENABLE_NOWNODES':'1','BCHFLOW_V39_NOWNODES_API_KEY':'dummy-test-key'}

class V39Tests(SimpleTestCase):
    def provider(self):
        with patch.dict('os.environ', ENV):
            return NOWNodesBCHProvider()
    def test_disabled(self):
        with patch.dict('os.environ', {**ENV, 'BCHFLOW_V39_ENABLE_NOWNODES':'0'}):
            with self.assertRaises(NetworkReadError): NOWNodesBCHProvider()
    def test_missing_key(self):
        with patch.dict('os.environ', {**ENV, 'BCHFLOW_V39_NOWNODES_API_KEY':''}):
            with self.assertRaises(NetworkReadError): NOWNodesBCHProvider()
    def test_wrong_host(self):
        with patch.dict('os.environ', {**ENV, 'BCHFLOW_V34_BLOCKBOOK_URL':'https://other.example','BCHFLOW_V34_ALLOWED_HOSTS':'other.example'}):
            with self.assertRaises(NetworkReadError): NOWNodesBCHProvider()
    def test_status(self):
        p=self.provider()
        with patch.object(p, '_get', return_value=GOOD) as get:
            self.assertEqual(p.status()['height'], 975538)
            get.assert_called_once_with('/api/status', {})
    def test_bad_network(self):
        p=self.provider()
        bad={**GOOD, 'backend':{**GOOD['backend'],'chain':'test'}}
        with patch.object(p,'_get',return_value=bad):
            with self.assertRaises(NetworkReadError): p.status()
    def test_out_of_sync(self):
        p=self.provider()
        bad={**GOOD, 'blockbook':{**GOOD['blockbook'],'inSync':False}}
        with patch.object(p,'_get',return_value=bad):
            with self.assertRaises(NetworkReadError): p.status()
    def test_height_disagreement(self):
        p=self.provider()
        bad={**GOOD, 'backend':{**GOOD['backend'],'blocks':975537}}
        with patch.object(p,'_get',return_value=bad):
            with self.assertRaises(NetworkReadError): p.status()
    def test_auth_header_injected(self):
        p=self.provider()
        class Response:
            status=200
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self,n): return b'{"ok":true}'
        class Spy:
            def open(self,request,timeout):
                self.request=request
                return Response()
        spy=Spy(); p.opener=spy
        self.assertEqual(p._get('/api/status',{}), {'ok':True})
        self.assertEqual(spy.request.get_header('Api-key'), 'dummy-test-key')
        self.assertNotIn('dummy-test-key',spy.request.full_url)
        self.assertIs(p.opener,spy)
