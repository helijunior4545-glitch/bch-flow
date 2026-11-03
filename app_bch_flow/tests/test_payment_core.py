"""Real PostgreSQL orchestration tests. Provider payloads are explicit fixtures."""

import hashlib
import json
import hmac
import time
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import (
    BCHMembership,
    FlowAccount,
    FlowRequest,
    FlowReceipt,
    FlowJournal,
    FlowWithdrawal,
    FlowInbox,
)
from app_bch_flow.financial import service
from app_bch_flow.financial.amounts import (
    units,
    display,
    PaymentError,
    ProviderUnavailable,
)
from app_bch_flow.financial.providers import (
    MercadoPago,
    CoreNode,
    validate_mp_signature,
)
from app_bch_flow.financial.views import checkout_url
from app_bch_flow.financial.worker import process_inbox


@override_settings(FLOW_PAYMENTS_SANDBOX_ENABLED=True)
class PaymentFixture(TestCase):
    def setUp(self):
        self.owner = register_identity(
            "payments-owner@test.invalid", "very-long-password-123"
        )
        self.other = register_identity(
            "payments-other@test.invalid", "another-long-password-123"
        )
        self.org = create_organization(self.owner, "Payments", "payments-core")
        self.foreign = create_organization(self.other, "Other", "payments-foreign")
        self.account = service.ensure_account(self.owner, self.org.pk, "BCH", "sandbox")
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token

    def request(self, amount=1000, key="request-key-000001", account=None):
        charge = service.create_request(
            self.owner, account or self.account, amount, "Serviço", key
        )
        return service.prepare_request(charge)

    def fund(self, amount=1000):
        charge = self.request(amount)
        service.simulate_receipt(self.owner, charge, amount, "receipt-key-000001")
        self.account.refresh_from_db()
        return charge

    def withdrawal(self, amount=400, fee=50, key="withdraw-key-0001"):
        return service.create_withdrawal(
            self.owner, self.account, "sandbox:destination", amount, fee, key
        )


