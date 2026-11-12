from io import StringIO
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.core.management import call_command, CommandError
from django.utils import translation
from app_bch_flow.models import BCHIdentity, BCHMembership, BCHSession, FlowAccount, FlowRequest, FlowNodeConnection
from app_bch_flow.identity.sessions import COOKIE_NAME, create_session, resolve_session
from app_bch_flow.identity.services import register_identity
from app_bch_flow.identity.jury import provision_juror, JuryConfigurationError
from app_bch_flow.financial import service
from app_bch_flow.financial.amounts import PaymentError


@override_settings(FLOW_JURY_EMAIL='jurors@example.invalid', FLOW_JURY_PASSWORD='test-only-jury-password-123', FLOW_JURY_ORGANIZATION_SLUG='bch-flow-jury', FLOW_PAYMENTS_SANDBOX_ENABLED=False)
class JuryExperienceTests(TestCase):
    def setUp(self):
        self.actor, self.org, _created = provision_juror()

    def enter(self, client=None):
        response = (client or self.client).post(reverse('bch_flow:jury_enter'))
        self.assertEqual(response.status_code, 302)
        return response

    def test_entry_authenticates_existing_normal_customer_and_opens_live_wallet(self):
        response = self.enter()
        self.assertFalse(self.actor.is_demo)
        self.assertIn('environment=live', response.url)
        self.assertNotIn('sandbox', response.url)
        self.assertEqual(resolve_session(response.cookies[COOKIE_NAME].value).identity_id, self.actor.pk)
        page = self.client.get(response.url)
        self.assertTemplateUsed(page, 'app_bch_flow/financial/home.html')
        self.assertContains(page, 'Connect your first wallet.')
        self.assertContains(page, reverse('bch_flow:merchant_integrations', args=[self.org.pk]))
        self.assertNotContains(page, 'Your jury workspace is ready.')
        self.assertNotContains(page, 'test-only-jury-password-123')
        self.assertFalse(FlowAccount.objects.exists())
        self.assertFalse(FlowRequest.objects.exists())
        self.assertFalse(FlowNodeConnection.objects.exists())

    def test_entry_is_post_only_and_csrf_protected(self):
        url = reverse('bch_flow:jury_enter')
        self.assertEqual(self.client.get(url).status_code, 405)
        self.assertEqual(Client(enforce_csrf_checks=True).post(url).status_code, 403)
        self.assertEqual(BCHSession.objects.count(), 0)

    def test_multiple_visitors_share_only_the_configured_customer_with_distinct_sessions(self):
        first = self.enter()
        second = self.enter(Client())
        self.assertEqual(BCHIdentity.objects.count(), 1)
        self.assertEqual(BCHMembership.objects.count(), 1)
        self.assertNotEqual(first.cookies[COOKIE_NAME].value, second.cookies[COOKIE_NAME].value)
        self.assertFalse(FlowAccount.objects.exists())

    def test_repeat_entry_reuses_account_without_seeding_and_revokes_previous_browser_token(self):
        first = self.enter().cookies[COOKIE_NAME].value
        second = self.enter().cookies[COOKIE_NAME].value
        self.assertIsNone(resolve_session(first))
        self.assertIsNotNone(resolve_session(second))
        self.assertEqual(BCHIdentity.objects.count(), 1)
        self.assertFalse(FlowRequest.objects.exists())

    def test_existing_unrelated_customer_session_is_preserved(self):
        actor = register_identity('customer@example.invalid', 'customer-password-123')
        token, _session = create_session(actor)
        self.client.cookies[COOKIE_NAME] = token
        response = self.enter()
        self.assertEqual(response.url, reverse('bch_flow:dashboard'))
        self.assertNotIn(COOKIE_NAME, response.cookies)
        self.assertIsNotNone(resolve_session(token))

    def test_normal_login_password_works(self):
        response = self.client.post(reverse('bch_flow:login'), {'email':self.actor.email, 'password':'test-only-jury-password-123'})
        self.assertRedirects(response, reverse('bch_flow:dashboard'))
        self.assertEqual(resolve_session(response.cookies[COOKIE_NAME].value).identity_id, self.actor.pk)

    def test_normal_integrations_and_organization_routes_are_accessible(self):
        self.enter()
        for name in ('merchant_integrations', 'v3_workspace'):
            self.assertEqual(self.client.get(reverse('bch_flow:'+name, args=[self.org.pk])).status_code, 200)

    @override_settings(FLOW_JURY_PASSWORD='wrong-configured-password')
    def test_bad_credentials_do_not_fallback_to_demo_or_create_customer(self):
        response = self.client.post(reverse('bch_flow:jury_enter'))
        self.assertContains(response, 'Jury access is not available yet.', status_code=503)
        self.assertNotContains(response, 'wrong-configured-password', status_code=503)
        self.assertNotIn(COOKIE_NAME, response.cookies)
        self.assertEqual(BCHIdentity.objects.count(), 1)
        self.assertFalse(FlowAccount.objects.exists())

    @override_settings(FLOW_JURY_EMAIL='', FLOW_JURY_PASSWORD='')
    def test_unconfigured_entry_is_disabled_and_does_not_provision_on_click(self):
        self.assertContains(self.client.get(reverse('bch_flow:login')), 'Jury access will be available shortly.')
        self.assertEqual(self.client.post(reverse('bch_flow:jury_enter')).status_code, 503)
        self.assertEqual(BCHIdentity.objects.count(), 1)

    def test_old_demo_is_not_promoted_or_reused_as_real_account(self):
        self.actor.is_demo=True
        self.actor.save(update_fields=['is_demo'])
        self.assertEqual(self.client.post(reverse('bch_flow:jury_enter')).status_code, 503)
        with self.assertRaises(JuryConfigurationError):
            provision_juror()
        token,_session=create_session(self.actor)
        self.client.cookies[COOKIE_NAME]=token
        self.assertEqual(self.client.post(reverse('bch_flow:v3_invoice_new',args=[self.org.pk])).status_code,403)
        with self.assertRaises(PaymentError):
            service.ensure_account(self.actor,self.org.pk,'BCH','live')

    def test_setup_command_is_idempotent_and_does_not_log_password(self):
        output=StringIO()
        call_command('bchflow_setup_jury',stdout=output)
        call_command('bchflow_setup_jury',stdout=output)
        self.assertNotIn('test-only-jury-password-123',output.getvalue())
        self.assertEqual(BCHIdentity.objects.count(),1)
        self.assertFalse(FlowAccount.objects.exists())

    @override_settings(FLOW_JURY_PASSWORD='a-different-password-123')
    def test_setup_does_not_reset_existing_password(self):
        with self.assertRaises(CommandError):
            call_command('bchflow_setup_jury',stdout=StringIO())
        self.actor.refresh_from_db()
        self.assertTrue(self.actor.check_password('test-only-jury-password-123'))

    def test_setup_rolls_back_if_another_customer_owns_organization_slug(self):
        with override_settings(FLOW_JURY_EMAIL='another@example.invalid'):
            with self.assertRaises(JuryConfigurationError):
                provision_juror()
        self.assertFalse(BCHIdentity.objects.filter(email='another@example.invalid').exists())

    def test_old_demo_can_open_login_and_switch_to_configured_customer(self):
        old=register_identity('legacy@example.invalid','legacy-password-123')
        old.is_demo=True
        old.save(update_fields=['is_demo'])
        token,_session=create_session(old)
        self.client.cookies[COOKIE_NAME]=token
        self.assertContains(self.client.get(reverse('bch_flow:login')), 'Your access to BCH Flow.')
        self.enter()
        self.assertIsNone(resolve_session(token))
        self.assertFalse(resolve_session(self.client.cookies[COOKIE_NAME].value).identity.is_demo)

    def test_custom_organization_slug_is_normalized_for_repeated_setup(self):
        with override_settings(FLOW_JURY_ORGANIZATION_SLUG='BCH Flow Jury'):
            identity,organization,created=provision_juror()
        self.assertFalse(created)
        self.assertEqual(identity.pk,self.actor.pk)
        self.assertEqual(organization.pk,self.org.pk)

    def test_new_pages_have_translated_copy(self):
        for lang,heading in [('pt-br','Dinheiro em movimento.'),('es','Dinero en movimiento.'),('fr','L’argent en mouvement.'),('de','Geld in Bewegung.')]:
            with translation.override(lang):
                self.assertContains(self.client.get(reverse('bch_flow:home')),heading)
