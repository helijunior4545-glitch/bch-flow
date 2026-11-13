"""No external calls; mocked Blockbook HTTPS transport."""
import json
import os
from unittest import TestCase
from unittest.mock import patch
from app_bch_flow.blockchain.v34_blockbook import BlockbookReadOnlyProvider, NetworkReadError

ADDR='bitcoincash:qq07example'
TX='a'*64
BLOCK='b'*64
ENV={'BCHFLOW_V34_ENABLE_NETWORK':'1', 'BCHFLOW_V34_BLOCKBOOK_URL':'https://bch.example.org',
     'BCHFLOW_V34_ALLOWED_HOSTS':'bch.example.org'}

class NetworkAdapterTests(TestCase):
    def test_disabled_by_default(self):
        with patch.dict(os.environ, {'BCHFLOW_V34_ENABLE_NETWORK':'0'}):
            with self.assertRaises(NetworkReadError): BlockbookReadOnlyProvider()
    def test_http_rejected(self):
        with patch.dict(os.environ, dict(ENV, BCHFLOW_V34_BLOCKBOOK_URL='http://bch.example.org')):
            with self.assertRaises(NetworkReadError): BlockbookReadOnlyProvider()
    def test_host_allowlist(self):
        with patch.dict(os.environ, dict(ENV, BCHFLOW_V34_ALLOWED_HOSTS='elsewhere.org')):
            with self.assertRaises(NetworkReadError): BlockbookReadOnlyProvider()
    def test_chipnet_rejected(self):
        with patch.dict(os.environ, ENV):
            with self.assertRaises(NetworkReadError): BlockbookReadOnlyProvider(network='chipnet')
    def test_timeout_bounds(self):
        with patch.dict(os.environ, ENV):
            with self.assertRaises(NetworkReadError): BlockbookReadOnlyProvider(timeout=100)
    def test_page_limit_bounds(self):
        with patch.dict(os.environ, ENV):
            with self.assertRaises(NetworkReadError): BlockbookReadOnlyProvider(max_pages=0)
    def test_bad_response(self):
        with patch.dict(os.environ, ENV):
            p=BlockbookReadOnlyProvider()
            with patch('app_bch_flow.blockchain.v34_blockbook.validate_cashaddr', return_value=ADDR):
                with patch.object(p,'_get',return_value={'address':ADDR,'totalPages':1,'transactions':'bad'}):
                    with self.assertRaises(NetworkReadError): p.outputs_for_address(network='mainnet',address=ADDR)
    def test_valid_evidence(self):
        data={'address':ADDR,'totalPages':1,'transactions':[{'txid':TX,'confirmations':2,'blockHash':BLOCK,
              'vout':[{'n':0,'addresses':[ADDR],'value':'1000'}, {'n':1,'addresses':['other'],'value':'2000'}]}]}
        with patch.dict(os.environ, ENV):
            p=BlockbookReadOnlyProvider()
            with patch('app_bch_flow.blockchain.v34_blockbook.validate_cashaddr', return_value=ADDR):
                with patch.object(p,'_get',return_value=data):
                    results=p.outputs_for_address(network='mainnet',address=ADDR)
        self.assertEqual(len(results),1)
        self.assertEqual(results[0].satoshis,1000)
        self.assertEqual(results[0].confirmations,2)
    def test_duplicate_output_rejected(self):
        tx={'txid':TX,'confirmations':0,'vout':[{'n':0,'addresses':[ADDR],'value':'1000'}]}
        with patch.dict(os.environ, ENV):
            p=BlockbookReadOnlyProvider()
            with patch('app_bch_flow.blockchain.v34_blockbook.validate_cashaddr', return_value=ADDR):
                with patch.object(p,'_get',return_value={'address':ADDR,'totalPages':1,'transactions':[tx,tx]}):
                    with self.assertRaises(NetworkReadError): p.outputs_for_address(network='mainnet',address=ADDR)
    def test_incomplete_pages_rejected(self):
        with patch.dict(os.environ, ENV):
            p=BlockbookReadOnlyProvider(max_pages=1)
            with patch('app_bch_flow.blockchain.v34_blockbook.validate_cashaddr', return_value=ADDR):
                with patch.object(p,'_get',return_value={'address':ADDR,'totalPages':2,'transactions':[]}):
                    with self.assertRaises(NetworkReadError): p.outputs_for_address(network='mainnet',address=ADDR)
    def test_bad_confirmed_block_rejected(self):
        tx={'txid':TX,'confirmations':2,'vout':[{'n':0,'addresses':[ADDR],'value':'1000'}]}
        with patch.dict(os.environ, ENV):
            p=BlockbookReadOnlyProvider()
            with patch('app_bch_flow.blockchain.v34_blockbook.validate_cashaddr', return_value=ADDR):
                with patch.object(p,'_get',return_value={'address':ADDR,'totalPages':1,'transactions':[tx]}):
                    with self.assertRaises(NetworkReadError): p.outputs_for_address(network='mainnet',address=ADDR)
