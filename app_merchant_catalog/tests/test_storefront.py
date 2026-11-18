"""Public storefront, catalog images, localization and responsive browser checks."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from unittest import skipUnless
from unittest.mock import Mock, patch

from django.conf import settings
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from app_merchant_catalog.models import MerchantProduct, SoftwareRelease, SoftwareOffer
from . import test_software as fixtures


class StorefrontFixture:
    login = fixtures.SoftwareTests.login
    url = fixtures.SoftwareTests.url

    def setUp(self):
        media = tempfile.TemporaryDirectory()
        self.addCleanup(media.cleanup)
        local = override_settings(MEDIA_ROOT=media.name, MEDIA_URL='/media/')
        local.enable()
        self.addCleanup(local.disable)
        fixtures.SoftwareTests.setUp(self)
        self.client = Client()
        cover = Path(settings.BASE_DIR) / 'app_merchant_catalog/static/merchant_catalog/images/software-hero.webp'
        self.product.image.save('cover.webp', SimpleUploadedFile('cover.webp', cover.read_bytes()))


class StorefrontTests(StorefrontFixture, TestCase):
    def test_public_catalog_uses_saved_image_and_no_duplicate_payment_cards(self):
        response = self.client.get(self.url('software_store'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-software-card', count=1)
        self.assertContains(response, self.url('software_product_image', self.product.pk))
        self.assertContains(response, 'Report builder')
        image = self.client.get(self.url('software_product_image', self.product.pk))
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image['Content-Type'], 'image/webp')
        self.assertEqual(b''.join(image.streaming_content)[:4], b'RIFF')

    def test_download_card_routes_to_purchase_details_and_discloses_payment(self):
        response=self.client.get(self.url('software_store'))
        self.assertContains(response,'data-lucide="download"',count=1)
        self.assertContains(response,'Available after payment confirmation')
        self.assertContains(response,self.url('software_product',self.product.pk)+'#checkout-title')
        self.assertNotContains(response,'bch-utility-links')
        self.assertNotContains(response,self.url('software_download_link',self.product.pk))

    def test_extensionless_storage_key_serves_the_complete_image(self):
        content = self.product.image.read()
        self.product.image.close()
        self.product.image = self.product.image.storage.save(
            'merchant_catalog/products/public_id_without_extension', ContentFile(content))
        self.product.save(update_fields=['image'])
        response = self.client.get(self.url('software_product_image', self.product.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/webp')
        self.assertEqual(b''.join(response.streaming_content), content)

    def test_cloudinary_public_id_is_not_rejected_as_an_unknown_extension(self):
        content = self.product.image.read()
        self.product.image.close()
        self.product.image = 'merchant_catalog/products/cloudinary_public_id'
        self.product.save(update_fields=['image'])
        with override_settings(STORAGES={
            'default': {'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage'},
            'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
        }), patch('cloudinary_storage.storage.MediaCloudinaryStorage._get_url',
                  return_value='https://images.example.invalid/product'), patch(
                      'cloudinary_storage.storage.requests.get',
                      return_value=Mock(status_code=200, content=content)) as fetch:
            response = self.client.get(self.url('software_product_image', self.product.pk))
            self.assertEqual(response.status_code, 302)
            self.assertEqual(response['Location'], 'https://images.example.invalid/product')
            fetch.assert_not_called()

    def test_image_type_uses_bytes_and_rejects_non_image_content(self):
        for content, expected in [(b'\x89PNG\r\n\x1a\n' + b'0' * 32, 'image/png'),
                                  (b'\xff\xd8\xff' + b'0' * 32, 'image/jpeg'),
                                  (b'<svg onload="alert(1)"></svg>', None)]:
            with self.subTest(expected=expected):
                self.product.image = self.product.image.storage.save(
                    'merchant_catalog/products/misleading.webp', ContentFile(content))
                self.product.save(update_fields=['image'])
                response = self.client.get(self.url('software_product_image', self.product.pk))
                self.assertEqual(response.status_code, 200 if expected else 404)
                if expected:
                    self.assertEqual(response['Content-Type'], expected)
                    self.assertEqual(b''.join(response.streaming_content), content)

    def test_image_is_not_public_without_an_available_offer(self):
        for hide in ('offers', 'organization'):
            with self.subTest(hide=hide):
                if hide == 'offers':
                    SoftwareOffer.objects.filter(release=self.release).update(active=False)
                else:
                    SoftwareOffer.objects.filter(release=self.release).update(active=True)
                    self.product.organization.is_active = False
                    self.product.organization.save(update_fields=['is_active'])
                self.assertEqual(self.client.get(self.url('software_product_image', self.product.pk)).status_code, 404)

    def test_english_default_and_saved_language_preference(self):
        url = self.url('software_store')
        response = self.client.get(url, HTTP_ACCEPT_LANGUAGE='pt-BR')
        self.assertEqual(response['Content-Language'], 'en')
        self.assertContains(response, 'Find your next tool.')
        for language, expected in [('pt-br', 'Encontre sua próxima ferramenta.'), ('es', 'Encuentra tu próxima herramienta.'), ('de', 'Finde dein nächstes Tool.'), ('fr', 'Trouvez votre prochain outil.')]:
            self.client.cookies[settings.LANGUAGE_COOKIE_NAME] = language
            response = self.client.get(url)
            self.assertEqual(response['Content-Language'], language)
            self.assertContains(response, expected)
            self.assertNotContains(response, 'Find your next tool.')

    def test_language_default_change_is_scoped_to_software(self):
        response = self.client.get('/health/live/', HTTP_ACCEPT_LANGUAGE='pt-BR')
        self.assertEqual(response['Content-Language'], 'pt-br')

    def test_missing_image_has_fallback_and_empty_state_is_usable(self):
        self.product.image = ''
        self.product.save(update_fields=['image'])
        response = self.client.get(self.url('software_store'))
        self.assertContains(response, 'sw-image-placeholder')
        self.assertNotContains(response, self.url('software_product_image', self.product.pk))
        SoftwareOffer.objects.update(active=False)
        response = self.client.get(self.url('software_store'))
        self.assertContains(response, 'The next useful tool starts here.')
        self.assertNotContains(response, 'data-software-card')


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS') == '1', 'Set FLOW_BROWSER_TESTS=1 for Chromium checks.')
@override_settings(DEBUG=True, MEDIA_URL='/media/')
class StorefrontBrowserTests(StorefrontFixture, StaticLiveServerTestCase):
    def test_responsive_carousel_search_keyboard_motion_and_translation(self):
        self.org.name = 'Software studio ' + 'Professional' * 9
        self.org.save(update_fields=['name'])
        for index in range(1, 8):
            product = MerchantProduct.objects.create(organization=self.org, name=(f'Tool {index} '+('LongSoftwareName'*8 if index == 7 else '')).strip(), description=('VeryLongUnbrokenDescription'*50 if index == 7 else f'Useful application {index}'), price='10', currency='BCH')
            release = SoftwareRelease.objects.create(product=product, version='1.0', archive=self.release.archive.name,
                sha256=self.release.sha256, size_bytes=self.release.size_bytes, requirements='Python', license_text='Test fixture')
            SoftwareOffer.objects.create(release=release, account=self.accounts['BCH'], seller=self.seller, amount_units=2100000000000000 if index == 7 else 1000)
        env = {**os.environ, 'STOREFRONT_BROWSER_INPUT': json.dumps({'base': self.live_server_url, 'path':self.url('software_store')})}
        result = subprocess.run(['node', str(Path(__file__).with_name('storefront-browser.cjs'))], env=env, capture_output=True, text=True, timeout=100)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        print(result.stdout.strip())
