"""Organization overview: tenant scoping, translations and mobile interaction."""
import json
import os
from pathlib import Path
import subprocess
from unittest import skipUnless
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test import TestCase, override_settings
from django.urls import reverse
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import BCHMembership


class OverviewFixture:
    def setUp(self):
        self.owner = register_identity('overview@fixture.invalid', 'overview-password-123')
        self.finance = create_organization(self.owner, 'Finance', 'overview-finance')
        self.studio = create_organization(self.owner, 'Estúdio ' + 'Long organization name ' * 6, 'overview-studio')
        self.other = register_identity('other-overview@fixture.invalid', 'overview-password-123')
        self.secret = create_organization(self.other, 'Private other account', 'private-other-account')
        self.token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = self.token
        self.path = reverse('bch_flow:dashboard')


@override_settings(LANGUAGE_CODE='en')
class OverviewTests(OverviewFixture, TestCase):
    def test_only_active_memberships_and_organizations_are_rendered(self):
        response = self.client.get(self.path)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-organization', count=2)
        self.assertContains(response, str(self.finance.pk))
        self.assertNotContains(response, self.secret.name)
        self.assertNotContains(response, str(self.secret.pk))
        self.assertContains(response, 'css/pages/dashboard.css')
        self.assertNotContains(response, 'css/pages/workspace.css')
        self.assertNotContains(response, 'payment-center-premium.css')
        BCHMembership.objects.filter(identity=self.owner, organization=self.finance).update(is_active=False)
        self.studio.is_active = False
        self.studio.save(update_fields=['is_active'])
        response = self.client.get(self.path)
        self.assertNotContains(response, 'data-organization')
        self.assertContains(response, 'Your first space starts here.')

    def test_login_required(self):
        self.client.cookies.clear()
        self.assertRedirects(self.client.get(self.path), reverse('bch_flow:login'), fetch_redirect_response=False)

    def test_portuguese_page_uses_translated_copy_and_role(self):
        from django.conf import settings
        self.client.cookies[settings.LANGUAGE_COOKIE_NAME] = 'pt-br'
        response = self.client.get(self.path)
        self.assertContains(response, 'Suas organizações.')
        self.assertContains(response, 'Proprietário')
        self.assertContains(response, 'Buscar organização')
        self.assertNotContains(response, 'One clear overview.')


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS') == '1', 'Enable Chromium with FLOW_BROWSER_TESTS=1.')
@override_settings(DEBUG=True, LANGUAGE_CODE='en', MEDIA_URL='/media/')
class OverviewBrowserTests(OverviewFixture, StaticLiveServerTestCase):
    def test_mobile_search_navigation_and_no_javascript_fallback(self):
        from django.conf import settings
        data = {'languageCookie':settings.LANGUAGE_COOKIE_NAME, 'base':self.live_server_url, 'path':self.path, 'cookie':COOKIE_NAME, 'token':self.token}
        result = subprocess.run(['node',str(Path(__file__).with_name('dashboard-overview.cjs'))],
            env={**os.environ,'OVERVIEW_TEST_INPUT':json.dumps(data)}, capture_output=True,text=True,timeout=100)
        self.assertEqual(result.returncode,0,result.stdout + result.stderr)
        print(result.stdout.strip())
