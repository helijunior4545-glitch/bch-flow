"""V4.1 simulated policy tests. Django temporary test database only."""
from datetime import timedelta
from dataclasses import replace
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization, BCHInvoice, BCHPayment, BCHTransaction
from app_bch_flow.blockchain.v40_payment_observer import PaymentCandidate
from app_bch_flow.blockchain.v41_attribution import assess_candidate, AttributionError

ADDR = 'bitcoincash:qzrjshsrha097j5j8v8xxc0lchujc7jtpu3chu7ftd'
TXID = 'a' * 64

class AttributionPolicyTests(TestCase):
    databases = {'default'}
    @classmethod
    def setUpTestData(cls):
        cls.org = BCHOrganization.objects.using('default').create(name='Simulation',slug='v41-simulation',is_active=True)
        cls.invoice = BCHInvoice.objects.using('default').create(
            organization=cls.org,external_reference='V41-001',description='Simulation only',
            amount_satoshis=10000,receiving_cashaddr=ADDR,network='mainnet',status='created',
            expires_at=timezone.now()+timedelta(days=1))
    def candidate(self, **overrides):
        data=dict(invoice_id=str(self.invoice.pk),txid=TXID,status='unattributed',
                  observed_satoshis=10000,confirmed_satoshis=10000,
                  required_satoshis=10000,confirmations_required=2,output_count=1)
        data.update(overrides)
        return PaymentCandidate(**data)
    def assess(self, **kw):
        result=assess_candidate(self.invoice.pk,self.candidate(**kw))
        self.invoice.refresh_from_db(using='default')
        self.assertEqual(self.invoice.status,'created')
        self.assertIsNone(self.invoice.paid_at)
        self.assertEqual(BCHPayment.objects.using('default').count(),0)
        self.assertEqual(BCHTransaction.objects.using('default').count(),0)
        return result
    def test_exact_amount_requires_manual_review(self):
        r=self.assess()
        self.assertEqual(r.decision,'manual_review_only')
        self.assertIn('tx_time_not_verified',r.reasons)
    def test_partial_payment_blocked(self):
        self.assertIn('partial_or_missing_amount',self.assess(observed_satoshis=4000,confirmed_satoshis=4000).reasons)
    def test_unconfirmed_blocked(self):
        self.assertIn('insufficient_confirmed_amount',self.assess(confirmed_satoshis=0).reasons)
    def test_address_reuse_blocked(self):
        BCHInvoice.objects.using('default').create(
            organization=self.org,external_reference='V41-002',description='Reuse test',
            amount_satoshis=10000,receiving_cashaddr=ADDR,network='mainnet',
            expires_at=timezone.now()+timedelta(days=1))
        self.assertIn('address_reused_across_invoices',self.assess().reasons)
    def test_expired_blocked(self):
        self.invoice.expires_at=timezone.now()-timedelta(seconds=1)
        self.invoice.save(update_fields=['expires_at'])
        self.assertIn('invoice_expired_at_review',self.assess().reasons)
    def test_cancelled_blocked(self):
        self.invoice.status='cancelled'
        self.invoice.save(update_fields=['status'])
        r=assess_candidate(self.invoice.pk,self.candidate())
        self.assertEqual(r.decision,'blocked')
        self.assertIn('invoice_not_open',r.reasons)
    def test_other_invoice_candidate_rejected(self):
        with self.assertRaises(AttributionError):
            self.assess(invoice_id='00000000-0000-0000-0000-000000000000')
    def test_inconsistent_amount_rejected(self):
        with self.assertRaises(AttributionError):
            self.assess(observed_satoshis=100,confirmed_satoshis=200)
    def test_no_outputs_blocked(self):
        self.assertIn('no_matching_outputs',self.assess(output_count=0).reasons)
    def test_candidate_required_amount_mismatch(self):
        self.assertIn('candidate_amount_mismatch',self.assess(required_satoshis=9000).reasons)