class PaymentCoreTests(PaymentFixture):
    def test_exact_amounts_and_bad_inputs(self):
        self.assertEqual(units("0.00000001", "BTC"), 1)
        self.assertEqual(units("12.34", "BRL"), 1234)
        self.assertEqual(display(1, "BCH"), "0.00000001")
        for value in ["NaN", "Infinity", "-1", "0", "0.000000001", "1e100"]:
            with self.assertRaises(PaymentError):
                units(value, "BCH")
        with self.assertRaises(PaymentError):
            units("0.001", "BRL")

    def test_full_receive_authorize_send_cycle_balances_and_replay(self):
        charge = self.fund()
        service.simulate_receipt(self.owner, charge, 1000, "receipt-key-000001")
        withdrawal = self.withdrawal()
        self.account.refresh_from_db()
        self.assertEqual(
            (self.account.available_units, self.account.reserved_units), (550, 450)
        )
        service.approve_withdrawal(self.owner, withdrawal, "very-long-password-123")
        service.submit_withdrawal(self.owner, withdrawal)
        service.submit_withdrawal(self.owner, withdrawal)
        self.account.refresh_from_db()
        self.assertEqual(
            (self.account.available_units, self.account.reserved_units), (600, 0)
        )
        self.assertEqual(FlowReceipt.objects.count(), 1)
        self.assertEqual(FlowJournal.objects.count(), 4)
        call_command("flow_payments_audit", verbosity=0)

    def test_partial_overpayment_and_idempotency_conflict(self):
        charge = self.request()
        service.simulate_receipt(self.owner, charge, 400, "receipt-part-0001")
        charge.refresh_from_db()
        self.assertEqual(charge.status, "partial")
        service.simulate_receipt(self.owner, charge, 700, "receipt-part-0002")
        charge.refresh_from_db()
        self.assertEqual((charge.status, charge.received_units), ("overpaid", 1100))
        with self.assertRaises(PaymentError):
            service.simulate_receipt(self.owner, charge, 500, "receipt-part-0001")

    def test_request_idempotency_rejects_payload_changes(self):
        first = self.request()
        self.assertEqual(self.request().pk, first.pk)
        with self.assertRaises(PaymentError):
            self.request(2000)

    def test_expired_receipt_is_reviewed_without_spendable_credit(self):
        charge = self.request()
        FlowRequest.objects.filter(pk=charge.pk).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        receipt = service.simulate_receipt(
            self.owner, charge, 1000, "receipt-late-0001"
        )
        self.account.refresh_from_db()
        self.assertEqual(receipt.status, "review")
        self.assertEqual(self.account.available_units, 0)
        self.assertEqual(FlowJournal.objects.count(), 0)

    def test_no_overspend_or_reservation_on_failure(self):
        self.fund()
        with self.assertRaises(PaymentError):
            self.withdrawal(1100)
        self.account.refresh_from_db()
        self.assertEqual(
            (self.account.available_units, self.account.reserved_units), (1000, 0)
        )
        self.assertFalse(FlowWithdrawal.objects.exists())

    def test_cancellation_releases_once(self):
        self.fund()
        withdrawal = self.withdrawal()
        service.cancel_withdrawal(self.owner, withdrawal)
        service.cancel_withdrawal(self.owner, withdrawal)
        self.account.refresh_from_db()
        self.assertEqual(
            (self.account.available_units, self.account.reserved_units), (1000, 0)
        )

    def test_approval_password_role_and_expiry(self):
        self.fund()
        withdrawal = self.withdrawal()
        with self.assertRaises(PaymentError):
            service.approve_withdrawal(self.owner, withdrawal, "wrong-password")
        BCHMembership.objects.filter(identity=self.owner, organization=self.org).update(
            role="operator"
        )
        with self.assertRaises(PaymentError):
            service.approve_withdrawal(self.owner, withdrawal, "very-long-password-123")
        BCHMembership.objects.filter(identity=self.owner, organization=self.org).update(
            role="owner"
        )
        service.approve_withdrawal(self.owner, withdrawal, "very-long-password-123")
        FlowWithdrawal.objects.filter(pk=withdrawal.pk).update(
            approved_until=timezone.now() - timedelta(seconds=1)
        )
        with self.assertRaises(PaymentError):
            service.submit_withdrawal(self.owner, withdrawal)

    def test_cross_tenant_operations_and_pages_denied(self):
        with self.assertRaises(PaymentError):
            service.create_request(
                self.other, self.account, 1000, "", "foreign-key-0001"
            )
        charge = self.request()
        token, _ = create_session(self.other)
        self.client.cookies[COOKIE_NAME] = token
        self.assertEqual(
            self.client.get(
                reverse("bch_flow:financial_request", args=[self.org.pk, charge.pk])
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(
                reverse("bch_flow:financial_home", args=[self.org.pk])
            ).status_code,
            404,
        )

    def test_public_checkout_is_signed_expiring_read_only_and_explicitly_simulated(
        self,
    ):
        charge = self.request()
        path = checkout_url(charge)
        self.client.cookies.clear()
        response = self.client.get(path)
        self.assertContains(response, "do not send real money")
        self.assertNotContains(response, self.owner.email)
        self.assertEqual(response["Referrer-Policy"], "no-referrer")
        self.assertEqual(self.client.post(path).status_code, 405)
        self.assertEqual(self.client.get(path + "tampered").status_code, 404)
        qr_url = reverse(
            "bch_flow:financial_qr", args=[path.rstrip("/").split("/")[-1]]
        )
        qr = self.client.get(qr_url)
        self.assertEqual(qr.status_code, 200)
        self.assertIn("image/svg+xml", qr["Content-Type"])
        self.assertEqual(self.account.available_units, 0)

    def test_viewer_cannot_simulate_or_request_money(self):
        charge = self.request()
        BCHMembership.objects.filter(identity=self.owner, organization=self.org).update(
            role="viewer"
        )
        response = self.client.post(
            reverse("bch_flow:financial_request", args=[self.org.pk, charge.pk]),
            {"action": "simulate", "amount": "0.1", "key": "viewer-key-000001"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(FlowReceipt.objects.exists())

    def test_database_journal_and_authorized_intent_immutable(self):
        self.fund()
        withdrawal = self.withdrawal()
        with self.assertRaises(IntegrityError), transaction.atomic():
            FlowJournal.objects.update(amount_units=1)
        with self.assertRaises(IntegrityError), transaction.atomic():
            FlowWithdrawal.objects.filter(pk=withdrawal.pk).update(
                destination="sandbox:attacker"
            )

    @override_settings(FLOW_PAYMENTS_ALLOW_LIVE=False)
    def test_live_mode_cannot_be_enabled_by_request_parameter(self):
        with self.assertRaises(ProviderUnavailable):
            service.ensure_account(self.owner, self.org.pk, "BTC", "live")
        self.assertFalse(FlowAccount.objects.filter(environment="live").exists())

    def test_simulation_cannot_credit_connected_account(self):
        connected = FlowAccount.objects.create(
            organization=self.org, asset="BTC", environment="testnet"
        )
        charge = service.create_request(
            self.owner, connected, 1000, "", "connected-key-001"
        )
        with self.assertRaises(PaymentError):
            service.simulate_receipt(self.owner, charge, 1000, "simulation-key-001")

    def test_reorg_freezes_account_without_duplicate_credit(self):
        charge = self.fund()
        receipt = FlowReceipt.objects.get(request=charge)
        with transaction.atomic():
            account = service._locked(self.account.pk)
            service._receipt(account, charge, receipt.source_key, 1000, -1, 1)
        self.account.refresh_from_db()
        self.assertTrue(self.account.frozen)
        self.assertEqual(self.account.available_units, 1000)
        with self.assertRaises(PaymentError):
            self.withdrawal()


@override_settings(FLOW_PAYMENTS_SANDBOX_ENABLED=True)
class MercadoPagoTests(PaymentFixture):
    def mp_config(self):
        return {
            str(self.org.pk): {
                "BRL": {
                    "mercadopago_test": {
                        "access_token_env": "TEST_MP_ACCESS",
                        "webhook_secret_env": "TEST_MP_HMAC",
                        "collector_id": "123",
                    }
                }
            }
        }

    def mp_charge(self):
        account = FlowAccount.objects.create(
            organization=self.org, asset="BRL", environment="mercadopago_test"
        )
        return service.create_request(
            self.owner, account, 1250, "Pix", "pix-request-0001", "payer@test.invalid"
        )

    def payment(self, charge, **changes):
        data = {
            "id": 987,
            "collector_id": 123,
            "live_mode": False,
            "currency_id": "BRL",
            "payment_method_id": "pix",
            "external_reference": str(charge.pk),
            "transaction_amount": Decimal("12.50"),
            "status": "approved",
            "date_approved": timezone.now().isoformat(),
            "transaction_amount_refunded": 0,
            "point_of_interaction": {
                "transaction_data": {"qr_code": "fixture-pix-copy-code"}
            },
        }
        data.update(changes)
        return data

    @patch.dict(
        "os.environ",
        {"TEST_MP_ACCESS": "mock-access-only", "TEST_MP_HMAC": "mock-secret-only"},
    )
    def test_pix_create_verify_webhook_and_duplicate_delivery(self):
        charge = self.mp_charge()
        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=self.mp_config()),
            patch.object(MercadoPago, "call", return_value=self.payment(charge)),
        ):
            charge = service.prepare_request(charge)
            ts, rid = str(int(time.time())), "fixture-request"
            signature = hmac.new(
                b"mock-secret-only",
                f"id:987;request-id:{rid};ts:{ts};".encode(),
                hashlib.sha256,
            ).hexdigest()
            url = (
                reverse(
                    "bch_flow:financial_mp_webhook",
                    args=[self.org.pk, "mercadopago_test"],
                )
                + "?data.id=987"
            )
            for _ in range(2):
                result = self.client.post(
                    url,
                    data="{}",
                    content_type="application/json",
                    HTTP_X_SIGNATURE=f"ts={ts},v1={signature}",
                    HTTP_X_REQUEST_ID=rid,
                )
                self.assertEqual(result.status_code, 200)
                self.assertEqual(process_inbox()[0], 1)
        charge.account.refresh_from_db()
        self.assertEqual(charge.account.available_units, 1250)
        self.assertEqual(FlowReceipt.objects.filter(request=charge).count(), 1)
        self.assertEqual(FlowInbox.objects.count(), 1)

    @patch.dict("os.environ", {"TEST_MP_ACCESS": "mock-access-only"})
    def test_pix_wrong_receiver_environment_amount_and_reference_rejected(self):
        charge = self.mp_charge()
        with self.settings(FLOW_PAYMENT_PROVIDERS=self.mp_config()):
            provider = MercadoPago(charge.account)
            for changes in (
                {"collector_id": 999},
                {"live_mode": True},
                {"transaction_amount": Decimal("12.51")},
                {"currency_id": "USD"},
                {"external_reference": "other-tenant"},
                {"status": "pending"},
            ):
                with self.assertRaises(PaymentError):
                    provider.validate(self.payment(charge, **changes), charge)
        self.assertFalse(FlowReceipt.objects.exists())

    def test_bad_and_stale_signature_rejected(self):
        for signature in ("", "ts=1,v1=" + "0" * 64, "ts=invalid,v1=" + "0" * 64):
            with self.assertRaises(PaymentError):
                validate_mp_signature(signature, "request", "987", "fixture-secret")
        self.assertFalse(FlowInbox.objects.exists())

    @patch.dict("os.environ", {"TEST_MP_ACCESS": "mock-access-only"})
    def test_checkout_api_does_not_imply_pix_payout_permission(self):
        charge = self.mp_charge()
        with self.settings(FLOW_PAYMENT_PROVIDERS=self.mp_config()):
            with self.assertRaises(ProviderUnavailable):
                service.create_withdrawal(
                    self.owner, charge.account, "pix-key", 100, 0, "pix-withdraw-001"
                )
        self.assertFalse(FlowWithdrawal.objects.exists())


class CoreNodeTests(PaymentFixture):
    def setUp(self):
        super().setUp()
        self.node_account = FlowAccount.objects.create(
            organization=self.org, asset="BTC", environment="testnet"
        )
        self.charge = service.create_request(
            self.owner, self.node_account, 10000, "Node", "node-request-0001"
        )
        FlowRequest.objects.filter(pk=self.charge.pk).update(
            address="bcrt1qmerchantfixture"
        )
        self.charge.refresh_from_db()
        self.txid = "a" * 64

    def config(self):
        return {
            str(self.org.pk): {
                "BTC": {
                    "testnet": {
                        "url": "http://127.0.0.1:18443/wallet/isolated",
                        "username_env": "FIXTURE_RPC_USER",
                        "password_env": "FIXTURE_RPC_PASSWORD",
                        "chain": "regtest",
                        "confirmations": 2,
                    }
                }
            }
        }

    def response(self, method, *params):
        return {
            "getblockchaininfo": {"chain": "regtest", "initialblockdownload": False},
            "getwalletinfo": {"private_keys_enabled": False},
            "gettransaction": {"hex": "00", "confirmations": 2},
            "decoderawtransaction": {
                "txid": self.txid,
                "vout": [
                    {
                        "n": 0,
                        "value": Decimal("0.00010000"),
                        "scriptPubKey": {"address": self.charge.address},
                    }
                ],
            },
        }[method]

    @patch.dict(
        "os.environ",
        {
            "FIXTURE_RPC_USER": "fixture-user",
            "FIXTURE_RPC_PASSWORD": "fixture-password",
        },
    )
    def test_node_verifies_outputs_before_credit_and_replay_is_safe(self):
        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=self.config()),
            patch.object(CoreNode, "rpc", side_effect=self.response),
        ):
            service.reconcile_request(self.charge, self.txid)
            service.reconcile_request(self.charge, self.txid)
        self.node_account.refresh_from_db()
        self.assertEqual(self.node_account.available_units, 10000)
        self.assertEqual(FlowReceipt.objects.count(), 1)

    @patch.dict(
        "os.environ",
        {
            "FIXTURE_RPC_USER": "fixture-user",
            "FIXTURE_RPC_PASSWORD": "fixture-password",
        },
    )
    def test_wrong_address_and_unsynced_or_key_holding_node_rejected(self):
        def bad(method, *args):
            value = self.response(method, *args)
            if method == "getwalletinfo":
                return {"private_keys_enabled": True}
            return value

        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=self.config()),
            patch.object(CoreNode, "rpc", side_effect=bad),
        ):
            with self.assertRaises(ProviderUnavailable):
                service.reconcile_request(self.charge, self.txid)
        self.assertFalse(FlowReceipt.objects.exists())

    @patch.dict(
        "os.environ",
        {
            "FIXTURE_RPC_USER": "fixture-user",
            "FIXTURE_RPC_PASSWORD": "fixture-password",
        },
    )
    def test_missing_confirmations_do_not_credit(self):
        def pending(method, *args):
            if method == "gettransaction":
                return {"hex": "00", "confirmations": 1}
            return self.response(method, *args)

        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=self.config()),
            patch.object(CoreNode, "rpc", side_effect=pending),
        ):
            service.reconcile_request(self.charge, self.txid)
        self.node_account.refresh_from_db()
        self.assertEqual(self.node_account.available_units, 0)
        self.assertEqual(FlowReceipt.objects.get().status, "observed")

    def test_broadcast_timeout_keeps_reservation_and_recovers_by_expected_txid(self):
        with transaction.atomic():
            service._receipt(
                service._locked(self.node_account.pk),
                self.charge,
                "BTC:testnet:" + self.txid + ":0",
                10000,
                2,
                2,
            )
        with patch("app_bch_flow.financial.service.CoreNode") as adapter:
            node = adapter.return_value
            node.validate_address.return_value = "bcrt1qexternalfixture"
            withdrawal = service.create_withdrawal(
                self.owner,
                self.node_account,
                "bcrt1qexternalfixture",
                4000,
                500,
                "node-withdraw-001",
            )
            service.approve_withdrawal(self.owner, withdrawal, "very-long-password-123")
            expected = "b" * 64
            node.inspect_signed.return_value = (
                expected,
                100,
                [{"txid": self.txid, "vout": 0}],
            )
            node.rpc.side_effect = ProviderUnavailable("timeout fixture")
            with self.assertRaises(ProviderUnavailable):
                service.submit_withdrawal(self.owner, withdrawal, "00")
            withdrawal.refresh_from_db()
            self.node_account.refresh_from_db()
            self.assertEqual(withdrawal.status, "unknown")
            self.assertEqual(
                (self.node_account.available_units, self.node_account.reserved_units),
                (5500, 4500),
            )
            with self.assertRaises(PaymentError):
                service.cancel_withdrawal(self.owner, withdrawal)
            node.rpc.side_effect = lambda method, *args: (
                {"hex": "00", "confirmations": 0}
                if method == "gettransaction"
                else {"txid": expected}
            )
            service.recover_withdrawal(self.owner, withdrawal)
        withdrawal.refresh_from_db()
        self.node_account.refresh_from_db()
        self.assertEqual(withdrawal.status, "submitted")
        self.assertEqual(
            (self.node_account.available_units, self.node_account.reserved_units),
            (5900, 0),
        )
        call_command("flow_payments_audit", verbosity=0)

    @patch.dict(
        "os.environ",
        {
            "FIXTURE_RPC_USER": "fixture-user",
            "FIXTURE_RPC_PASSWORD": "fixture-password",
        },
    )
    def test_signed_transaction_cannot_redirect_change_or_raise_fee(self):
        with transaction.atomic():
            service._receipt(
                service._locked(self.node_account.pk),
                self.charge,
                "BTC:testnet:" + self.txid + ":0",
                10000,
                2,
                2,
            )
        withdrawal = FlowWithdrawal(
            account=self.node_account,
            destination="bcrt1qexternalfixture",
            amount_units=4000,
            fee_limit_units=500,
        )

        def response(method, *args):
            if method == "decoderawtransaction":
                return {
                    "txid": "b" * 64,
                    "vin": [{"txid": self.txid, "vout": 0}],
                    "vout": [
                        {
                            "value": Decimal("0.00004000"),
                            "scriptPubKey": {"address": "bcrt1qexternalfixture"},
                        },
                        {
                            "value": Decimal("0.00005900"),
                            "scriptPubKey": {"address": "bcrt1qattackerfixture"},
                        },
                    ],
                }
            if method == "listunspent":
                return [
                    {
                        "txid": self.txid,
                        "vout": 0,
                        "amount": Decimal("0.00010000"),
                        "address": self.charge.address,
                    }
                ]
            return self.response(method, *args)

        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=self.config()),
            patch.object(CoreNode, "rpc", side_effect=response),
        ):
            with self.assertRaises(PaymentError):
                CoreNode(self.node_account).inspect_signed(withdrawal, "00")


