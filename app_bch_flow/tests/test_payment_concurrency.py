from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import close_old_connections
from django.test import TransactionTestCase, override_settings
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.models import FlowJournal, FlowWithdrawal
from app_bch_flow.financial import service
from app_bch_flow.financial.amounts import PaymentError


@override_settings(FLOW_PAYMENTS_SANDBOX_ENABLED=True)
class ConcurrentPaymentsTests(TransactionTestCase):
    def setUp(self):
        self.owner = register_identity(
            "concurrency@test.invalid", "very-long-password-123"
        )
        self.org = create_organization(self.owner, "Concurrent", "concurrent-core")
        self.account = service.ensure_account(self.owner, self.org.pk, "BTC", "sandbox")
        self.charge = service.prepare_request(
            service.create_request(
                self.owner, self.account, 1000, "", "parallel-request-01"
            )
        )

    def parallel(self, operation):
        barrier = Barrier(2)

        def task(index):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return operation(index)
            except PaymentError:
                return "rejected"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(task, range(2)))

    def test_concurrent_replayed_receipt_credits_once(self):
        self.parallel(
            lambda _: (
                service.simulate_receipt(
                    self.owner, self.charge, 1000, "parallel-receipt-01"
                ).status
            )
        )
        self.account.refresh_from_db()
        self.assertEqual(self.account.available_units, 1000)
        self.assertEqual(FlowJournal.objects.count(), 1)

    def test_competing_withdrawals_cannot_overspend(self):
        service.simulate_receipt(self.owner, self.charge, 1000, "parallel-funding-01")
        result = self.parallel(
            lambda index: str(
                service.create_withdrawal(
                    self.owner,
                    self.account,
                    "sandbox:dest",
                    800,
                    0,
                    f"parallel-withdraw-{index}",
                ).pk
            )
        )
        self.assertEqual(result.count("rejected"), 1)
        self.account.refresh_from_db()
        self.assertEqual(
            (self.account.available_units, self.account.reserved_units), (200, 800)
        )
        self.assertEqual(FlowWithdrawal.objects.count(), 1)
