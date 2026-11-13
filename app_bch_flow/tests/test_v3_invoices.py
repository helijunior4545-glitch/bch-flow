"""V3 watch-only invoice regression. Uses Django's isolated test database."""
from django.test import TestCase
from django.urls import reverse
from app_bch_flow.identity.services import register_identity,create_organization
from app_bch_flow.identity.sessions import create_session,COOKIE_NAME
from app_bch_flow.models import BCHInvoice

class V3InvoiceTests(TestCase):
    databases = {'default'}
    def setUp(self):
        self.owner = register_identity('invoice-owner@test.invalid','very-long-password-123')
        self.other = register_identity('invoice-other@test.invalid','very-long-password-123')
        self.org = create_organization(self.owner,'Invoices','invoices-org')
        self.token,_ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = self.token
    def test_workspace_owner(self):
        self.assertEqual(self.client.get(reverse('bch_flow:v3_workspace',args=[self.org.pk])).status_code,200)
    def test_workspace_other_denied(self):
        token,_=create_session(self.other)
        self.client.cookies[COOKIE_NAME]=token
        self.assertEqual(self.client.get(reverse('bch_flow:v3_workspace',args=[self.org.pk])).status_code,404)
    def test_invoice_invalid_address_denied(self):
        url=reverse('bch_flow:v3_invoice_new',args=[self.org.pk])
        result=self.client.post(url,{'network':'mainnet','address':'not-an-address','amount_bch':'1','description':'bad'})
        self.assertEqual(result.status_code,200)
        self.assertEqual(BCHInvoice.objects.count(),0)
    def test_invoice_zero_amount_denied(self):
        url=reverse('bch_flow:v3_invoice_new',args=[self.org.pk])
        result=self.client.post(url,{'network':'chipnet','address':'invalid','amount_bch':'0'})
        self.assertEqual(result.status_code,200)
        self.assertEqual(BCHInvoice.objects.count(),0)
    def test_unauthenticated_redirect(self):
        self.client.cookies.clear()
        self.assertEqual(self.client.get(reverse('bch_flow:v3_workspace',args=[self.org.pk])).status_code,302)