class AdditionalFinancialSafetyTests(PaymentFixture):
    def test_reauthentication_is_rate_limited_across_accounts(self):
        self.fund()
        withdrawal = self.withdrawal()
        for _ in range(5):
            with self.assertRaises(PaymentError):
                service.approve_withdrawal(self.owner, withdrawal, "incorrect")
        with self.assertRaises(PaymentError):
            service.approve_withdrawal(self.owner, withdrawal, "very-long-password-123")
        withdrawal.refresh_from_db()
        self.assertEqual(withdrawal.status, "pending")

    def test_audit_freezes_a_corrupted_snapshot_without_rewriting_journal(self):
        from django.core.management.base import CommandError

        self.fund()
        FlowAccount.objects.filter(pk=self.account.pk).update(available_units=999)
        with self.assertRaises(CommandError):
            call_command("flow_payments_audit", verbosity=0)
        self.account.refresh_from_db()
        self.assertTrue(self.account.frozen)
        self.assertEqual(FlowJournal.objects.get().amount_units, 1000)


class NodeSigningPackageTests(CoreNodeTests):
    @patch.dict(
        "os.environ",
        {
            "FIXTURE_RPC_USER": "fixture-user",
            "FIXTURE_RPC_PASSWORD": "fixture-password",
        },
    )
    def test_unsigned_package_reserves_inputs_and_cancel_releases_them(self):
        with transaction.atomic():
            service._receipt(
                service._locked(self.node_account.pk),
                self.charge,
                "BTC:testnet:" + self.txid + ":0",
                10000,
                2,
                2,
            )

        def response(method, *params):
            if method == "validateaddress":
                return {"isvalid": True, "address": params[0]}
            if method == "listunspent":
                return [
                    {
                        "txid": self.txid,
                        "vout": 0,
                        "amount": Decimal("0.00010000"),
                        "address": self.charge.address,
                    }
                ]
            if method == "createrawtransaction":
                self.assertEqual(
                    params[1],
                    {
                        "bcrt1qexternalfixture": "0.00004000",
                        self.charge.address: "0.00005500",
                    },
                )
                return "00"
            return self.response(method, *params)

        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=self.config()),
            patch.object(CoreNode, "rpc", side_effect=response),
        ):
            withdrawal = service.create_withdrawal(
                self.owner,
                self.node_account,
                "bcrt1qexternalfixture",
                4000,
                500,
                "package-request-01",
            )
            prepared = service.prepare_signing(self.owner, withdrawal)
            self.assertEqual(prepared.signing_payload["unsigned_transaction"], "00")
            self.assertEqual(withdrawal.inputs.count(), 1)
            url = reverse(
                "bch_flow:financial_signing_package", args=[self.org.pk, withdrawal.pk]
            )
            self.assertEqual(
                self.client.get(url).json()["outputs"]["bcrt1qexternalfixture"],
                "0.00004000",
            )
            service.cancel_withdrawal(self.owner, withdrawal)
            self.assertEqual(withdrawal.inputs.count(), 0)
            self.assertEqual(self.client.get(url).status_code, 404)

    @patch.dict(
        "os.environ",
        {
            "FIXTURE_RPC_USER": "fixture-user",
            "FIXTURE_RPC_PASSWORD": "fixture-password",
        },
    )
    def test_actual_signed_transaction_validation_accepts_only_allowed_change_and_fee(
        self,
    ):
        with transaction.atomic():
            service._receipt(
                service._locked(self.node_account.pk),
                self.charge,
                "BTC:testnet:" + self.txid + ":0",
                10000,
                2,
                2,
            )
        withdrawal = FlowWithdrawal(
            account=self.node_account,
            destination="bcrt1qexternalfixture",
            amount_units=4000,
            fee_limit_units=500,
        )

        def response(method, *params):
            if method == "listunspent":
                return [
                    {
                        "txid": self.txid,
                        "vout": 0,
                        "amount": Decimal("0.00010000"),
                        "address": self.charge.address,
                    }
                ]
            if method == "decoderawtransaction":
                return {
                    "txid": "b" * 64,
                    "vin": [{"txid": self.txid, "vout": 0}],
                    "vout": [
                        {
                            "value": Decimal("0.00004000"),
                            "scriptPubKey": {"address": withdrawal.destination},
                        },
                        {
                            "value": Decimal("0.00005800"),
                            "scriptPubKey": {"address": self.charge.address},
                        },
                    ],
                }
            if method == "testmempoolaccept":
                return [{"allowed": True}]
            return self.response(method, *params)

        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=self.config()),
            patch.object(CoreNode, "rpc", side_effect=response),
        ):
            txid, fee, inputs = CoreNode(self.node_account).inspect_signed(
                withdrawal, "00"
            )
            self.assertEqual((txid, fee), ("b" * 64, 200))
            self.assertEqual(inputs, [{"txid": self.txid, "vout": 0}])


