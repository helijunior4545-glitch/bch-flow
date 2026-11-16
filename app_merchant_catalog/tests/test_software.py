import hashlib
import io
import tempfile
import uuid
import zipfile
from datetime import timedelta
from unittest.mock import patch
from django.core import signing
from django.db import transaction
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import FlowAccount, FlowReceipt, FlowRequest
from app_bch_flow.financial import service
from app_bch_flow.financial.amounts import PaymentError, ProviderUnavailable
from app_merchant_catalog.models import MerchantProduct, SoftwareRelease, SoftwareOffer, SoftwareOrder, SoftwareDownload
from app_merchant_catalog.software import inspect_archive, order_software, downloadable
from app_merchant_catalog.software_views import SALT


def archive(files=None):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as file:
        for name, content in (files or {'README.md': 'Run python src/main.py', 'LICENSE.txt': 'Personal use', 'src/main.py': 'print("ok")'}).items():
            file.writestr(name, content)
    return SimpleUploadedFile('tool.zip', stream.getvalue(), content_type='application/zip')


class SoftwareTests(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.media = tempfile.TemporaryDirectory()
        cls.settings_override = override_settings(MEDIA_ROOT=cls.media.name)
        cls.settings_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls.settings_override.disable()
        cls.media.cleanup()

    def setUp(self):
        self.seller = register_identity('seller@software.invalid', 'long-software-password-123')
        self.buyer = register_identity('buyer@software.invalid', 'long-software-password-123')
        self.other = register_identity('other@software.invalid', 'long-software-password-123')
        self.org = create_organization(self.seller, 'Software studio', 'software-studio')
        self.product = MerchantProduct.objects.create(organization=self.org, name='Report builder', price='10', currency='BRL')
        upload = archive()
        digest = inspect_archive(upload)
        self.release = SoftwareRelease.objects.create(product=self.product, version='1.0.0', archive=upload,
            sha256=digest, size_bytes=upload.size, requirements='Python 3.11. No external API.', license_text='Personal use. No resale.')
        self.accounts = {asset: FlowAccount.objects.create(organization=self.org, asset=asset, environment='live') for asset in ('BTC','BCH','BRL')}
        self.offers = {asset: SoftwareOffer.objects.create(release=self.release, account=account, seller=self.seller, amount_units=1000) for asset, account in self.accounts.items()}
        self.login(self.buyer)

    def login(self, identity):
        token, _ = create_session(identity)
        self.client.cookies[COOKIE_NAME] = token

    def buy(self, asset='BCH', key=None):
        with patch('app_bch_flow.financial.service.prepare_request') as prepare:
            return order_software(self.buyer, self.offers[asset].pk, key or uuid.uuid4())

    def credit(self, order, amount=1000, confirmations=2, required=2, source=None):
        with transaction.atomic():
            account = service._locked(order.payment.account_id)
            charge = FlowRequest.objects.select_for_update().get(pk=order.payment_id)
            service._receipt(account, charge, source or 'fixture:'+uuid.uuid4().hex, amount, confirmations, required)
        order.payment.refresh_from_db()

    def url(self, name, *args):
        return reverse('bch_flow:'+name, args=args)

    def test_zip_requires_complete_package(self):
        with self.assertRaises(ValidationError):
            inspect_archive(archive({'src/main.py': 'pass'}))
        self.assertEqual(len(inspect_archive(archive())), 64)

    def test_zip_rejects_traversal_and_corruption(self):
        for upload in [archive({'../secret': 'bad', 'README.md':'ok','LICENSE.txt':'ok'}), SimpleUploadedFile('x.zip', b'not a zip')]:
            with self.assertRaises(ValidationError): inspect_archive(upload)

    def test_all_three_methods_unlock_only_confirmed_full_payment(self):
        for asset in ('BTC', 'BCH', 'BRL'):
            with self.subTest(asset=asset):
                order = self.buy(asset)
                source = 'fixture:'+uuid.uuid4().hex
                self.credit(order, confirmations=0, source=source)
                self.assertFalse(downloadable(order))
                self.credit(order, confirmations=2, source=source)
                self.assertTrue(downloadable(order))
                self.credit(order, confirmations=3, source=source)
                self.assertEqual(order.payment.receipts.count(), 1)
                self.assertEqual(order.payment.received_units, 1000)

    def test_partial_then_remaining_payment(self):
        order = self.buy()
        self.credit(order, 400)
        self.assertFalse(downloadable(order))
        self.credit(order, 600)
        self.assertTrue(downloadable(order))

    def test_overpayment_unlocks(self):
        order = self.buy()
        self.credit(order, 1200)
        self.assertTrue(downloadable(order))

    def test_expired_payment_requires_review(self):
        order = self.buy()
        FlowRequest.objects.filter(pk=order.payment_id).update(expires_at=timezone.now()-timedelta(seconds=1))
        self.credit(order)
        self.assertFalse(downloadable(order))
        self.assertEqual(order.payment.status, 'review')

    def test_browser_status_is_not_payment_evidence(self):
        order = self.buy()
        FlowRequest.objects.filter(pk=order.payment_id).update(status='paid', received_units=1000)
        self.assertFalse(downloadable(order))
        self.assertEqual(self.client.post(self.url('software_download_link', order.pk)).status_code, 409)

    def test_duplicate_click_returns_same_order(self):
        key = uuid.uuid4()
        first, second = self.buy(key=key), self.buy(key=key)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(SoftwareOrder.objects.count(), 1)
        with self.assertRaises(PaymentError): self.buy('BTC',key=key)

    def test_provider_timeout_retains_order_for_retry(self):
        key=uuid.uuid4()
        with patch('app_bch_flow.financial.service.prepare_request', side_effect=ProviderUnavailable('Unavailable')):
            response=self.client.post(self.url('software_buy', self.offers['BRL'].pk), {'operation':key})
        self.assertEqual(response.status_code,302)
        order=SoftwareOrder.objects.get()
        self.assertEqual(self.buy('BRL', key=key).pk,order.pk)
        self.assertEqual(FlowRequest.objects.count(),1)

    def test_authenticated_download_and_signed_link(self):
        order=self.buy()
        self.credit(order)
        response=self.client.post(self.url('software_download_link',order.pk))
        self.assertEqual(response.status_code,302)
        download=self.client.get(response.url)
        self.assertEqual(download.status_code,200)
        self.assertEqual(hashlib.sha256(b''.join(download.streaming_content)).hexdigest(),self.release.sha256)
        self.assertIn('attachment',download['Content-Disposition'])
        self.assertEqual(SoftwareDownload.objects.count(),1)
        self.login(self.other)
        self.assertEqual(self.client.get(response.url).status_code,404)
        self.assertEqual(self.client.get(self.url('software_status',order.pk)).status_code,404)

    def test_expired_and_tampered_tokens_fail(self):
        order=self.buy();self.credit(order)
        with patch('django.core.signing.time.time', return_value=1):
            token=signing.dumps({'order':str(order.pk),'buyer':str(self.buyer.pk)},salt=SALT)
        self.assertEqual(self.client.get(self.url('software_download',token)).status_code,404)
        self.assertEqual(self.client.get(self.url('software_download',token+'bad')).status_code,404)

    def test_reorg_revokes_previously_issued_link(self):
        order=self.buy();source='fixture:reorg'
        self.credit(order,source=source)
        response=self.client.post(self.url('software_download_link',order.pk))
        self.credit(order,confirmations=0,source=source)
        self.assertFalse(downloadable(order))
        self.assertEqual(self.client.get(response.url).status_code,404)

    def test_archiving_product_does_not_remove_paid_purchase(self):
        order=self.buy();self.credit(order)
        self.product.archived_at=timezone.now();self.product.save()
        self.assertEqual(self.client.get(self.url('software_product',self.product.pk)).status_code,404)
        self.assertTrue(downloadable(order))
        with self.assertRaises(SoftwareOffer.DoesNotExist): self.buy()

    def test_missing_or_changed_file_preserves_purchase(self):
        order=self.buy();self.credit(order)
        response=self.client.post(self.url('software_download_link',order.pk))
        with open(self.release.archive.path,'wb') as file: file.write(b'changed')
        self.assertEqual(self.client.get(response.url).status_code,503)
        self.assertTrue(SoftwareOrder.objects.filter(pk=order.pk).exists())

    def test_sandbox_receipts_never_unlock(self):
        order=self.buy()
        FlowAccount.objects.filter(pk=order.payment.account_id).update(environment='sandbox')
        self.credit(order)
        self.assertFalse(downloadable(order))

    def test_demo_buyer_cannot_purchase(self):
        self.buyer.is_demo=True;self.buyer.save()
        with self.assertRaises(PaymentError):self.buy()

    def test_foreign_account_cannot_be_published(self):
        self.login(self.seller)
        other_org=create_organization(self.other,'Other studio','other-studio')
        account=FlowAccount.objects.create(organization=other_org,asset='BTC',environment='live')
        response=self.client.post(self.url('software_publish',self.org.pk,self.product.pk),{
            'version':'2.0.0','archive':archive(),'requirements':'Python','license_text':'Personal use','account':account.pk,'price':'1'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(SoftwareRelease.objects.count(),1)
        self.assertContains(response,'Select a valid choice')

    def test_publish_and_add_second_payment_method(self):
        self.login(self.seller)
        response=self.client.post(self.url('software_publish',self.org.pk,self.product.pk),{
            'version':'2.0.0','archive':archive(),'requirements':'Python 3.11','license_text':'Personal use','account':self.accounts['BTC'].pk,'price':'0.00001'})
        self.assertEqual(response.status_code,302)
        release=SoftwareRelease.objects.get(version='2.0.0')
        response=self.client.post(self.url('software_offer',self.org.pk,release.pk),{'account':self.accounts['BRL'].pk,'price':'12.34'})
        self.assertEqual(response.status_code,302)
        self.assertEqual(release.offers.get(account__asset='BRL').amount_units,1234)

    def test_buyer_cannot_publish(self):
        self.assertEqual(self.client.get(self.url('software_publish',self.org.pk,self.product.pk)).status_code,404)

    def test_pages_render_and_poll_payment_state(self):
        self.assertContains(self.client.get(self.url('software_store')),'Report builder')
        self.assertContains(self.client.get(self.url('software_product',self.product.pk)),'Personal use')
        order=self.buy()
        self.assertEqual(self.client.get(self.url('software_order',order.pk)).status_code,200)
        self.credit(order)
        self.assertEqual(self.client.get(self.url('software_status',order.pk)).json()['state'],'ready')
        self.assertContains(self.client.get(self.url('software_purchases')),'Report builder')

    def test_login_returns_to_product_and_rejects_external_redirect(self):
        self.client.cookies.clear()
        response=self.client.post(self.url('login')+'?next='+self.url('software_product',self.product.pk),{
            'email':self.buyer.email,'password':'long-software-password-123'})
        self.assertEqual(response.url,self.url('software_product',self.product.pk))
        self.client.cookies.clear()
        self.assertEqual(self.client.get(self.url('login')+'?next='+self.url('software_product',self.product.pk)).status_code,200)
        self.client.cookies.clear()
        response=self.client.post(self.url('login'),{'email':self.buyer.email,'password':'long-software-password-123','next':'https://attacker.invalid'})
        self.assertEqual(response.url,self.url('dashboard'))


    @override_settings(DEBUG=False, SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True, FLOW_PAYMENTS_ALLOW_LIVE=True)
    @patch.dict('os.environ', {'SOFTWARE_RPC_USER':'fixture', 'SOFTWARE_RPC_PASSWORD':'fixture'})
    def test_crypto_worker_to_automatic_delivery_for_btc_and_bch(self):
        from decimal import Decimal
        from app_bch_flow.financial.providers import CoreNode
        from app_bch_flow.financial.worker import sync_crypto
        for asset in ('BTC','BCH'):
            with self.subTest(asset=asset):
                txid=('a' if asset=='BTC' else 'b')*64
                address='fixture-receive-'+asset
                config={str(self.org.pk):{asset:{'live':{
                    'url':'https://node.example.invalid/wallet/software-'+asset,
                    'username_env':'SOFTWARE_RPC_USER','password_env':'SOFTWARE_RPC_PASSWORD',
                    'chain':'main','confirmations':2}}}}
                def rpc(method,*params):
                    return {
                        'getblockchaininfo':{'chain':'main','initialblockdownload':False},
                        'getwalletinfo':{'private_keys_enabled':False},
                        'getnewaddress':address,'validateaddress':{'isvalid':True,'address':address},
                        'listsinceblock':{'transactions':[{'category':'receive','txid':txid}], 'lastblock':'c'*64},
                        'gettransaction':{'hex':'00','confirmations':2},
                        'decoderawtransaction':{'txid':txid,'vout':[{'n':0,'value':Decimal('0.00001000'),'scriptPubKey':{'address':address}}]},
                    }[method]
                with self.settings(FLOW_BLOCKCHAIN_NODES=config), patch.object(CoreNode,'rpc',side_effect=rpc):
                    order=order_software(self.buyer,self.offers[asset].pk,uuid.uuid4())
                    self.assertFalse(downloadable(order))
                    sync_crypto(self.accounts[asset]);sync_crypto(self.accounts[asset])
                    self.assertTrue(downloadable(order))
                    self.assertEqual(order.payment.receipts.count(),1)
                    self.assertEqual(self.client.post(self.url('software_download_link',order.pk)).status_code,302)

    @override_settings(DEBUG=False, SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True, FLOW_PAYMENTS_ALLOW_LIVE=True)
    @patch.dict('os.environ', {'SOFTWARE_MP_ACCESS':'fixture-token'})
    def test_pix_provider_poll_to_download_and_refund_revocation(self):
        from decimal import Decimal
        from app_bch_flow.financial.providers import MercadoPago
        from app_bch_flow.financial.worker import poll_pix
        config={str(self.org.pk):{'BRL':{'live':{'access_token_env':'SOFTWARE_MP_ACCESS','collector_id':'123'}}}}
        current={'status':'pending'}
        def remote(path,payload=None,key=None):
            charge=FlowRequest.objects.get(account=self.accounts['BRL'])
            return {'id':987,'collector_id':123,'live_mode':True,'currency_id':'BRL','payment_method_id':'pix',
                'external_reference':str(charge.pk),'transaction_amount':Decimal('10.00'),
                'status':current['status'],'date_approved':timezone.now().isoformat(),
                'transaction_amount_refunded':10 if current['status']=='refunded' else 0,
                'point_of_interaction':{'transaction_data':{'qr_code':'fixture-pix-only'}}}
        with self.settings(FLOW_PAYMENT_PROVIDERS=config),patch.object(MercadoPago,'call',side_effect=remote):
            order=order_software(self.buyer,self.offers['BRL'].pk,uuid.uuid4())
            self.assertFalse(downloadable(order))
            current['status']='approved'
            self.assertEqual(poll_pix(),(1,0))
            self.assertTrue(downloadable(order))
            response=self.client.post(self.url('software_download_link',order.pk))
            self.assertEqual(response.status_code,302)
            current['status']='refunded'
            FlowRequest.objects.filter(pk=order.payment_id).update(checked_at=None)
            self.assertEqual(poll_pix(),(1,0))
            self.assertFalse(downloadable(order))
            self.assertEqual(self.client.get(response.url).status_code,404)

    def test_seller_sales_are_scoped_to_organization(self):
        order=self.buy();self.credit(order)
        self.login(self.seller)
        self.assertContains(self.client.get(self.url('software_sales',self.org.pk)),'Report builder')
        self.login(self.other)
        self.assertEqual(self.client.get(self.url('software_sales',self.org.pk)).status_code,404)


class ConcurrentSoftwareOrdersTests(TransactionTestCase):
    def test_simultaneous_duplicate_purchases_create_one_order_and_charge(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import close_old_connections
        seller=register_identity('concurrent-seller@software.invalid','long-software-password-123')
        buyer=register_identity('concurrent-buyer@software.invalid','long-software-password-123')
        org=create_organization(seller,'Concurrent studio','concurrent-studio')
        product=MerchantProduct.objects.create(organization=org,name='Tool',price=1,currency='BCH')
        release=SoftwareRelease.objects.create(product=product,version='1',archive='unused.zip',
            sha256='a'*64,size_bytes=1,requirements='Python',license_text='Personal')
        account=FlowAccount.objects.create(organization=org,asset='BCH',environment='live')
        offer=SoftwareOffer.objects.create(release=release,account=account,seller=seller,amount_units=1000)
        barrier=Barrier(2);key=uuid.uuid4()
        def buy(_):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return order_software(buyer,offer.pk,key).pk
            finally:
                close_old_connections()
        with patch('app_bch_flow.financial.service.prepare_request'):
            with ThreadPoolExecutor(max_workers=2) as pool:
                orders=list(pool.map(buy,range(2)))
        self.assertEqual(orders[0],orders[1])
        self.assertEqual(SoftwareOrder.objects.count(),1)
        self.assertEqual(FlowRequest.objects.count(),1)
