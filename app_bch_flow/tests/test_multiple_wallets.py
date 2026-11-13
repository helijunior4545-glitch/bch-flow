"""Wallet lifecycle and tenant/ledger isolation; all node I/O is controlled."""

from unittest.mock import patch
from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from embit import bip32
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import FlowAccount, FlowNodeConnection, FlowRequest
from app_bch_flow.financial.nodes import (
    connect_nownodes,
    manage_wallet,
    allocate_address,
    blockchain_node,
)
from app_bch_flow.financial import service
from app_bch_flow.financial.amounts import PaymentError


@override_settings(
    DEBUG=False,
    SESSION_COOKIE_SECURE=True,
    CSRF_COOKIE_SECURE=True,
    FLOW_PAYMENTS_ALLOW_LIVE=True,
    FLOW_CREDENTIAL_ENCRYPTION_KEYS=[Fernet.generate_key().decode()],
)
class MultipleWalletTests(TestCase):
    password = "multiple-wallet-tests-12345"

    def setUp(self):
        self.owner = register_identity("wallet-owner@test.invalid", self.password)
        self.org = create_organization(self.owner, "Wallets", "wallet-tests")
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        self.master = bip32.HDKey.from_seed(bytes(range(64)))
        self.ready = patch("app_bch_flow.financial.nownodes.NOWNodes.ready")
        self.ready.start()
        self.addCleanup(self.ready.stop)

    def add_wallet(self, index=0, asset="BCH"):
        path = f"m/44h/145h/{index}h" if asset == "BCH" else f"m/84h/0h/{index}h"
        return connect_nownodes(
            self.owner,
            self.org.pk,
            asset,
            "test-node-api-key",
            self.master.derive(path).to_public().to_base58(),
            3,
            self.password,
            name=f"Wallet {index}",
        )

    def test_two_bch_wallets_have_separate_accounts_addresses_and_provider_credentials(
        self,
    ):
        first, second = self.add_wallet(0), self.add_wallet(1)
        self.assertNotEqual(first.account.pk, second.account.pk)
        self.assertNotEqual(allocate_address(first), allocate_address(second))
        self.assertEqual(
            blockchain_node(first.account).config["connection_id"], first.pk
        )
        self.assertEqual(
            blockchain_node(second.account).config["connection_id"], second.pk
        )
        with self.assertRaisesRegex(PaymentError, "Choose the wallet"):
            service.ensure_account(self.owner, self.org.pk, "BCH", "live")
        account = service.ensure_account(
            self.owner, self.org.pk, "BCH", "live", wallet_id=second.pk
        )
        charge = service.prepare_request(
            service.create_request(
                self.owner, account, 5000, "Second wallet", "multi-wallet-request-01"
            )
        )
        self.assertEqual(charge.account_id, second.account.pk)
        self.assertTrue(second.addresses.filter(address=charge.address).exists())
        self.assertFalse(first.addresses.filter(address=charge.address).exists())
        self.assertEqual(first.account.available_units, 0)

    def test_delete_unused_wallet_removes_only_its_empty_account(self):
        first, second = self.add_wallet(0), self.add_wallet(1)
        manage_wallet(self.owner, self.org.pk, first.pk, "delete_wallet", self.password)
        self.assertFalse(FlowNodeConnection.objects.filter(pk=first.pk).exists())
        self.assertFalse(FlowAccount.objects.filter(wallet_id=first.pk).exists())
        self.assertTrue(FlowNodeConnection.objects.filter(pk=second.pk).exists())
        from app_bch_flow.models import BCHAuditEvent

        event = BCHAuditEvent.objects.get(
            event_type="flow.wallet.deleted", metadata__wallet_id=str(first.pk)
        )
        self.assertEqual(event.actor_id, self.owner.pk)
        self.assertEqual(event.organization_id, self.org.pk)
        self.assertEqual(event.metadata, {"wallet_id": str(first.pk), "asset": "BCH"})

    def test_generated_address_blocks_deletion_but_allows_archiving_and_restore(self):
        wallet = self.add_wallet()
        address = allocate_address(wallet)
        with self.assertRaisesRegex(PaymentError, "Archive"):
            manage_wallet(
                self.owner, self.org.pk, wallet.pk, "delete_wallet", self.password
            )
        manage_wallet(
            self.owner, self.org.pk, wallet.pk, "archive_wallet", self.password
        )
        wallet.refresh_from_db()
        self.assertIsNotNone(wallet.archived_at)
        self.assertTrue(wallet.addresses.filter(address=address).exists())
        with self.assertRaises(PaymentError):
            allocate_address(wallet)
        with self.assertRaises(PaymentError):
            service.create_request(
                self.owner, wallet.account, 1000, "Blocked", "archived-request-01"
            )
        manage_wallet(
            self.owner, self.org.pk, wallet.pk, "restore_wallet", self.password
        )
        wallet.refresh_from_db()
        self.assertIsNone(wallet.archived_at)
        self.assertNotEqual(allocate_address(wallet), address)

    def test_balance_or_pending_request_blocks_archive_and_delete(self):
        wallet = self.add_wallet()
        account = wallet.account
        FlowAccount.objects.filter(pk=account.pk).update(available_units=100)
        for action in ["archive_wallet", "delete_wallet"]:
            with self.assertRaises(PaymentError):
                manage_wallet(self.owner, self.org.pk, wallet.pk, action, self.password)
        FlowAccount.objects.filter(pk=account.pk).update(available_units=0)
        service.create_request(
            self.owner, account, 5000, "Open", "pending-wallet-request-01"
        )
        with self.assertRaises(PaymentError):
            manage_wallet(
                self.owner, self.org.pk, wallet.pk, "archive_wallet", self.password
            )
        wallet.refresh_from_db()
        self.assertIsNone(wallet.archived_at)

    def test_reauthentication_and_tenant_isolation(self):
        wallet = self.add_wallet()
        with self.assertRaises(PaymentError):
            manage_wallet(
                self.owner,
                self.org.pk,
                wallet.pk,
                "delete_wallet",
                "incorrect-password",
            )
        other = register_identity("other-wallet-owner@test.invalid", self.password)
        foreign = create_organization(other, "Other", "other-wallet-tests")
        with self.assertRaises(PaymentError):
            manage_wallet(other, foreign.pk, wallet.pk, "delete_wallet", self.password)
        url = (
            reverse("bch_flow:financial_home", args=[foreign.pk])
            + f"?asset=BCH&environment=live&wallet={wallet.pk}"
        )
        token, _ = create_session(other)
        self.client.cookies[COOKIE_NAME] = token
        self.assertEqual(self.client.get(url, secure=True).status_code, 404)
        self.assertTrue(FlowNodeConnection.objects.filter(pk=wallet.pk).exists())

    def test_cards_and_selection_show_only_selected_account(self):
        first, second = self.add_wallet(0), self.add_wallet(1)
        FlowAccount.objects.filter(pk=first.account.pk).update(available_units=11000)
        FlowAccount.objects.filter(pk=second.account.pk).update(available_units=22000)
        url = (
            reverse("bch_flow:financial_home", args=[self.org.pk])
            + f"?asset=BCH&environment=live&wallet={second.pk}"
        )
        response = self.client.get(url, secure=True)
        self.assertEqual(response.context["account"].pk, second.account.pk)
        self.assertEqual(response.context["available"], "0.00022000")
        self.assertContains(response, "Wallet 0")
        self.assertContains(response, "Wallet 1")
        response = self.client.get(
            reverse("bch_flow:merchant_integrations", args=[self.org.pk]), secure=True
        )
        self.assertEqual(response.content.count(b'class="pay-wallet-card '), 2)
        self.assertContains(response, "Delete unused wallet")

    def test_receipt_scanning_remains_possible_for_archived_wallet(self):
        wallet = self.add_wallet()
        account = wallet.account
        charge = service.prepare_request(
            service.create_request(
                self.owner, account, 1000, "Expired", "archived-observation-01"
            )
        )
        FlowRequest.objects.filter(pk=charge.pk).update(
            status="expired", expires_at=timezone.now()
        )
        manage_wallet(
            self.owner, self.org.pk, wallet.pk, "archive_wallet", self.password
        )
        with patch("app_bch_flow.financial.service.blockchain_node") as factory:
            node = factory.return_value
            node.confirmations = 3
            node.outputs.return_value = (
                3,
                [
                    {
                        "n": 0,
                        "value": "0.00001000",
                        "scriptPubKey": {"address": charge.address},
                    }
                ],
            )
            node.output_address.side_effect = lambda output: output["scriptPubKey"][
                "address"
            ]
            service.reconcile_request(charge, "a" * 64)
        self.assertEqual(charge.receipts.count(), 1)
        account.refresh_from_db()
        self.assertEqual(account.available_units, 0)

    def test_archived_wallet_can_be_viewed_but_cannot_accept_new_posts(self):
        wallet = self.add_wallet()
        manage_wallet(
            self.owner, self.org.pk, wallet.pk, "archive_wallet", self.password
        )
        url = (
            reverse("bch_flow:financial_home", args=[self.org.pk])
            + f"?asset=BCH&environment=live&wallet={wallet.pk}"
        )
        response = self.client.get(url, secure=True)
        self.assertContains(response, "Archived wallet")
        response = self.client.post(
            url,
            {
                "action": "request",
                "receive-amount": "0.00001000",
                "receive-description": "Blocked",
                "receive-key": "archived-form-request-01",
            },
            secure=True,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(wallet.account.requests.count(), 0)

    def test_post_delete_and_restore_require_admin_role_and_csrf(self):
        wallet = self.add_wallet()
        from app_bch_flow.models import BCHMembership

        BCHMembership.objects.filter(identity=self.owner, organization=self.org).update(
            role="operator"
        )
        response = self.client.post(
            reverse("bch_flow:merchant_integrations", args=[self.org.pk]),
            {"action": "delete_wallet", "wallet": wallet.pk, "password": self.password},
            secure=True,
        )
        self.assertEqual(response.status_code, 404)
        self.assertTrue(FlowNodeConnection.objects.filter(pk=wallet.pk).exists())

    def test_selected_wallet_cannot_cancel_another_wallets_withdrawal(self):
        first, second = self.add_wallet(0), self.add_wallet(1)
        from app_bch_flow.financial.nodes import derive_address

        FlowAccount.objects.filter(pk=first.account.pk).update(available_units=10000)
        destination = derive_address(second.public_key, "BCH", 0, 9)
        withdrawal = service.create_withdrawal(
            self.owner,
            first.account,
            destination,
            1000,
            100,
            "cross-wallet-withdrawal-01",
        )
        url = (
            reverse("bch_flow:financial_home", args=[self.org.pk])
            + f"?asset=BCH&environment=live&wallet={second.pk}"
        )
        response = self.client.post(
            url, {"action": "cancel", "withdrawal": withdrawal.pk}, secure=True
        )
        self.assertEqual(response.status_code, 404)
        withdrawal.refresh_from_db()
        self.assertEqual(withdrawal.status, "pending")
        self.assertEqual(
            FlowAccount.objects.get(pk=first.account.pk).reserved_units, 1100
        )

    def test_delete_wallet_rejects_missing_csrf(self):
        from django.test import Client

        wallet = self.add_wallet()
        token, _ = create_session(self.owner)
        client = Client(enforce_csrf_checks=True)
        client.cookies[COOKIE_NAME] = token
        response = client.post(
            reverse("bch_flow:merchant_integrations", args=[self.org.pk]),
            {"action": "delete_wallet", "wallet": wallet.pk, "password": self.password},
            secure=True,
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(FlowNodeConnection.objects.filter(pk=wallet.pk).exists())

    def test_new_wallet_never_adopts_an_existing_legacy_balance(self):
        legacy = FlowAccount.objects.create(
            organization=self.org, asset="BCH", environment="live", available_units=5000
        )
        wallet = self.add_wallet()
        legacy.refresh_from_db()
        self.assertIsNone(legacy.wallet_id)
        self.assertEqual(legacy.available_units, 5000)
        self.assertNotEqual(wallet.account.pk, legacy.pk)
        self.assertEqual(wallet.account.available_units, 0)
        url = (
            reverse("bch_flow:financial_home", args=[self.org.pk])
            + "?asset=BCH&environment=live&wallet=legacy"
        )
        response = self.client.get(url, secure=True)
        self.assertEqual(response.context["account"].pk, legacy.pk)
        self.assertEqual(response.context["available"], "0.00005000")
