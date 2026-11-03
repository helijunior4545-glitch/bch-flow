"""Wallet activity must describe only the selected tenant's request records."""
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import BCHInvoice


class WalletExperienceTests(TestCase):
    def setUp(self):
        self.owner = register_identity('wallet-design@test.invalid', 'a-long-test-password-123')
        self.org = create_organization(self.owner, 'Selected', 'wallet-selected')
        self.other = create_organization(self.owner, 'Other', 'wallet-other')
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        self.url = reverse('bch_flow:wallet_v41_home', args=[self.org.pk])

    def invoice(self, organization, days_ago=0):
        invoice = BCHInvoice.objects.create(
            organization=organization, amount_satoshis=1000,
            receiving_cashaddr='chipnet:visual-test-only', network='chipnet',
            expires_at=timezone.now() + timedelta(days=1),
        )
        BCHInvoice.objects.filter(pk=invoice.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )
        return invoice

    def test_chart_is_tenant_scoped_and_excludes_older_days(self):
        self.invoice(self.org)
        self.invoice(self.org, 1)
        self.invoice(self.org, 8)
        foreign = self.invoice(self.other)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        buckets = response.context['request_activity']
        self.assertEqual(len(buckets), 7)
        self.assertEqual([bucket['count'] for bucket in buckets], [0, 0, 0, 0, 0, 1, 1])
        self.assertEqual([bucket['height'] for bucket in buckets], [0, 0, 0, 0, 0, 100, 100])
        self.assertNotContains(response, str(foreign.pk))
        self.assertContains(response, 'not payments')
        self.assertNotContains(response, '<aside')
        self.assertFalse(response.context['broadcast_enabled'])
        self.assertFalse(response.context['chain_balance_verified'])

    def test_empty_wallet_has_no_fabricated_chart(self):
        self.invoice(self.other)
        response = self.client.get(self.url)
        self.assertEqual(sum(bucket['count'] for bucket in response.context['request_activity']), 0)
        self.assertNotContains(response, 'class="wallet-request-chart"')
        self.assertContains(response, 'Your story starts here')

    def test_chart_discloses_twenty_record_limit(self):
        for _ in range(21):
            self.invoice(self.org)
        response = self.client.get(self.url)
        self.assertEqual(sum(bucket['count'] for bucket in response.context['request_activity']), 20)
        self.assertContains(response, 'latest 20 records')
