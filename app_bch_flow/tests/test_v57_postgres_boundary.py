"""V5.7: PostgreSQL integration at the real reservation boundary.

These tests DO NOT prove production entrypoint wiring, BCH consensus,
real process-crash recovery, or commercial settlement readiness.
"""
import uuid
from datetime import timedelta
from django.db import connections, transaction
from django.test import TransactionTestCase
from django.utils import timezone
from app_bch_flow.models import BCHOrganization, BCHInvoice, BCHFinancialEvent
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation
from app_bch_flow.blockchain.v43_outpoint_reservation import reserve_outpoint, ReservationConflict
from app_bch_flow.payments.state_machine import transition

TXID = "d" * 64

class V57PostgresFinancialBoundary(TransactionTestCase):
    databases = {"default"}

    def setUp(self):
        super().setUp()
        self.assertEqual(connections["default"].vendor, "postgresql",
                         "V5.7 requires real PostgreSQL, never SQLite")
        self.orgs, self.invoices, self.events = [], [], []
        for i in range(2):
            org = BCHOrganization.objects.using("default").create(
                name="V57 test " + str(i), slug="v57-" + str(uuid.uuid4()))
            invoice = BCHInvoice.objects.using("default").create(
                organization=org, amount_satoshis=1000,
                receiving_cashaddr="bitcoincash:qfixture",
                network="mainnet",
                expires_at=timezone.now() + timedelta(hours=1))
            event = BCHFinancialEvent.objects.using("default").create(
                organization=org, invoice=invoice,
                event_type="bch.v42.attribution_pre_review",
                metadata={"network": "mainnet", "txid": TXID,
                          "decision": "manual_review_only",
                          "review_required": True,
                          "assessment_digest": "c" * 64,
                          "outpoints": [{"txid": TXID, "vout": 0}]})
            self.orgs.append(org)
            self.invoices.append(invoice)
            self.events.append(event)

    def claim(self, index, *, txid=TXID, write=True):
        return reserve_outpoint(
            self.invoices[index].pk, self.events[index].pk,
            txid, 0, write=write)

    def assert_unsettled(self):
        for invoice in self.invoices:
            invoice.refresh_from_db(using="default")
            self.assertNotIn(invoice.status, ("paid", "confirmed"))
        self.assertEqual(
            BCHFinancialEvent.objects.using("default").filter(
                event_type="bch.v42.attribution_pre_review").count(), 2)

    def test_01_reservation_does_not_confirm_invoice(self):
        self.assertTrue(self.claim(0).created)
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 1)
        self.assert_unsettled()

    def test_02_competing_invoice_rejected_without_payment(self):
        self.claim(0)
        with self.assertRaises(ReservationConflict):
            self.claim(1)
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 1)
        self.assert_unsettled()

    def test_03_bad_txid_rejected_without_financial_mutation(self):
        with self.assertRaises(ReservationConflict):
            self.claim(0, txid="e" * 64)
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 0)
        self.assert_unsettled()

    def test_04_rollback_restores_ability_to_claim(self):
        with self.assertRaisesRegex(RuntimeError, "injected"):
            with transaction.atomic(using="default"):
                self.claim(0)
                raise RuntimeError("injected")
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 0)
        self.assertTrue(self.claim(1).created)
        self.assert_unsettled()

    def test_05_repeated_claim_does_not_duplicate_reservation(self):
        first = self.claim(0)
        second = self.claim(0)
        self.assertTrue(first.created)
        self.assertFalse(second.created)
        self.assertEqual(first.reservation_id, second.reservation_id)
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 1)
        self.assert_unsettled()

    def test_06_dry_run_followed_by_real_claim(self):
        preview = self.claim(0, write=False)
        self.assertFalse(preview.created)
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 0)
        self.assertTrue(self.claim(0).created)
        self.assert_unsettled()

    def test_07_state_transition_does_not_mutate_database(self):
        with self.assertRaises(ValueError):
            transition("created", "confirmed")
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 0)
        self.assert_unsettled()

    def test_08_second_invoice_still_unpaid_after_conflict_and_retry(self):
        self.claim(0)
        for _ in range(3):
            with self.assertRaises(ReservationConflict):
                self.claim(1)
        self.assertEqual(BCHOutpointReservation.objects.using("default").count(), 1)
        self.assert_unsettled()
