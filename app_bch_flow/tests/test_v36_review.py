"""PostgreSQL-backed tests of human evidence review, with no payment settlement."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import (BCHIdentity, BCHOrganization, BCHMembership, BCHInvoice,
    BCHFinancialEvent, BCHPayment, BCHTransaction)
from app_bch_flow.blockchain.v36_review import review_observation, ReviewError, REVIEW_TYPE
from app_bch_flow.blockchain.v35_reconciliation import EVENT_TYPE as OBSERVATION_TYPE

class ReviewTests(TestCase):
    databases = {'default'}
    def setUp(self):
        self.org = BCHOrganization.objects.create(name='Review org', slug='review-v36')
        self.invoice = BCHInvoice.objects.create(organization=self.org, amount_satoshis=1000,
            receiving_cashaddr='bitcoincash:qq07example', network='mainnet',
            expires_at=timezone.now()+timedelta(hours=2))
        # Identity required fields are populated via model inspection in the test factory below.
        self.actor = self.make_identity('reviewer-v36@example.test')
        self.membership = BCHMembership.objects.create(identity=self.actor, organization=self.org,
            role='owner', is_active=True)
        self.obs = BCHFinancialEvent.objects.create(organization=self.org, invoice=self.invoice,
            event_type=OBSERVATION_TYPE, previous_status='created', next_status='created',
            metadata={'source':'external_unverified','evidence_digest':'a'*64})
        self.kw = dict(decision='accept_for_investigation', reason='Investigate transaction against independent node')

    def make_identity(self, email):
        from app_bch_flow.identity.services import register_identity
        return register_identity(email=email, password='TestPassword-Strong-2026')

    def test_dry_run_no_write(self):
        result = review_observation(self.invoice.pk, self.obs.pk, self.actor.pk, **self.kw)
        self.assertFalse(result.created)
        self.assertFalse(BCHFinancialEvent.objects.filter(event_type=REVIEW_TYPE).exists())

    def test_explicit_write_idempotent(self):
        a = review_observation(self.invoice.pk, self.obs.pk, self.actor.pk, write=True, **self.kw)
        b = review_observation(self.invoice.pk, self.obs.pk, self.actor.pk, write=True, **self.kw)
        self.assertTrue(a.created)
        self.assertFalse(b.created)
        self.assertEqual(a.event_id, b.event_id)
        self.assertEqual(BCHFinancialEvent.objects.filter(event_type=REVIEW_TYPE).count(), 1)

    def test_never_settles(self):
        review_observation(self.invoice.pk, self.obs.pk, self.actor.pk, write=True, **self.kw)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'created')
        self.assertIsNone(self.invoice.paid_at)
        self.assertEqual(BCHPayment.objects.count(), 0)
        self.assertEqual(BCHTransaction.objects.count(), 0)

    def test_inactive_membership_denied(self):
        self.membership.is_active = False
        self.membership.save(update_fields=['is_active'])
        with self.assertRaises(ReviewError):
            review_observation(self.invoice.pk, self.obs.pk, self.actor.pk, write=True, **self.kw)

    def test_viewer_denied(self):
        self.membership.role = 'viewer'
        self.membership.save(update_fields=['role'])
        with self.assertRaises(ReviewError):
            review_observation(self.invoice.pk, self.obs.pk, self.actor.pk, write=True, **self.kw)

    def test_cross_invoice_observation_denied(self):
        other = BCHInvoice.objects.create(organization=self.org, amount_satoshis=1000,
            receiving_cashaddr='bitcoincash:qq07example', network='mainnet',
            expires_at=timezone.now()+timedelta(hours=2))
        with self.assertRaises(ReviewError):
            review_observation(other.pk, self.obs.pk, self.actor.pk, write=True, **self.kw)

    def test_invalid_source_denied(self):
        self.obs.metadata = {'source':'trusted', 'evidence_digest':'a'*64}
        self.obs.save(update_fields=['metadata'])
        with self.assertRaises(ReviewError):
            review_observation(self.invoice.pk, self.obs.pk, self.actor.pk, write=True, **self.kw)

    def test_short_reason_denied(self):
        with self.assertRaises(ReviewError):
            review_observation(self.invoice.pk, self.obs.pk, self.actor.pk,
                decision='reject_evidence', reason='short', write=True)
