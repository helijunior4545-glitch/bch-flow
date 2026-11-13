"""V4.2 simulated ledger integration tests; no real payment."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization,BCHInvoice,BCHFinancialEvent,BCHPayment,BCHTransaction
from app_bch_flow.blockchain.v33_engine import OutputEvidence
from app_bch_flow.blockchain.v35_reconciliation import record_observation
from app_bch_flow.blockchain.v40_payment_observer import PaymentCandidate
from app_bch_flow.blockchain.v42_evidence_ledger import journal_assessment,EvidenceLinkError,EVENT_TYPE

ADDR='bitcoincash:qzrjshsrha097j5j8v8xxc0lchujc7jtpu3chu7ftd'
TX='a'*64
class V42LedgerTests(TestCase):
    databases={'default'}
    def setUp(self):
        self.org=BCHOrganization.objects.using('default').create(name='V42 simulation',slug='v42-sim')
        self.inv=BCHInvoice.objects.using('default').create(
            organization=self.org,amount_satoshis=10000,receiving_cashaddr=ADDR,
            network='mainnet',expires_at=timezone.now()+timedelta(days=1))
        self.evidence=OutputEvidence(TX,0,ADDR,10000,'mainnet',2,'b'*64)
        self.obs=record_observation(self.inv.pk,outputs=[self.evidence],min_confirmations=2,write=True)
        self.candidate=PaymentCandidate(invoice_id=str(self.inv.pk),txid=TX,status='unattributed',
            observed_satoshis=10000,confirmed_satoshis=10000,required_satoshis=10000,
            confirmations_required=2,output_count=1)
    def assert_safe(self):
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.status,'created')
        self.assertIsNone(self.inv.paid_at)
        self.assertEqual(BCHPayment.objects.count(),0)
        self.assertEqual(BCHTransaction.objects.count(),0)
    def test_dry_run_no_event(self):
        r=journal_assessment(self.inv.pk,self.obs.event_id,self.candidate)
        self.assertFalse(r.created)
        self.assertEqual(BCHFinancialEvent.objects.filter(event_type=EVENT_TYPE).count(),0)
        self.assert_safe()
    def test_explicit_write_and_idempotency(self):
        a=journal_assessment(self.inv.pk,self.obs.event_id,self.candidate,write=True)
        b=journal_assessment(self.inv.pk,self.obs.event_id,self.candidate,write=True)
        self.assertTrue(a.created)
        self.assertFalse(b.created)
        self.assertEqual(a.event_id,b.event_id)
        self.assertEqual(BCHFinancialEvent.objects.filter(event_type=EVENT_TYPE).count(),1)
        self.assert_safe()
    def test_unrelated_txid_rejected(self):
        from dataclasses import replace
        with self.assertRaises(EvidenceLinkError):
            journal_assessment(self.inv.pk,self.obs.event_id,replace(self.candidate,txid='c'*64),write=True)
        self.assert_safe()
    def test_mismatched_amount_rejected(self):
        from dataclasses import replace
        with self.assertRaises(EvidenceLinkError):
            journal_assessment(self.inv.pk,self.obs.event_id,replace(self.candidate,observed_satoshis=999),write=True)
        self.assert_safe()
    def test_wrong_observation_rejected(self):
        with self.assertRaises(EvidenceLinkError):
            journal_assessment(self.inv.pk,'00000000-0000-0000-0000-000000000000',self.candidate,write=True)
        self.assert_safe()
    def test_inactive_organization_rejected(self):
        self.org.is_active=False
        self.org.save(update_fields=['is_active'])
        with self.assertRaises(EvidenceLinkError):
            journal_assessment(self.inv.pk,self.obs.event_id,self.candidate,write=True)
        self.assert_safe()
    def test_manual_review_only_not_settlement(self):
        r=journal_assessment(self.inv.pk,self.obs.event_id,self.candidate,write=True)
        self.assertEqual(r.decision,'manual_review_only')
        self.assert_safe()
