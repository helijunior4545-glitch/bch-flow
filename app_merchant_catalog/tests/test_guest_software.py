import tempfile
import uuid
from datetime import timedelta
from unittest.mock import patch
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from app_bch_flow.models import BCHIdentity, FlowRequest
from app_bch_flow.identity.sessions import COOKIE_NAME, create_session
from app_merchant_catalog.models import SoftwareOrder
from app_merchant_catalog.software_access import GUEST_COOKIE, recovery_token
from . import test_software as fixtures


class GuestSoftwareTests(TestCase):
    login = fixtures.SoftwareTests.login
    url = fixtures.SoftwareTests.url
    credit = fixtures.SoftwareTests.credit

    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        override = override_settings(MEDIA_ROOT=self.media.name)
        override.enable()
        self.addCleanup(override.disable)
        fixtures.SoftwareTests.setUp(self)
        self.client = Client()

    def guest_buy(self, client=None, email='guest@example.invalid', key=None):
        client = client or self.client
        key = key or uuid.uuid4()
        client.get(self.url('software_product', self.product.pk))
        with patch('app_bch_flow.financial.service.prepare_request'):
            response = client.post(self.url('software_buy', self.offers['BCH'].pk),
                                   {'operation':key, 'email':email})
        self.assertEqual(response.status_code,302)
        return SoftwareOrder.objects.get(idempotency_key=key, guest__isnull=False), response

    def test_guest_purchase_creates_no_login_account(self):
        accounts = BCHIdentity.objects.count()
        order, response = self.guest_buy()
        self.assertIsNone(order.buyer_id)
        self.assertIsNotNone(order.guest_id)
        self.assertEqual(order.customer_email,'guest@example.invalid')
        self.assertEqual(order.payment.payer_email, order.customer_email)
        self.assertEqual(BCHIdentity.objects.count(),accounts)
        self.assertTrue(response.cookies[GUEST_COOKIE]['httponly'])
        self.assertEqual(response.cookies[GUEST_COOKIE]['samesite'],'Lax')
        self.assertEqual(self.client.get(response.url).status_code,200)

    def test_invalid_email_is_rejected_before_order_creation(self):
        for email in ['', 'not-email']:
            response = self.client.post(self.url('software_buy',self.offers['BCH'].pk),
                                        {'operation':uuid.uuid4(),'email':email})
            self.assertEqual(response.status_code,400)
        self.assertFalse(SoftwareOrder.objects.exists())

    def test_guest_cannot_download_until_server_confirms_payment(self):
        order,_ = self.guest_buy()
        self.assertEqual(self.client.post(self.url('software_download_link',order.pk)).status_code,409)
        self.credit(order)
        response = self.client.post(self.url('software_download_link',order.pk))
        self.assertEqual(response.status_code,302)
        download = self.client.get(response.url)
        self.assertEqual(download.status_code,200)
        self.assertTrue(b''.join(download.streaming_content))
        self.assertEqual(Client().get(response.url).status_code,404)

    def test_download_access_is_revoked_when_payment_is_no_longer_confirmed(self):
        order,_ = self.guest_buy()
        self.credit(order)
        response = self.client.post(self.url('software_download_link',order.pk))
        self.assertEqual(response.status_code,302)
        order.payment.account.frozen = True
        order.payment.account.save(update_fields=['frozen'])
        self.assertEqual(self.client.get(response.url).status_code,404)

    def test_order_uuid_and_matching_email_are_not_authorization(self):
        order,_ = self.guest_buy(email=self.buyer.email)
        stranger = Client()
        self.assertEqual(stranger.get(self.url('software_order',order.pk)).status_code,404)
        self.assertEqual(stranger.get(self.url('software_status',order.pk)).status_code,404)
        self.assertEqual(stranger.post(self.url('software_download_link',order.pk)).status_code,404)
        token,_ = create_session(self.buyer)
        stranger.cookies[COOKIE_NAME] = token
        self.assertEqual(stranger.get(self.url('software_order',order.pk)).status_code,404)

    def test_recovery_link_restores_only_its_order(self):
        first,_ = self.guest_buy()
        second,_ = self.guest_buy()
        other = Client()
        response = other.get(self.url('software_recover',recovery_token(first)))
        self.assertEqual(response.status_code,302)
        self.assertEqual(other.get(response.url).status_code,200)
        self.assertEqual(other.get(self.url('software_order',second.pk)).status_code,404)
        orders = other.get(self.url('software_purchases')).context['orders']
        self.assertEqual([order.pk for order in orders],[first.pk])

    def test_invalid_recovery_link_cannot_grant_access(self):
        order,_ = self.guest_buy()
        token = recovery_token(order)
        self.assertEqual(Client().get(self.url('software_recover',token+'tampered')).status_code,404)

    def test_recovered_order_retry_never_creates_another_order(self):
        order,_ = self.guest_buy()
        other = Client()
        other.get(self.url('software_recover',recovery_token(order)))
        with patch('app_bch_flow.financial.service.prepare_request') as prepare:
            response = other.post(self.url('software_retry',order.pk))
        self.assertEqual(response.status_code,302)
        prepare.assert_called_once()
        self.assertEqual(SoftwareOrder.objects.count(),1)
        self.assertEqual(FlowRequest.objects.count(),1)
        self.assertEqual(Client().post(self.url('software_retry',order.pk)).status_code,404)

    def test_expired_browser_can_restore_with_saved_private_link(self):
        order,_ = self.guest_buy()
        order.guest.expires_at = timezone.now()-timedelta(seconds=1)
        order.guest.save(update_fields=['expires_at'])
        self.assertEqual(self.client.get(self.url('software_order',order.pk)).status_code,404)
        response = self.client.get(self.url('software_recover',recovery_token(order)))
        self.assertEqual(self.client.get(response.url).status_code,200)

    def test_double_click_reuses_guest_order(self):
        key = uuid.uuid4()
        first,_ = self.guest_buy(key=key)
        with patch('app_bch_flow.financial.service.prepare_request'):
            response = self.client.post(self.url('software_buy',self.offers['BCH'].pk),
                                       {'operation':key,'email':'guest@example.invalid'})
        self.assertEqual(response.status_code,302)
        self.assertEqual(SoftwareOrder.objects.count(),1)
        self.assertEqual(FlowRequest.objects.count(),1)
        self.assertTrue(str(first.pk) in response.url)

    def test_same_operation_in_different_browsers_has_separate_payments(self):
        key = uuid.uuid4()
        self.guest_buy(key=key)
        other = Client()
        other.get(self.url('software_product',self.product.pk))
        with patch('app_bch_flow.financial.service.prepare_request'):
            response = other.post(self.url('software_buy',self.offers['BCH'].pk),
                                 {'operation':key,'email':'guest@example.invalid'})
        self.assertEqual(response.status_code,302)
        self.assertEqual(SoftwareOrder.objects.count(),2)
        self.assertEqual(FlowRequest.objects.count(),2)

    def test_existing_account_still_buys_without_guest_email_form(self):
        self.login(self.buyer)
        with patch('app_bch_flow.financial.service.prepare_request'):
            response = self.client.post(self.url('software_buy',self.offers['BCH'].pk),{'operation':uuid.uuid4()})
        self.assertEqual(response.status_code,302)
        order = SoftwareOrder.objects.get()
        self.assertEqual(order.buyer,self.buyer)
        self.assertIsNone(order.guest_id)

    def test_csrf_is_required_for_guest_checkout(self):
        response = Client(enforce_csrf_checks=True).post(self.url('software_buy',self.offers['BCH'].pk),
                    {'operation':uuid.uuid4(),'email':'guest@example.invalid'})
        self.assertEqual(response.status_code,403)
        self.assertFalse(SoftwareOrder.objects.exists())

    def test_clearing_guest_access_keeps_saved_order_and_link(self):
        order,_ = self.guest_buy()
        self.client.post(self.url('software_forget_guest'))
        self.assertEqual(self.client.get(self.url('software_order',order.pk)).status_code,404)
        self.assertEqual(SoftwareOrder.objects.count(),1)
        response = self.client.get(self.url('software_recover',recovery_token(order)))
        self.assertEqual(self.client.get(response.url).status_code,200)
