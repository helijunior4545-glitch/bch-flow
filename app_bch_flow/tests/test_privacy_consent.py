"""Independent public policy and privacy preferences, without host-app storage."""
import json
import os
from pathlib import Path
import subprocess
from unittest import skipUnless
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test import TestCase, override_settings
from django.urls import reverse, include, path

urlpatterns = [path('portable/', include('app_bch_flow.urls')), path('i18n/', include('django.conf.urls.i18n'))]


@override_settings(LANGUAGE_CODE='en')
class PublicPolicyTests(TestCase):
    def test_public_documents_and_component(self):
        for document in ('privacy', 'cookies', 'terms'):
            response = self.client.get(reverse('bch_flow:policy', args=[document]))
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, 'data-bch-consent ')
            self.assertContains(response, 'app_bch_flow/js/consent.js')
            self.assertNotContains(response, 'registrar_consentimento_site')
        self.assertEqual(self.client.get(reverse('bch_flow:policy', args=['unknown'])).status_code, 404)

    @override_settings(ROOT_URLCONF=__name__)
    def test_policy_links_and_storage_scope_follow_mount_path(self):
        response = self.client.get(reverse('bch_flow:policy', args=['cookies']))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-scope="/portable/"')
        self.assertContains(response, '/portable/policies/privacy/')

    def test_separate_checkout_includes_privacy_assets_and_component(self):
        from django.template.loader import render_to_string
        from types import SimpleNamespace
        from django.test import RequestFactory
        charge = SimpleNamespace(account=SimpleNamespace(asset='BCH', organization=SimpleNamespace(name='Fixture')), status='pending')
        html = render_to_string('app_bch_flow/financial/checkout.html', {'token':'privacy-fixture','charge':charge}, request=RequestFactory().get('/bch-flow/checkout/fixture/'))
        self.assertEqual(html.count('data-bch-consent '), 1)
        self.assertIn('app_bch_flow/css/consent.css', html)
        self.assertIn('app_bch_flow/js/consent.js', html)

    def test_component_on_software_and_login(self):
        for name in ('software_store', 'software_purchases', 'login', 'home'):
            response = self.client.get(reverse('bch_flow:' + name))
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, 'data-bch-consent ', count=1)


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS') == '1', 'Enable Chromium with FLOW_BROWSER_TESTS=1.')
@override_settings(DEBUG=True, LANGUAGE_CODE='en')
class PrivacyBrowserTests(StaticLiveServerTestCase):
    def test_preferences(self):
        from django.conf import settings
        data = {'languageCookie':settings.LANGUAGE_COOKIE_NAME, 'base':self.live_server_url, 'path':reverse('bch_flow:software_store'),
                'privacy':reverse('bch_flow:policy', args=['privacy'])}
        result = subprocess.run(['node', str(Path(__file__).with_name('privacy-consent.cjs'))],
            env={**os.environ, 'PRIVACY_TEST_INPUT':json.dumps(data)},capture_output=True,text=True,timeout=100)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout.strip())
