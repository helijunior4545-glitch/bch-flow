from copy import deepcopy
from datetime import datetime, timezone
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v51_corroboration import corroborate, CorroborationError

TX = 'a' * 64
ADDR = 'bitcoincash:q' + 'a' * 41

def sample(provider):
    return dict(schema='bchflow.v49.real_transaction_diagnostic', network='mainnet',
                provider=provider, provider_status='in_sync',
                assessment='external_single_provider_observation_only',
                invoice_attributed=False, payment_created=False, settlement_authorized=False,
                txid=TX, block_hash='b'*64, block_height=100, tip_height=102,
                confirmations=3, observed_at=datetime.now(timezone.utc).isoformat(),
                outputs=[dict(vout=0, satoshis=10000, addresses=[ADDR])])

class V51Tests(SimpleTestCase):
    def check(self, a=None, b=None):
        return corroborate(a or sample('operator-A'), b or sample('operator-B'), expected_txid=TX)

    def test_agreement_does_not_prove_independence(self):
        r=self.check()
        self.assertEqual(r['comparison'], 'consistent_unverified_sources')
        self.assertFalse(r['independent_corroboration'])
        self.assertFalse(r['settlement_authorized'])
        self.assertFalse(r['payment_created'])

    def test_output_disagreement(self):
        b=sample('operator-B');b['outputs'][0]['satoshis']=9999
        self.assertIn('output_disagreement',self.check(b=b)['reasons'])

    def test_block_disagreement(self):
        b=sample('operator-B');b['block_hash']='c'*64
        self.assertIn('block_disagreement',self.check(b=b)['reasons'])

    def test_same_provider(self):
        self.assertIn('same_provider_label',self.check(b=sample('operator-A'))['reasons'])

    def test_stale(self):
        a=sample('operator-A');a['observed_at']='2020-01-01T00:00:00+00:00'
        with self.assertRaises(CorroborationError): self.check(a=a)

    def test_bad_confirmation_math(self):
        a=sample('operator-A');a['confirmations']=7
        self.assertIn('primary_inconsistent_chain_height',self.check(a=a)['reasons'])

    def test_duplicate_outpoint(self):
        a=sample('operator-A');a['outputs'].append(deepcopy(a['outputs'][0]))
        with self.assertRaises(CorroborationError): self.check(a=a)

    def test_wrong_txid(self):
        b=sample('operator-B');b['txid']='c'*64
        self.assertIn('secondary_txid_mismatch',self.check(b=b)['reasons'])

    def test_wrong_chain(self):
        b=sample('operator-B');b['network']='testnet'
        self.assertIn('secondary_network_or_sync_invalid',self.check(b=b)['reasons'])

    def test_untrusted_write_claim(self):
        b=sample('operator-B');b['payment_created']=True
        self.assertIn('secondary_unexpected_write_claim',self.check(b=b)['reasons'])

    def test_insufficient_confirmations(self):
        a=sample('operator-A');a['confirmations']=1;a['tip_height']=100
        self.assertIn('primary_insufficient_confirmations',self.check(a=a)['reasons'])
