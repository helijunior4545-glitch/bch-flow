from django.test import TestCase
from django.urls import reverse

from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME


class StudioNavigationTests(TestCase):
    def setUp(self):
        self.identity = register_identity('studio@example.com', 'studio-test-password-2026')

    def authenticate(self):
        token, _ = create_session(self.identity)
        self.client.cookies[COOKIE_NAME] = token

    def test_guest_landing_offers_login_and_wallet(self):
        response = self.client.get(reverse('bch_flow:home'))
        self.assertContains(response, reverse('bch_flow:login'))
        self.assertContains(response, 'data-wallet-toggle')
        self.assertContains(response, 'aria-expanded="true"')

    def test_authenticated_landing_links_dashboard(self):
        self.authenticate()
        response = self.client.get(reverse('bch_flow:home'))
        self.assertContains(response, 'class="studio-signin" href="' + reverse('bch_flow:dashboard') + '"')

    def test_active_session_skips_login(self):
        self.authenticate()
        self.assertRedirects(self.client.get(reverse('bch_flow:login')), reverse('bch_flow:dashboard'))

    def test_invalid_session_still_requires_login(self):
        self.client.cookies[COOKIE_NAME] = 'invalid-session'
        self.assertEqual(self.client.get(reverse('bch_flow:login')).status_code, 200)
        self.assertRedirects(self.client.get(reverse('bch_flow:dashboard')), reverse('bch_flow:login'))

    def test_merchant_pages_render_real_organization(self):
        org = create_organization(self.identity, 'Studio Merchant', 'studio-merchant')
        self.authenticate()
        for url in [reverse('bch_flow:dashboard'), reverse('bch_flow:v3_workspace', args=[org.id])]:
            response = self.client.get(url)
            self.assertContains(response, 'studio-dashboard-hero')
            self.assertContains(response, 'Studio Merchant')