class ProviderEncodingTests(PaymentFixture):
    @patch.dict("os.environ", {"ENCODING_MP_TOKEN": "mock-access-only"})
    def test_pix_cents_are_numeric_and_description_is_never_replaced(self):
        account = FlowAccount.objects.create(
            organization=self.org, asset="BRL", environment="mercadopago_test"
        )
        config = {
            str(self.org.pk): {
                "BRL": {
                    "mercadopago_test": {
                        "access_token_env": "ENCODING_MP_TOKEN",
                        "collector_id": "123",
                    }
                }
            }
        }
        payload = {
            "transaction_amount": "12.50",
            "description": "__exact_amount__",
            "payment_method_id": "pix",
        }
        with (
            self.settings(FLOW_PAYMENT_PROVIDERS=config),
            patch(
                "app_bch_flow.financial.providers._read_json", return_value={}
            ) as transport,
        ):
            MercadoPago(account).call(
                "/v1/payments", payload, key="stable-operation-key"
            )
            body = json.loads(transport.call_args.args[0].data, parse_float=Decimal)
            self.assertEqual(body["transaction_amount"], Decimal("12.50"))
            self.assertEqual(body["description"], "__exact_amount__")
            self.assertEqual(payload["transaction_amount"], "12.50")

    @patch.dict("os.environ", {"ENCODING_MP_TOKEN": "mock-access-only"})
    def test_provider_receiver_cannot_be_shared_between_tenants(self):
        account = FlowAccount.objects.create(
            organization=self.org, asset="BRL", environment="mercadopago_test"
        )
        entry = {
            "BRL": {
                "mercadopago_test": {
                    "access_token_env": "ENCODING_MP_TOKEN",
                    "collector_id": "123",
                }
            }
        }
        with self.settings(
            FLOW_PAYMENT_PROVIDERS={
                str(self.org.pk): entry,
                str(self.foreign.pk): entry,
            }
        ):
            with self.assertRaises(ProviderUnavailable):
                MercadoPago(account)
