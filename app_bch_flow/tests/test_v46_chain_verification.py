"""V4.6 provider corroboration tests; synthetic data, no network or BCH transfers."""
from datetime import timedelta
from types import SimpleNamespace
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization, BCHInvoice, BCHFinancialEvent, BCHPayment
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation
from app_bch_flow.blockchain.v33_engine import OutputEvidence
from app_bch_flow.blockchain.v46_chain_verification import verify_invoice_chain, ChainVerificationError

TX = 'a'*64
BLOCK = 'b'*64
ADDR = 'bitcoincash:qzrjshsrha097j5j8v8hxc0lchujc7ptpu3chu7ftd'

class FakeProvider:
    def __init__(self, outputs, base):
        self.outputs = outputs
        self.base = base
    def outputs_for_address(self, *, network, address):
        assert network == 'mainnet' and address == ADDR
        return self.outputs

class V46Tests(TestCase):
    databases = {'default'}
    def setUp(self):
        self.org = BCHOrganization.objects.create(name='V46', slug='v46')
        self.inv = BCHInvoice.objects.create(organization=self.org, amount_satoshis=10000,
            receiving_cashaddr=ADDR, network='mainnet', expires_at=timezone.now()+timedelta(days=1))
        self.obs = BCHFinancialEvent.objects.create(organization=self.org, invoice=self.inv,
            event_type='bch.v35.observation', metadata={'source':'external_unverified','evidence_digest':'a'*64})
        self.ev = BCHFinancialEvent.objects.create(organization=self.org, invoice=self.inv,
            event_type='bch.v42.attribution_pre_review', metadata={
                'network':'mainnet','txid':TX,'decision':'manual_review_only','review_required':True,
                'source':'external_unverified','assessment_digest':'b'*64,
                'observation_id':str(self.obs.pk),'observation_digest':'a'*64,
                'observed_satoshis':10000,'confirmed_satoshis':10000,
                'outpoints':[{'txid':TX,'vout':0}]})
        BCHOutpointReservation.objects.create(organization=self.org, invoice=self.inv,
            evidence_event=self.ev, network='mainnet', txid=TX, output_index=0)
    def output(self, *, value=10000, block=BLOCK, confirmations=4, txid=TX, vout=0):
        return OutputEvidence(txid=txid,vout=vout,address=ADDR,satoshis=value,
            network='mainnet',confirmations=confirmations,block_hash=block if confirmations else '')
    def check(self, first=None, second=None, **kw):
        first = [self.output()] if first is None else first
        second = [self.output()] if second is None else second
        return verify_invoice_chain(self.inv.pk,self.ev.pk,
            primary=FakeProvider(tuple(first),'https://provider-a.example'),
            secondary=FakeProvider(tuple(second),'https://provider-b.example'),**kw)
    def test_corrob_only_never_settlement(self):
        result=self.check()
        self.assertEqual(result.decision,'corroborated_external_only')
        self.assertFalse(result.settlement_authorized)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.status,'created')
        self.assertIsNone(self.inv.paid_at)
        self.assertEqual(BCHPayment.objects.count(),0)
        self.assertEqual(BCHFinancialEvent.objects.count(),2)
    def test_provider_amount_disagreement(self):
        self.assertEqual(self.check(second=[self.output(value=9999)]).decision,'blocked')
    def test_both_providers_wrong_amount(self):
        self.assertIn('amount_mismatch',self.check(first=[self.output(value=9999)],second=[self.output(value=9999)]).reasons)
    def test_block_hash_disagreement(self):
        self.assertEqual(self.check(second=[self.output(block='c'*64)]).decision,'blocked')
    def test_confirmations_below_threshold(self):
        self.assertEqual(self.check(first=[self.output(confirmations=1)],second=[self.output(confirmations=1)]).decision,'blocked')
    def test_missing_txid(self):
        self.assertIn('outpoint_set_mismatch',self.check(first=[self.output(txid='d'*64)],second=[self.output(txid='d'*64)]).reasons)
    def test_extra_output_same_txid(self):
        x=[self.output(),self.output(value=2000,vout=1)]
        self.assertIn('outpoint_set_mismatch',self.check(first=x,second=x).reasons)
    def test_v45_blocked_prevents_provider_call(self):
        self.inv.expires_at=timezone.now()-timedelta(seconds=1)
        self.inv.save(update_fields=['expires_at'])
        self.assertEqual(self.check().decision,'blocked')
    def test_invalid_confirmation_threshold(self):
        with self.assertRaises(ChainVerificationError):self.check(min_confirmations=0)
    def test_duplicate_provider_instance(self):
        p=FakeProvider((self.output(),),'https://provider-a.example')
        with self.assertRaises(ChainVerificationError):
            verify_invoice_chain(self.inv.pk,self.ev.pk,primary=p,secondary=p)
    def test_same_provider_hostname(self):
        p=FakeProvider((self.output(),),'https://same.example')
        q=FakeProvider((self.output(),),'https://same.example')
        with self.assertRaises(ChainVerificationError):
            verify_invoice_chain(self.inv.pk,self.ev.pk,primary=p,secondary=q)
