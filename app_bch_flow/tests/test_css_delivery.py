"""Folhas que definem o layout devem chegar antes da primeira pintura da página."""

from types import SimpleNamespace
import uuid

from bs4 import BeautifulSoup
from django import forms
from django.template.loader import render_to_string
from django.test import SimpleTestCase, RequestFactory
from django.contrib.auth.models import AnonymousUser


class StylesheetDeliveryTests(SimpleTestCase):
    def context(self):
        identifier = uuid.uuid4()
        organization = SimpleNamespace(pk=identifier, name="CSS fixture")
        request = RequestFactory().get("/bch-flow/")
        request.user = AnonymousUser()
        return {
            "request": request,
            "member": SimpleNamespace(
                organization_id=identifier,
                organization=organization,
                identity_id=identifier,
            ),
            "invoice": SimpleNamespace(pk=identifier, organization=organization),
            "form": forms.Form(),
            "asset": "BCH",
            "environment": "live",
            "can_approve": True,
            "is_demo": False,
        }

    def test_page_layout_styles_are_in_head_including_wallet_widget(self):
        pages = [
            "landing/index.html",
            "authentication/login.html",
            "dashboard/new_organization.html",
            "dashboard/v3_invoice_form.html",
            "financial/home.html",
            "financial/integrations.html",
            "checkout/pay_v1.html",
            "wallet_v41/home.html",
            "wallet_v41/chipnet_v4.html",
            "wallet_v41/evidence_v24.html",
            "wallet_v42/diagnostic.html",
            "wallet_v43/monitor.html",
        ]
        for name in pages:
            with self.subTest(page=name):
                html = render_to_string("app_bch_flow/" + name, self.context())
                document = BeautifulSoup(html, "html.parser")
                sheets = document.select('link[rel="stylesheet"]')
                self.assertTrue(sheets)
                self.assertTrue(all(link.find_parent("head") for link in sheets))
                urls = [link["href"] for link in sheets]
                self.assertEqual(len(urls), len(set(urls)))

    def test_wallet_loads_widget_css_only_when_widget_is_rendered(self):
        for can_approve in [False, True]:
            with self.subTest(can_approve=can_approve):
                context = {**self.context(), "can_approve": can_approve}
                document = BeautifulSoup(
                    render_to_string("app_bch_flow/financial/home.html", context),
                    "html.parser",
                )
                sheets = [
                    link["href"].split("/")[-1]
                    for link in document.select('head link[rel="stylesheet"]')
                ]
                self.assertEqual(
                    "wizardconnect.css" in sheets,
                    bool(document.select("[data-wizardconnect]")),
                )
                self.assertLess(
                    sheets.index("flow-polish.css"), sheets.index("payment-center.css")
                )
                self.assertLess(
                    sheets.index("payment-center.css"),
                    sheets.index("payment-center-premium.css"),
                )
