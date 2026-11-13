from decimal import Decimal
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import translation
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import FlowAccount
from app_bch_flow.financial.amounts import (
    units,
    display,
    PaymentError,
    ProviderUnavailable,
)
from app_bch_flow.financial import service


@override_settings(FLOW_PAYMENTS_SANDBOX_ENABLED=True)
class InternationalWalletTests(TestCase):
    def setUp(self):
        self.actor = register_identity(
            "international@test.invalid", "international-password-123"
        )
        self.org = create_organization(
            self.actor, "International", "international-wallet"
        )
        token, _unused = create_session(self.actor)
        self.client.cookies[COOKIE_NAME] = token
        self.url = reverse("bch_flow:financial_home", args=[self.org.pk])

    def test_english_is_default_even_when_browser_requests_portuguese(self):
        response = self.client.get(self.url, HTTP_ACCEPT_LANGUAGE="pt-BR,pt;q=0.9")
        self.assertContains(response, 'lang="en"')
        self.assertContains(response, "One wallet.")
        self.assertNotContains(response, "Uma carteira.")

    def test_explicit_languages_and_rtl_are_applied(self):
        for code, text in [
            ("pt-br", "Uma carteira."),
            ("es", "Una cartera."),
            ("fr", "Un portefeuille."),
            ("de", "Eine Wallet."),
            ("zh-hans", "一个钱包。"),
            ("ja", "ひとつのウォレット。"),
            ("ar", "محفظة واحدة."),
            ("hi", "एक वॉलेट।"),
        ]:
            self.client.cookies["bchflow_language"] = code
            response = self.client.get(self.url)
            self.assertContains(response, text)
            self.assertContains(response, 'dir="rtl"' if code == "ar" else 'dir="ltr"')
        self.client.cookies["bchflow_language"] = "not-supported"
        self.assertContains(self.client.get(self.url), 'lang="en"')

    def test_language_change_is_persistent_and_cannot_redirect_offsite(self):
        response = self.client.post(
            reverse("set_language"), {"language": "fr", "next": self.url}
        )
        self.assertEqual(response.cookies["bchflow_language"].value, "fr")
        self.assertTrue(response.cookies["bchflow_language"]["httponly"])
        self.assertContains(self.client.get(self.url), "Un portefeuille.")
        response = self.client.post(
            reverse("set_language"),
            {"language": "en", "next": "https://untrusted.example/"},
        )
        self.assertNotIn("untrusted.example", response["Location"])

    def test_usd_and_eur_use_cents_and_independent_balances(self):
        for asset in ("USD", "EUR"):
            self.assertEqual(
                self.client.get(
                    self.url + "?asset=" + asset + "&environment=live"
                ).status_code,
                404,
            )
            account = service.ensure_account(self.actor, self.org.pk, asset, "sandbox")
            charge = service.prepare_request(
                service.create_request(
                    self.actor,
                    account,
                    units("12.50", asset),
                    "",
                    "international-request-" + asset,
                )
            )
            service.simulate_receipt(
                self.actor, charge, 1250, "international-receipt-" + asset
            )
            withdrawal = service.create_withdrawal(
                self.actor,
                account,
                "sandbox:external",
                500,
                0,
                "international-withdraw-" + asset,
            )
            service.approve_withdrawal(
                self.actor, withdrawal, "international-password-123"
            )
            service.submit_withdrawal(self.actor, withdrawal)
            account.refresh_from_db()
            self.assertEqual(display(account.available_units, asset), "7.50")
            with self.assertRaises(PaymentError):
                units("1.001", asset)
            with self.assertRaises(ProviderUnavailable):
                service.ensure_account(self.actor, self.org.pk, asset, "live")
            with self.assertRaises(IntegrityError), transaction.atomic():
                FlowAccount.objects.create(
                    organization=self.org, asset=asset, environment="live"
                )
        self.assertEqual(FlowAccount.objects.get(asset="USD").available_units, 750)
        self.assertEqual(FlowAccount.objects.get(asset="EUR").available_units, 750)

    def test_language_does_not_change_financial_precision(self):
        for code in ("en", "pt-br", "fr", "ar", "hi"):
            with translation.override(code):
                self.assertEqual(units("12.50", "USD"), 1250)
                self.assertEqual(display(1250, "EUR"), "12.50")
                self.assertEqual(units(Decimal("0.00000001"), "BTC"), 1)
