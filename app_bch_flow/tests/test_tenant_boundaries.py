"""Cross-account boundaries using distinct identities and organizations."""
import tempfile
import uuid
import json
import os
import subprocess
from pathlib import Path
from unittest import skipUnless
from datetime import timedelta
from unittest.mock import patch
from django.conf import settings
from django.test import Client, TestCase, override_settings
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.urls import reverse
from django.utils import timezone
from app_bch_flow.identity.services import create_organization
from app_bch_flow.identity.sessions import COOKIE_NAME, CONTEXT_COOKIE, create_session, resolve_session
from app_bch_flow.models import BCHInvoice
from app_merchant_catalog.models import SoftwareOrder
from app_merchant_catalog.software_access import GUEST_COOKIE, GRANTS_KEY, recovery_token
from app_merchant_catalog.tests import test_software as fixtures


class TenantBoundaryTests(TestCase):
    login = fixtures.SoftwareTests.login
    url = fixtures.SoftwareTests.url

    def setUp(self):
        media = tempfile.TemporaryDirectory()
        self.addCleanup(media.cleanup)
        local = override_settings(MEDIA_ROOT=media.name, MEDIA_URL='/media/')
        local.enable()
        self.addCleanup(local.disable)
        fixtures.SoftwareTests.setUp(self)
        self.foreign = create_organization(self.other, 'Foreign organization', 'foreign-tenant')

    def guest_order(self):
        guest = Client()
        with patch('app_bch_flow.financial.service.prepare_request'):
            response = guest.post(self.url('software_buy', self.offers['BCH'].pk),
                                  {'operation': uuid.uuid4(), 'email':'guest@isolated.invalid'})
        self.assertEqual(response.status_code, 302)
        return guest, SoftwareOrder.objects.get(guest__isnull=False)

    def test_authenticated_library_does_not_inherit_browser_guest_orders(self):
        browser, order = self.guest_order()
        token, _ = create_session(self.other)
        browser.cookies[COOKIE_NAME] = token
        response = browser.get(self.url('software_purchases'))
        self.assertNotContains(response, order.product_name)
        for name in ('software_order', 'software_status'):
            self.assertEqual(browser.get(self.url(name, order.pk)).status_code, 404)
        self.assertEqual(browser.post(self.url('software_download_link', order.pk)).status_code, 404)

    def test_logout_and_login_clear_guest_capabilities_but_keep_host_session(self):
        browser, order = self.guest_order()
        session = browser.session
        session[GRANTS_KEY] = {str(order.pk): recovery_token(order)}
        session['unrelated_host_setting'] = 'preserved'
        session.save()
        browser.cookies[settings.SESSION_COOKIE_NAME] = session.session_key
        response = browser.post(self.url('logout'))
        self.assertIn(GUEST_COOKIE, response.cookies)
        self.assertEqual(response.cookies[GUEST_COOKIE]['max-age'], 0)
        self.assertNotIn(GRANTS_KEY, browser.session)
        self.assertEqual(browser.session['unrelated_host_setting'], 'preserved')
        self.assertEqual(browser.get(self.url('software_order', order.pk)).status_code, 404)
        # A deliberate private recovery link continues to work as a guest.
        browser.get(self.url('software_recover', recovery_token(order)))
        self.assertEqual(browser.get(self.url('software_order', order.pk)).status_code, 200)
        browser.post(self.url('login'), {'email':self.other.email,'password':'long-software-password-123'})
        self.assertNotIn(GRANTS_KEY, browser.session)
        self.assertEqual(browser.get(self.url('software_order', order.pk)).status_code, 404)

    def test_guest_recovery_grants_do_not_cross_into_an_authenticated_account(self):
        browser, order = self.guest_order()
        session = browser.session
        session[GRANTS_KEY] = {str(order.pk): recovery_token(order)}
        session.save()
        browser.cookies[settings.SESSION_COOKIE_NAME] = session.session_key
        browser.cookies.pop(GUEST_COOKIE)
        token, _ = create_session(self.other)
        browser.cookies[COOKIE_NAME] = token
        self.assertEqual(browser.get(self.url('software_order', order.pk)).status_code, 404)
        self.assertNotContains(browser.get(self.url('software_purchases')), order.product_name)

    def test_valid_login_post_switches_account_and_revokes_previous_session(self):
        old = self.client.cookies[COOKIE_NAME].value
        response = self.client.post(self.url('login'), {
            'email':self.other.email,'password':'long-software-password-123',
        })
        self.assertEqual(response.status_code,302)
        self.assertIsNone(resolve_session(old))
        self.assertEqual(resolve_session(response.cookies[COOKIE_NAME].value).identity_id,self.other.pk)
        self.assertIn(CONTEXT_COOKIE,response.cookies)

    def test_invalid_login_does_not_silently_redirect_as_a_different_account(self):
        old = self.client.cookies[COOKIE_NAME].value
        response = self.client.post(self.url('login'), {
            'email':self.other.email,'password':'incorrect-password-123',
        })
        self.assertEqual(response.status_code,200)
        self.assertNotIn(COOKIE_NAME,response.cookies)
        self.assertEqual(resolve_session(old).identity_id,self.buyer.pk)

    def test_duplicate_registration_preserves_current_identity_without_server_error(self):
        old=self.client.cookies[COOKIE_NAME].value
        response=self.client.post(self.url('register'), {
            'email':self.other.email,'password':'new-password-attempt-123',
            'password_confirm':'new-password-attempt-123',
        })
        self.assertEqual(response.status_code,200)
        self.assertNotIn(COOKIE_NAME,response.cookies)
        self.assertEqual(resolve_session(old).identity_id,self.buyer.pk)

    def test_registration_revokes_old_session_and_clears_guest_access(self):
        browser, order = self.guest_order()
        previous, _ = create_session(self.buyer)
        browser.cookies[COOKIE_NAME] = previous
        response = browser.post(self.url('register'), {
            'email':'new-tenant@isolated.invalid', 'password':'new-tenant-password-123',
            'password_confirm':'new-tenant-password-123',
        })
        self.assertEqual(response.status_code,302)
        self.assertIsNone(resolve_session(previous))
        self.assertEqual(response.cookies[GUEST_COOKIE]['max-age'],0)
        self.assertIn(CONTEXT_COOKIE,response.cookies)
        self.assertNotEqual(response.cookies[CONTEXT_COOKIE].value,response.cookies[COOKIE_NAME].value)
        self.assertNotContains(browser.get(self.url('software_purchases')),order.product_name)

    def test_logout_handles_malformed_cookie_without_leaking_guest_access(self):
        self.client.cookies[COOKIE_NAME] = 'invalid-é-ascii'
        response = self.client.post(self.url('logout'))
        self.assertEqual(response.status_code,302)
        self.assertIn(CONTEXT_COOKIE,response.cookies)

    def test_private_bch_responses_cannot_be_shared_cached(self):
        for name, args in [('dashboard', []), ('v3_workspace', [self.org.pk]), ('merchant_catalog', [self.org.pk])]:
            self.login(self.seller)
            response = self.client.get(self.url(name, *args))
            self.assertEqual(response.status_code, 200)
            self.assertIn('no-store', response.get('Cache-Control', ''))
            self.assertIn('private', response.get('Cache-Control', ''))
            self.assertIn('Cookie', response.get('Vary', ''))

    def test_cross_organization_pages_and_api_are_denied(self):
        self.login(self.seller)
        self.assertEqual(self.client.get(self.url('v3_workspace', self.org.pk)).status_code, 200)
        routes = [
            'v3_workspace', 'v3_invoice_new', 'wallet_v41_home', 'wallet_v41_send',
            'wallet_v42_diagnostic', 'wallet_v43_monitor', 'chipnet_v4_workspace',
            'chipnet_observe_v1', 'financial_home', 'merchant_integrations',
            'merchant_catalog', 'merchant_catalog_products', 'software_sales',
            'bchflow-v3-invoices',
        ]
        for name in routes:
            with self.subTest(route=name):
                self.assertEqual(self.client.get(self.url(name, self.foreign.pk)).status_code, 404)
        for panel in ('receive','send','activity','addresses','blockchain','monitor'):
            with self.subTest(panel=panel):
                self.assertEqual(self.client.get(self.url('wallet_v320_modal', self.foreign.pk, panel)).status_code, 404)

    def test_revoked_membership_is_rejected_without_reusing_old_access(self):
        self.login(self.seller)
        url = self.url('merchant_catalog_products',self.org.pk)
        self.assertEqual(self.client.get(url).status_code,200)
        self.seller.memberships.filter(organization=self.org).update(is_active=False)
        for name in ('v3_workspace','financial_home','merchant_integrations','merchant_catalog_products'):
            with self.subTest(route=name):
                self.assertEqual(self.client.get(self.url(name,self.org.pk)).status_code,404)

    def test_invoice_api_only_returns_the_authorized_organization(self):
        self.login(self.seller)
        for organization in (self.org,self.foreign):
            BCHInvoice.objects.create(organization=organization,amount_satoshis=1000,
                receiving_cashaddr='fixture-address',network='chipnet',status='created',
                expires_at=timezone.now()+timedelta(minutes=30))
        response=self.client.get(self.url('bchflow-v3-invoices',self.org.pk))
        self.assertEqual(response.status_code,200)
        expected=set(str(pk) for pk in BCHInvoice.objects.filter(organization=self.org).values_list('pk',flat=True))
        self.assertEqual({item['id'] for item in response.json()['items']},expected)

    def test_resource_id_cannot_override_authorized_organization(self):
        self.login(self.seller)
        invoice = BCHInvoice.objects.create(organization=self.foreign, amount_satoshis=1000,
            receiving_cashaddr='fixture-address', network='chipnet', status='created',
            expires_at=timezone.now()+timedelta(minutes=30))
        for name in ('v3_invoice','wallet_v24_evidence','pay_v1_share','merchant_payment_simulation_v3'):
            with self.subTest(route=name):
                self.assertEqual(self.client.get(self.url(name, self.org.pk, invoice.pk)).status_code, 404)
        response = self.client.post(self.url('merchant_catalog_update',self.foreign.pk,self.product.pk),{})
        self.assertEqual(response.status_code, 404)

    def test_signed_in_purchase_ids_are_not_transferable(self):
        order = fixtures.SoftwareTests.buy(self)
        self.login(self.other)
        self.assertNotContains(self.client.get(self.url('software_purchases')), order.product_name)
        for name in ('software_order','software_status'):
            self.assertEqual(self.client.get(self.url(name, order.pk)).status_code, 404)
        for name in ('software_retry','software_download_link'):
            self.assertEqual(self.client.post(self.url(name, order.pk)).status_code, 404)


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS') == '1', 'Enable Chromium checks with FLOW_BROWSER_TESTS=1.')
@override_settings(DEBUG=True, MEDIA_URL='/media/')
class TenantBoundaryBrowserTests(StaticLiveServerTestCase):
    setUp = TenantBoundaryTests.setUp
    login = TenantBoundaryTests.login
    url = TenantBoundaryTests.url
    guest_order = TenantBoundaryTests.guest_order

    def test_shared_browser_account_switch_and_stale_tab_revalidation(self):
        guest, guest_order = self.guest_order()
        buyer_order = fixtures.SoftwareTests.buy(self)
        data = {
            'base':self.live_server_url, 'library':self.url('software_purchases'),
            'guestCookie':GUEST_COOKIE, 'guestToken':guest.cookies[GUEST_COOKIE].value,
            'guestOrder':self.url('software_order', guest_order.pk),
            'buyerOrder':self.url('software_order', buyer_order.pk),
            'guestStatus':self.url('software_status', guest_order.pk),
            'login':self.url('login'), 'logout':self.url('logout'),
            'buyer':self.buyer.email, 'other':self.other.email,
        }
        result = subprocess.run(['node',str(Path(__file__).with_name('tenant-boundaries.cjs'))],
            env={**os.environ,'BCH_TENANT_TEST':json.dumps(data)},capture_output=True,text=True,timeout=60)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout.strip())
