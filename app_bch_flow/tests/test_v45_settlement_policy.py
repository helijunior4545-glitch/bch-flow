"""Simulated evidence only. No wallets, transfers, paid states or real chain claims."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization, BCHInvoice, BCHFinancialEvent, BCHPayment
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation
from app_bch_flow.blockchain.v45_settlement_policy import evaluate_settlement_policy

TX = 'a'*64
ADDR = 'bitcoincash:qzrjshsrha097j5j8v8hxc0lchujc7ptpu3chu7ftd'

class V45PolicyTests(TestCase):
    databases = {'default'}

    def setUp(self):
        self.org = BCHOrganization.objects.create(name='V45 simulation', slug='v45-simulation')
        self.inv = BCHInvoice.objects.create(organization=self.org, amount_satoshis=10000,
            receiving_cashaddr=ADDR, network='mainnet', expires_at=timezone.now()+timedelta(days=1))
        self.obs = BCHFinancialEvent.objects.create(organization=self.org, invoice=self.inv,
            event_type='bch.v35.observation', metadata={'source':'external_unverified', 'evidence_digest':'a'*64})
        self.ev = BCHFinancialEvent.objects.create(organization=self.org, invoice=self.inv,
            event_type='bch.v42.attribution_pre_review', metadata={
                'network':'mainnet', 'txid':TX, 'decision':'manual_review_only',
                'review_required':True, 'source':'external_unverified',
                'assessment_digest':'b'*64, 'observation_id':str(self.obs.pk),
                'observation_digest':'a'*64, 'observed_satoshis':10000,
                'confirmed_satoshis':10000, 'outpoints':[{'txid':TX,'vout':0}]})

    def reserve(self):
        return BCHOutpointReservation.objects.create(organization=self.org, invoice=self.inv,
            evidence_event=self.ev, network='mainnet', txid=TX, output_index=0)

    def assess(self):
        return evaluate_settlement_policy(self.inv.pk, self.ev.pk)

    def test_missing_reservation_blocks(self):
        result = self.assess()
        self.assertEqual(result.decision, 'blocked')
        self.assertIn('outpoints_not_exclusively_reserved', result.reasons)

    def test_reserved_is_only_manual_review_ready(self):
        self.reserve()
        result = self.assess()
        self.assertEqual(result.decision, 'manual_review_ready')
        self.assertFalse(result.settlement_authorized)
        self.assertIn('receiving_address_ownership_unproven', result.reasons)

    def test_never_creates_payment_or_changes_invoice(self):
        self.reserve()
        self.assess()
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.status, 'created')
        self.assertIsNone(self.inv.paid_at)
        self.assertEqual(BCHPayment.objects.count(), 0)
        self.assertEqual(BCHFinancialEvent.objects.count(), 2)

    def test_wrong_invoice_evidence_blocked(self):
        other = BCHInvoice.objects.create(organization=self.org, amount_satoshis=10000,
            receiving_cashaddr=ADDR+'x', network='mainnet', expires_at=timezone.now()+timedelta(days=1))
        result = evaluate_settlement_policy(other.pk, self.ev.pk)
        self.assertEqual(result.decision, 'blocked')
        self.assertIn('missing_matching_assessment', result.reasons)

    def test_expired_invoice_blocks(self):
        self.reserve()
        self.inv.expires_at = timezone.now()-timedelta(seconds=1)
        self.inv.save(update_fields=['expires_at'])
        self.assertIn('invoice_expired', self.assess().reasons)

    def test_amount_mismatch_blocks(self):
        self.reserve()
        m = dict(self.ev.metadata, confirmed_satoshis=9999)
        self.ev.metadata=m; self.ev.save(update_fields=['metadata'])
        self.assertIn('amount_not_exactly_matched', self.assess().reasons)

    def test_reused_address_blocks(self):
        self.reserve()
        BCHInvoice.objects.create(organization=self.org, amount_satoshis=10000,
            receiving_cashaddr=ADDR, network='mainnet', expires_at=timezone.now()+timedelta(days=1))
        self.assertIn('receiving_address_reused', self.assess().reasons)

    def test_bad_observation_link_blocks(self):
        self.reserve()
        m = dict(self.ev.metadata, observation_digest='c'*64)
        self.ev.metadata=m; self.ev.save(update_fields=['metadata'])
        self.assertIn('observation_link_not_verified', self.assess().reasons)

    def test_no_reservation_mutations(self):
        self.reserve()
        before = BCHOutpointReservation.objects.count()
        self.assess(); self.assess()
        self.assertEqual(BCHOutpointReservation.objects.count(), before)
