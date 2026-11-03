"""No blockchain transfer, wallet, or settlement."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization,BCHInvoice,BCHFinancialEvent,BCHPayment
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation
from app_bch_flow.blockchain.v43_outpoint_reservation import reserve_outpoint,ReservationConflict
TX='a'*64
ADDR='bitcoincash:qzrjshsrha097j5j8v8xxc0lchujc7jtpu3chu7ftd'
class V43Tests(TestCase):
    databases={'default'}
    def setUp(self):
        self.org=BCHOrganization.objects.create(name='V43 simulated',slug='v43-simulated')
        self.inv=BCHInvoice.objects.create(organization=self.org,amount_satoshis=10000,
            receiving_cashaddr=ADDR,network='mainnet',expires_at=timezone.now()+timedelta(days=1))
        self.ev=BCHFinancialEvent.objects.create(organization=self.org,invoice=self.inv,
            event_type='bch.v42.attribution_pre_review',previous_status='created',next_status='created',
            metadata={'network':'mainnet','txid':TX,'decision':'manual_review_only',
                      'review_required':True,'assessment_digest':'b'*64,
                      'outpoints':[{'txid':TX,'vout':0}]})
    def test_dry_run(self):
        self.assertFalse(reserve_outpoint(self.inv.pk,self.ev.pk,TX,0).created)
        self.assertEqual(BCHOutpointReservation.objects.count(),0)
    def test_write_idempotent(self):
        a=reserve_outpoint(self.inv.pk,self.ev.pk,TX,0,write=True)
        b=reserve_outpoint(self.inv.pk,self.ev.pk,TX,0,write=True)
        self.assertTrue(a.created);self.assertFalse(b.created)
        self.assertEqual(a.reservation_id,b.reservation_id)
        self.assertEqual(BCHOutpointReservation.objects.count(),1)
    def test_second_invoice_conflicts(self):
        inv2=BCHInvoice.objects.create(organization=self.org,amount_satoshis=10000,
            receiving_cashaddr=ADDR,network='mainnet',expires_at=timezone.now()+timedelta(days=1))
        ev2=BCHFinancialEvent.objects.create(organization=self.org,invoice=inv2,
            event_type=self.ev.event_type,previous_status='created',next_status='created',metadata=self.ev.metadata)
        reserve_outpoint(self.inv.pk,self.ev.pk,TX,0,write=True)
        with self.assertRaises(ReservationConflict):reserve_outpoint(inv2.pk,ev2.pk,TX,0,write=True)
    def test_outpoint_not_in_evidence(self):
        with self.assertRaises(ReservationConflict):reserve_outpoint(self.inv.pk,self.ev.pk,TX,1,write=True)
    def test_bad_txid(self):
        with self.assertRaises(ReservationConflict):reserve_outpoint(self.inv.pk,self.ev.pk,'bad',0,write=True)
    def test_unapproved_evidence(self):
        self.ev.metadata={**self.ev.metadata,'decision':'blocked'};self.ev.save(update_fields=['metadata'])
        with self.assertRaises(ReservationConflict):reserve_outpoint(self.inv.pk,self.ev.pk,TX,0,write=True)
    def test_never_settles(self):
        reserve_outpoint(self.inv.pk,self.ev.pk,TX,0,write=True)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.status,'created');self.assertIsNone(self.inv.paid_at)
        self.assertEqual(BCHPayment.objects.count(),0)
