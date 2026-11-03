"""Merchant authorization uses explicit provider fixtures, not real credentials."""

from datetime import timedelta
from urllib.parse import urlsplit, parse_qs
from unittest.mock import patch
from cryptography.fernet import Fernet
from django.test import TestCase, override_settings, Client
from django.urls import reverse
from django.utils import timezone
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import (
    BCHMembership,
    FlowProviderConnection,
    FlowOAuthGrant,
    FlowAccount,
)
from app_bch_flow.financial import integrations, service
from app_bch_flow.financial.providers import provider_config, local_secret
from app_bch_flow.financial.secrets import unseal
from app_bch_flow.financial.amounts import PaymentError, ProviderUnavailable

TOKEN = "TEST-fixture-access-token-only"
WEBHOOK = "fixture-webhook-secret-not-real"
PASSWORD = "merchant-test-password-123"


class MerchantIntegrationsTests(TestCase):
    def setUp(self):
        self.settings_override = override_settings(
            FLOW_CREDENTIAL_ENCRYPTION_KEYS=[Fernet.generate_key().decode()],
            FLOW_CREDENTIAL_KEY_FILE="",
            FLOW_PAYMENTS_SANDBOX_ENABLED=True,
            FLOW_MP_OAUTH={
                "client_id": "456",
                "client_secret_env": "FIXTURE_MP_CLIENT_SECRET",
                "redirect_uri": "https://wallet.example/bch-flow/integrations/mercadopago/callback/",
            },
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.owner = register_identity("merchant-owner@test.invalid", PASSWORD)
        self.other = register_identity("merchant-other@test.invalid", PASSWORD)
        self.org = create_organization(self.owner, "Merchant", "merchant-connection")
        self.foreign = create_organization(self.other, "Foreign", "foreign-connection")
        self.session, _unused = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = self.session
        self.url = reverse("bch_flow:merchant_integrations", args=[self.org.pk])
        self.profile = {"id": 123, "site_id": "MLB"}

    def connect(self):
        with patch.object(integrations, "user_profile", return_value=self.profile):
            return integrations.connect_manual(
                self.owner, self.org.pk, "mercadopago_test", TOKEN, WEBHOOK, PASSWORD
            )

    def test_owner_can_connect_and_secrets_are_never_replayed_in_html(self):
        with patch.object(integrations, "user_profile", return_value=self.profile):
            result = self.client.post(
                self.url,
                {
                    "action": "manual",
                    "manual-environment": "mercadopago_test",
                    "manual-access_token": TOKEN,
                    "manual-webhook_secret": WEBHOOK,
                    "manual-password": PASSWORD,
                },
            )
        self.assertEqual(result.status_code, 302)
        connection = FlowProviderConnection.objects.get()
        self.assertNotIn(TOKEN, connection.access_ciphertext)
        self.assertNotIn(WEBHOOK, connection.webhook_ciphertext)
        self.assertEqual(unseal(connection.access_ciphertext), TOKEN)
        page = self.client.get(self.url)
        self.assertContains(page, "Connected")
        self.assertNotContains(page, TOKEN)
        self.assertNotContains(page, WEBHOOK)
        account = FlowAccount.objects.create(
            organization=self.org, asset="BRL", environment="mercadopago_test"
        )
        self.assertEqual(local_secret(provider_config(account), "access_token"), TOKEN)

    def test_invalid_form_does_not_redisplay_sensitive_values(self):
        result = self.client.post(
            self.url,
            {
                "action": "manual",
                "manual-environment": "mercadopago_test",
                "manual-access_token": TOKEN,
                "manual-webhook_secret": WEBHOOK,
            },
        )
        self.assertNotContains(result, TOKEN)
        self.assertNotContains(result, WEBHOOK)
        self.assertFalse(FlowProviderConnection.objects.exists())

    def test_viewer_and_other_tenant_cannot_manage_connections(self):
        BCHMembership.objects.filter(identity=self.owner, organization=self.org).update(
            role="viewer"
        )
        self.assertEqual(self.client.get(self.url).status_code, 404)
        token, _unused = create_session(self.other)
        self.client.cookies[COOKIE_NAME] = token
        self.assertEqual(self.client.get(self.url).status_code, 404)
        with self.assertRaises(PaymentError):
            integrations.connect_manual(
                self.other, self.org.pk, "mercadopago_test", TOKEN, WEBHOOK, PASSWORD
            )

    def test_receiver_cannot_be_adopted_by_another_organization(self):
        self.connect()
        with patch.object(integrations, "user_profile", return_value=self.profile):
            with self.assertRaises(PaymentError):
                integrations.connect_manual(
                    self.other,
                    self.foreign.pk,
                    "mercadopago_test",
                    TOKEN,
                    WEBHOOK,
                    PASSWORD,
                )
        self.assertEqual(FlowProviderConnection.objects.count(), 1)

    def test_disconnect_erases_tokens_and_does_not_fall_back_to_legacy_config(self):
        connection = self.connect()
        account = FlowAccount.objects.create(
            organization=self.org, asset="BRL", environment="mercadopago_test"
        )
        charge = service.create_request(
            self.owner, account, 1000, "", "request-before-unlink", "payer@test.invalid"
        )
        integrations.disconnect(self.owner, self.org.pk, "mercadopago_test", PASSWORD)
        connection.refresh_from_db()
        charge.refresh_from_db()
        self.assertEqual(connection.status, "disconnected")
        self.assertEqual(connection.access_ciphertext, "")
        self.assertEqual(connection.webhook_ciphertext, "")
        self.assertEqual(charge.status, "review")
        with self.settings(
            FLOW_PAYMENT_PROVIDERS={
                str(self.org.pk): {
                    "BRL": {
                        "mercadopago_test": {
                            "collector_id": "999",
                            "access_token_env": "SHOULD_NOT_BE_USED",
                        }
                    }
                }
            }
        ):
            with self.assertRaises(ProviderUnavailable):
                provider_config(account)

    def test_existing_payments_prevent_changing_the_receiver(self):
        self.connect()
        account = FlowAccount.objects.create(
            organization=self.org, asset="BRL", environment="mercadopago_test"
        )
        service.create_request(
            self.owner,
            account,
            1000,
            "",
            "existing-merchant-request",
            "payer@test.invalid",
        )
        with patch.object(
            integrations, "user_profile", return_value={"id": 999, "site_id": "MLB"}
        ):
            with self.assertRaises(PaymentError):
                integrations.connect_manual(
                    self.owner,
                    self.org.pk,
                    "mercadopago_test",
                    TOKEN,
                    WEBHOOK,
                    PASSWORD,
                )
        self.assertEqual(FlowProviderConnection.objects.get().collector_id, "123")

    def test_missing_encryption_key_never_stores_plaintext(self):
        with self.settings(
            FLOW_CREDENTIAL_ENCRYPTION_KEYS=[], FLOW_CREDENTIAL_KEY_FILE=""
        ):
            with self.assertRaises(ProviderUnavailable):
                self.connect()
        self.assertFalse(FlowProviderConnection.objects.exists())

    def test_invalid_token_does_not_create_a_connection(self):
        with patch.object(
            integrations,
            "user_profile",
            side_effect=ProviderUnavailable("Provider unavailable"),
        ):
            with self.assertRaises(ProviderUnavailable):
                integrations.connect_manual(
                    self.owner,
                    self.org.pk,
                    "mercadopago_test",
                    TOKEN,
                    WEBHOOK,
                    PASSWORD,
                )
        self.assertFalse(FlowProviderConnection.objects.exists())

    @patch.dict("os.environ", {"FIXTURE_MP_CLIENT_SECRET": "fixture-app-secret-only"})
    def test_oauth_pkce_callback_is_bound_to_session_and_single_use(self):
        target = integrations.start_oauth(
            self.owner, self.org.pk, "mercadopago_test", self.session, PASSWORD
        )
        query = parse_qs(urlsplit(target).query)
        state = query["state"][0]
        self.assertEqual(query["code_challenge_method"], ["S256"])
        self.assertNotEqual(FlowOAuthGrant.objects.get().state_digest, state)
        with (
            patch.object(
                integrations,
                "_token",
                return_value={
                    "user_id": 123,
                    "live_mode": False,
                    "access_token": TOKEN,
                    "refresh_token": "fixture-refresh-token",
                    "expires_in": 3600,
                },
            ) as exchange,
            patch.object(integrations, "user_profile", return_value=self.profile),
        ):
            with self.assertRaises(PaymentError):
                integrations.finish_oauth(
                    self.owner, "another-session", state, "fixture-code"
                )
            connection = integrations.finish_oauth(
                self.owner, self.session, state, "fixture-code"
            )
            self.assertEqual(connection.method, "oauth")
            self.assertIn("code_verifier", exchange.call_args.args[0])
            with self.assertRaises(PaymentError):
                integrations.finish_oauth(
                    self.owner, self.session, state, "fixture-code"
                )
            self.assertEqual(exchange.call_count, 1)

    @patch.dict("os.environ", {"FIXTURE_MP_CLIENT_SECRET": "fixture-app-secret-only"})
    def test_oauth_expiry_and_environment_mismatch_rejected(self):
        target = integrations.start_oauth(
            self.owner, self.org.pk, "mercadopago_test", self.session, PASSWORD
        )
        state = parse_qs(urlsplit(target).query)["state"][0]
        FlowOAuthGrant.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        with self.assertRaises(PaymentError):
            integrations.finish_oauth(self.owner, self.session, state, "fixture-code")
        target = integrations.start_oauth(
            self.owner, self.org.pk, "mercadopago_test", self.session, PASSWORD
        )
        state = parse_qs(urlsplit(target).query)["state"][0]
        with patch.object(integrations, "_token", return_value={"live_mode": True}):
            with self.assertRaises(PaymentError):
                integrations.finish_oauth(
                    self.owner, self.session, state, "fixture-code"
                )
        self.assertFalse(FlowProviderConnection.objects.exists())

    @patch.dict("os.environ", {"FIXTURE_MP_CLIENT_SECRET": "fixture-app-secret-only"})
    def test_expiring_oauth_token_refreshes_and_stays_encrypted(self):
        connection = integrations.save_connection(
            self.owner,
            self.org.pk,
            "mercadopago_test",
            TOKEN,
            self.profile,
            method="oauth",
            refresh_token="fixture-old-refresh",
            expires_in=60,
        )
        FlowProviderConnection.objects.filter(pk=connection.pk).update(
            expires_at=timezone.now()
        )
        with patch.object(
            integrations,
            "_token",
            return_value={
                "user_id": 123,
                "live_mode": False,
                "access_token": "TEST-fixture-new-access",
                "refresh_token": "fixture-new-refresh",
                "expires_in": 3600,
            },
        ) as exchange:
            data = integrations.connection_credentials(self.org.pk, "mercadopago_test")
            self.assertEqual(data["access_token"], "TEST-fixture-new-access")
            integrations.connection_credentials(self.org.pk, "mercadopago_test")
            self.assertEqual(exchange.call_count, 1)
        connection.refresh_from_db()
        self.assertNotIn("TEST-fixture-new-access", connection.access_ciphertext)

    def test_csrf_required_for_credential_changes(self):
        client = Client(enforce_csrf_checks=True)
        client.cookies[COOKIE_NAME] = self.session
        self.assertEqual(client.post(self.url, {"action": "manual"}).status_code, 403)

    def test_deactivated_identity_cannot_save_credentials_with_a_stale_actor_object(
        self,
    ):
        from app_bch_flow.models import BCHIdentity

        BCHIdentity.objects.filter(pk=self.owner.pk).update(is_active=False)
        with self.assertRaises(PaymentError):
            integrations.save_connection(
                self.owner, self.org.pk, "mercadopago_test", TOKEN, self.profile
            )
        self.assertFalse(FlowProviderConnection.objects.exists())

    @patch.dict("os.environ", {"FIXTURE_MP_CLIENT_SECRET": "fixture-app-secret-only"})
    def test_callback_does_not_forward_codes_in_referrers_or_language_forms(self):
        target = integrations.start_oauth(
            self.owner, self.org.pk, "mercadopago_test", self.session, PASSWORD
        )
        state = parse_qs(urlsplit(target).query)["state"][0]
        url = reverse("bch_flow:merchant_mp_callback")
        with (
            patch.object(
                integrations,
                "_token",
                return_value={
                    "user_id": 123,
                    "live_mode": False,
                    "access_token": TOKEN,
                    "refresh_token": "fixture-refresh",
                    "expires_in": 3600,
                },
            ),
            patch.object(integrations, "user_profile", return_value=self.profile),
        ):
            response = self.client.get(
                url, {"state": state, "code": "private-fixture-code"}
            )
            self.assertEqual(response.status_code, 302)
            self.assertEqual(response["Referrer-Policy"], "no-referrer")
        response = self.client.get(
            url, {"state": state, "code": "private-fixture-code"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotContains(response, "private-fixture-code", status_code=400)
        self.assertNotContains(response, state, status_code=400)
