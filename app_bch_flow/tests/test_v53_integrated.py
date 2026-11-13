"""V5.3: real Django PostgreSQL test database; no external BCH settlement."""
import threading
import uuid
from datetime import timedelta
from django.db import connections, close_old_connections, transaction, IntegrityError
from django.test import TransactionTestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization, BCHInvoice, BCHFinancialEvent
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation
from app_bch_flow.blockchain.v43_outpoint_reservation import reserve_outpoint, ReservationConflict

TXID='a'*64

class V53ReservationIntegration(TransactionTestCase):
    databases={'default'}
    def setUp(self):
        super().setUp()
        self.assertEqual(connections['default'].vendor,'postgresql')
        self.orgs=[];self.invoices=[];self.events=[]
        for i in range(2):
            org=BCHOrganization.objects.using('default').create(name='V53 '+str(i),slug='v53-'+str(uuid.uuid4()))
            inv=BCHInvoice.objects.using('default').create(organization=org,amount_satoshis=1000,receiving_cashaddr='bitcoincash:qfixture',network='mainnet',expires_at=timezone.now()+timedelta(hours=1))
            ev=BCHFinancialEvent.objects.using('default').create(organization=org,invoice=inv,event_type='bch.v42.attribution_pre_review',metadata={'network':'mainnet','txid':TXID,'decision':'manual_review_only','review_required':True,'assessment_digest':'c'*64,'outpoints':[{'txid':TXID,'vout':0}]})
            self.orgs.append(org);self.invoices.append(inv);self.events.append(ev)
    def reserve(self,index,write=True):
        return reserve_outpoint(self.invoices[index].pk,self.events[index].pk,TXID,0,write=write)
    def test_01_dry_run_no_writes(self):
        result=self.reserve(0,False)
        self.assertFalse(result.created)
        self.assertEqual(BCHOutpointReservation.objects.count(),0)
    def test_02_same_claim_idempotent(self):
        first=self.reserve(0)
        second=self.reserve(0)
        self.assertTrue(first.created)
        self.assertFalse(second.created)
        self.assertEqual(first.reservation_id,second.reservation_id)
        self.assertEqual(BCHOutpointReservation.objects.count(),1)
    def test_03_cross_org_conflict(self):
        self.reserve(0)
        with self.assertRaises(ReservationConflict):self.reserve(1)
        self.assertEqual(BCHOutpointReservation.objects.count(),1)
    def test_04_atomic_rollback(self):
        with self.assertRaisesRegex(RuntimeError,'injected'):
            with transaction.atomic(using='default'):
                self.reserve(0)
                raise RuntimeError('injected')
        self.assertEqual(BCHOutpointReservation.objects.count(),0)
        self.assertTrue(self.reserve(1).created)
    def test_05_evidence_mismatch_fail_closed(self):
        with self.assertRaises(ReservationConflict):
            reserve_outpoint(self.invoices[0].pk,self.events[0].pk,'b'*64,0,write=True)
        self.assertEqual(BCHOutpointReservation.objects.count(),0)
    def test_06_two_real_reservation_calls_one_winner(self):
        barrier=threading.Barrier(2,timeout=8)
        outcomes=[];lock=threading.Lock()
        def worker(index):
            close_old_connections()
            try:
                barrier.wait()
                value=self.reserve(index)
                result=('created' if value.created else 'reused',index)
            except ReservationConflict:
                result=('conflict',index)
            except Exception as exc:
                result=('error',repr(exc))
            finally:
                connections['default'].close()
            with lock:outcomes.append(result)
        threads=[threading.Thread(target=worker,args=(i,),daemon=True) for i in range(2)]
        for t in threads:t.start()
        for t in threads:t.join(timeout=15)
        self.assertFalse(any(t.is_alive() for t in threads),'deadlock or timeout')
        self.assertEqual(len(outcomes),2,outcomes)
        self.assertEqual(sorted(x[0] for x in outcomes),['conflict','created'],outcomes)
        self.assertEqual(BCHOutpointReservation.objects.count(),1)
        self.assertEqual(BCHInvoice.objects.filter(status='paid').count(),0)
