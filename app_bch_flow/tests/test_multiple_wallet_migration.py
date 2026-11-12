"""Upgrade populated single-wallet records without reassigning financial history."""

from datetime import timedelta
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone


class WalletMigrationTests(TransactionTestCase):
    def tearDown(self):
        # Leave later identity migrations applied for the rest of the suite.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_existing_account_addresses_and_journal_are_preserved(self):
        old = [("app_bch_flow", "0009_node_connections")]
        new = [("app_bch_flow", "0010_multiple_wallets")]
        executor = MigrationExecutor(connection)
        executor.migrate(old)
        apps = executor.loader.project_state(old).apps
        try:
            Org = apps.get_model("app_bch_flow", "BCHOrganization")
            Identity = apps.get_model("app_bch_flow", "BCHIdentity")
            Account = apps.get_model("app_bch_flow", "FlowAccount")
            Wallet = apps.get_model("app_bch_flow", "FlowNodeConnection")
            Address = apps.get_model("app_bch_flow", "FlowDerivedAddress")
            Request = apps.get_model("app_bch_flow", "FlowRequest")
            Journal = apps.get_model("app_bch_flow", "FlowJournal")
            org = Org.objects.create(name="Migration fixture", slug="migration-fixture")
            actor = Identity.objects.create(
                email="migration@test.invalid", password_hash="test-only"
            )
            account = Account.objects.create(
                organization=org,
                asset="BCH",
                environment="live",
                available_units=1000,
                sync_cursor="a" * 64,
            )
            wallet = Wallet.objects.create(
                organization=org,
                asset="BCH",
                environment="live",
                public_key="fixture-public-key",
                wallet_fingerprint="b" * 64,
                api_ciphertext="fixture-ciphertext",
                confirmations=3,
                verified_at=timezone.now(),
                next_receive=1,
            )
            address = Address.objects.create(
                connection=wallet,
                branch=0,
                index=0,
                address="fixture-migration-address",
            )
            charge = Request.objects.create(
                account=account,
                created_by=actor,
                amount_units=1000,
                received_units=1000,
                address=address.address,
                status="paid",
                idempotency_key="migration-request-01",
                payload_hash="c" * 64,
                expires_at=timezone.now() + timedelta(minutes=30),
            )
            journal = Journal.objects.create(
                account=account,
                key="migration-credit-01",
                debit="available",
                credit="external",
                amount_units=1000,
                reference=charge.pk,
            )
            ids = (account.pk, wallet.pk, charge.pk, journal.pk, address.pk)
        finally:
            executor = MigrationExecutor(connection)
            executor.migrate(new)
        apps = executor.loader.project_state(new).apps
        Account = apps.get_model("app_bch_flow", "FlowAccount")
        account = Account.objects.get(pk=ids[0])
        self.assertEqual(account.wallet_id, ids[1])
        self.assertEqual(account.available_units, 1000)
        self.assertEqual(account.sync_cursor, "a" * 64)
        self.assertEqual(
            apps.get_model("app_bch_flow", "FlowRequest")
            .objects.get(pk=ids[2])
            .account_id,
            account.pk,
        )
        self.assertEqual(
            apps.get_model("app_bch_flow", "FlowJournal")
            .objects.get(pk=ids[3])
            .account_id,
            account.pk,
        )
        self.assertEqual(
            apps.get_model("app_bch_flow", "FlowDerivedAddress")
            .objects.get(pk=ids[4])
            .connection_id,
            ids[1],
        )
