"""V4.4 contract tests: no writes, explicit opt-in, conservative diff."""
from unittest.mock import patch, MagicMock
from django.test import SimpleTestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from io import StringIO
from app_bch_flow.management.commands.bch_wallet_watch_v44 import compare

class V44WatcherTests(SimpleTestCase):
    def test_disabled_by_default(self):
        with patch.dict('os.environ', {'BCHFLOW_V44_ENABLE_WATCHER':'0'}):
            with self.assertRaises(CommandError):
                call_command('bch_wallet_watch_v44', organization='00000000-0000-0000-0000-000000000001', stdout=StringIO())
    def test_interval_rejected(self):
        with patch.dict('os.environ', {'BCHFLOW_V44_ENABLE_WATCHER':'1','BCHFLOW_V43_ENABLE_ADDRESS_READ':'1'}):
            with self.assertRaises(CommandError):
                call_command('bch_wallet_watch_v44', organization='00000000-0000-0000-0000-000000000001', interval=10, stdout=StringIO())
    def test_new_outpoint_not_settlement(self):
        a={'addresses':[]}
        b={'addresses':[{'address':'bitcoincash:abc','utxos':[{'txid':'a'*64,'vout':0,'satoshis':100,'confirmations':0}]}]}
        diff=compare(a,b)
        self.assertEqual(len(diff['new_outpoints']),1)
        self.assertNotIn('settled',diff)
    def test_confirmation_regression_detected(self):
        row={'txid':'b'*64,'vout':0,'satoshis':100,'confirmations':4}
        a={'addresses':[{'address':'a','utxos':[row]}]}
        b={'addresses':[{'address':'a','utxos':[dict(row,confirmations=0)]}]}
        self.assertEqual(compare(a,b)['confirmation_changes'][0]['after'],0)
