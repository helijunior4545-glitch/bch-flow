"""V4.4 PostgreSQL concurrency tests using independent thread-local connections.

TransactionTestCase is intentional: TestCase wraps each test in a transaction
and cannot validate real concurrent commits from independent connections.
"""
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from django.db import connections, transaction, IntegrityError
from django.test import TransactionTestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization, BCHInvoice, BCHFinancialEvent, BCHPayment, BCHTransaction
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation
from app_bch_flow.blockchain.v43_outpoint_reservation import reserve_outpoint, ReservationConflict

TX='a'*64
ADDR='bitcoincash:qzrjshsrha097j5j8v8xxc0lchujc7jtpu3chu7ftd'

class V44ConcurrentReservations(TransactionTestCase):
    databases={'default'}
    reset_sequences=False

    def setUp(self):
        self.org=BCHOrganization.objects.using('default').create(name='V44 concurrency',slug='v44-concurrency')
        self.first=self._fixture()
        self.second=self._fixture()

    def _fixture(self):
        invoice=BCHInvoice.objects.using('default').create(
            organization=self.org, amount_satoshis=10000, receiving_cashaddr=ADDR,
            network='mainnet', expires_at=timezone.now()+timedelta(days=1))
        event=BCHFinancialEvent.objects.using('default').create(
            organization=self.org,invoice=invoice,event_type='bch.v42.attribution_pre_review',
            previous_status='created',next_status='created',
            metadata={'network':'mainnet','txid':TX,'decision':'manual_review_only',
                      'review_required':True,'assessment_digest':'b'*64,
                      'outpoints':[{'txid':TX,'vout':0}]})
        return invoice.pk,event.pk

    @staticmethod
    def _attempt(pair, barrier, *, rollback=False):
        # Django connections are thread-local; close both ends to prevent leakage.
        connections.close_all()
        try:
            barrier.wait(timeout=10)
            if rollback:
                try:
                    with transaction.atomic(using='default'):
                        result=reserve_outpoint(pair[0],pair[1],TX,0,write=True)
                        if not result.created:
                            return 'unexpected-existing'
                        raise RuntimeError('deliberate rollback')
                except RuntimeError:
                    return 'rolled-back'
            result=reserve_outpoint(pair[0],pair[1],TX,0,write=True)
            return ('created' if result.created else 'idempotent',result.reservation_id)
        except ReservationConflict:
            return 'conflict'
        finally:
            connections.close_all()

    def _race(self,a,b,*,rollback_a=False):
        barrier=threading.Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as pool:
            f1=pool.submit(self._attempt,a,barrier,rollback=rollback_a)
            f2=pool.submit(self._attempt,b,barrier)
            return f1.result(timeout=20),f2.result(timeout=20)

    def _assert_not_settled(self):
        self.assertEqual(BCHPayment.objects.using('default').count(),0)
        self.assertEqual(BCHTransaction.objects.using('default').count(),0)
        for pk,_ in (self.first,self.second):
            inv=BCHInvoice.objects.using('default').get(pk=pk)
            self.assertEqual(inv.status,'created')
            self.assertIsNone(inv.paid_at)

    def test_competing_invoices_one_winner(self):
        outcomes=self._race(self.first,self.second)
        self.assertEqual(sum(isinstance(x,tuple) and x[0]=='created' for x in outcomes),1,outcomes)
        self.assertEqual(sum(x=='conflict' for x in outcomes),1,outcomes)
        self.assertEqual(BCHOutpointReservation.objects.using('default').count(),1)
        self._assert_not_settled()

    def test_same_invoice_concurrent_idempotency(self):
        outcomes=self._race(self.first,self.first)
        self.assertEqual({x[0] for x in outcomes},{'created','idempotent'},outcomes)
        self.assertEqual(outcomes[0][1],outcomes[1][1])
        self.assertEqual(BCHOutpointReservation.objects.using('default').count(),1)
        self._assert_not_settled()

    def test_transaction_rollback_releases_claim(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic(using='default'):
                reserve_outpoint(*self.first,TX,0,write=True)
                raise RuntimeError('rollback')
        self.assertEqual(BCHOutpointReservation.objects.using('default').count(),0)
        result=reserve_outpoint(*self.second,TX,0,write=True)
        self.assertTrue(result.created)
        self._assert_not_settled()

    def test_db_constraint_even_without_service(self):
        first=reserve_outpoint(*self.first,TX,0,write=True)
        self.assertTrue(first.created)
        with self.assertRaises(IntegrityError):
            with transaction.atomic(using='default'):
                BCHOutpointReservation.objects.using('default').create(
                    organization=self.org,invoice_id=self.second[0],
                    evidence_event_id=self.second[1],network='mainnet',txid=TX,output_index=0)
        self.assertEqual(BCHOutpointReservation.objects.using('default').count(),1)
        self._assert_not_settled()

    def test_distinct_outpoint_is_independent(self):
        invoice_id,event_id=self.second
        event=BCHFinancialEvent.objects.using('default').get(pk=event_id)
        event.metadata={**event.metadata,'outpoints':[{'txid':TX,'vout':1}]}
        event.save(update_fields=['metadata'])
        a=reserve_outpoint(*self.first,TX,0,write=True)
        b=reserve_outpoint(*self.second,TX,1,write=True)
        self.assertTrue(a.created and b.created)
        self.assertEqual(BCHOutpointReservation.objects.using('default').count(),2)
        self._assert_not_settled()
