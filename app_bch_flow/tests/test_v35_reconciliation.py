"""Tests use disposable PostgreSQL and deterministic fake output evidence."""
from unittest.mock import patch
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization, BCHInvoice, BCHFinancialEvent
from app_bch_flow.blockchain.v33_engine import OutputEvidence
from app_bch_flow.blockchain.v35_reconciliation import record_observation, ReconciliationError, EVENT_TYPE

ADDR='bitcoincash:qq07example'
TX='a'*64
BLOCK='b'*64

class V35JournalTests(TestCase):
    databases={'default'}
    def setUp(self):
        self.org=BCHOrganization.objects.using('default').create(name='V35 org', slug='v35-test-org')
        self.invoice=BCHInvoice.objects.using('default').create(
            organization=self.org, amount_satoshis=1000, receiving_cashaddr=ADDR,
            network='mainnet', expires_at=timezone.now()+timedelta(hours=2))
        self.output=OutputEvidence(TX, 0, ADDR, 1000, 'mainnet', 2, BLOCK)

    def test_dry_run_does_not_write(self):
        result=record_observation(self.invoice.pk, outputs=[self.output])
        self.assertEqual(result.status,'eligible_for_review')
        self.assertFalse(result.created)
        self.assertEqual(BCHFinancialEvent.objects.count(),0)

    def test_explicit_write_is_idempotent(self):
        first=record_observation(self.invoice.pk, outputs=[self.output], write=True)
        second=record_observation(self.invoice.pk, outputs=[self.output], write=True)
        self.assertTrue(first.created)
        self.assertFalse(second.created)
        self.assertEqual(first.event_id,second.event_id)
        self.assertEqual(BCHFinancialEvent.objects.filter(event_type=EVENT_TYPE).count(),1)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status,'created')
        self.assertIsNone(self.invoice.paid_at)

    def test_shared_address_unattributed(self):
        BCHInvoice.objects.create(organization=self.org, amount_satoshis=500,
            receiving_cashaddr=ADDR, network='mainnet',
            expires_at=timezone.now()+timedelta(hours=2))
        result=record_observation(self.invoice.pk, outputs=[self.output], write=True)
        self.assertEqual(result.status,'unattributed')
        self.assertFalse(result.exclusive)

    def test_duplicate_output_fails_without_write(self):
        with self.assertRaises(ReconciliationError):
            record_observation(self.invoice.pk, outputs=[self.output,self.output], write=True)
        self.assertEqual(BCHFinancialEvent.objects.count(),0)

    def test_different_confirmation_evidence_creates_new_event(self):
        record_observation(self.invoice.pk, outputs=[self.output], write=True)
        newer=OutputEvidence(TX,0,ADDR,1000,'mainnet',0,'')
        record_observation(self.invoice.pk, outputs=[newer], write=True)
        self.assertEqual(BCHFinancialEvent.objects.filter(event_type=EVENT_TYPE).count(),2)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status,'created')

    def test_bad_confirmation_policy_fails(self):
        with self.assertRaises(ReconciliationError):
            record_observation(self.invoice.pk, outputs=[self.output], min_confirmations=0, write=True)
        self.assertEqual(BCHFinancialEvent.objects.count(),0)

    def test_no_payment_or_transaction_created(self):
        from app_bch_flow.models import BCHPayment, BCHTransaction
        record_observation(self.invoice.pk, outputs=[self.output], write=True)
        self.assertEqual(BCHPayment.objects.count(),0)
        self.assertEqual(BCHTransaction.objects.count(),0)
