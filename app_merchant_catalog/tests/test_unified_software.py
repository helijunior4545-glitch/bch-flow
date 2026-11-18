import tempfile
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.db import connection
from django.test.utils import CaptureQueriesContext
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import FlowAccount, BCHMembership
from app_merchant_catalog.models import MerchantProduct, SoftwareRelease, SoftwareOffer
from .test_software import archive


from functools import lru_cache

@lru_cache(maxsize=1)
def video_bytes():
    import subprocess,tempfile
    with tempfile.TemporaryDirectory() as directory:
        path=Path(directory)/'fixture.mp4'
        subprocess.run(['ffmpeg','-loglevel','error','-f','lavfi','-i','color=c=teal:s=160x90:d=0.3',
            '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(path)],check=True,timeout=10)
        return path.read_bytes()


def video():
    return SimpleUploadedFile('preview.mp4',video_bytes(),content_type='video/mp4')


class UnifiedSoftwareTests(TestCase):
    def setUp(self):
        media = tempfile.TemporaryDirectory(); self.addCleanup(media.cleanup)
        local=override_settings(MEDIA_ROOT=media.name);local.enable();self.addCleanup(local.disable)
        self.owner=register_identity('unified@fixture.invalid','unified-password-123')
        self.org=create_organization(self.owner,'Unified studio','unified-studio')
        self.account=FlowAccount.objects.create(organization=self.org,asset='BCH',environment='live')
        token,_=create_session(self.owner);self.client.cookies[COOKIE_NAME]=token
        self.url=reverse('bch_flow:merchant_catalog_software_create',args=[self.org.pk])

    def data(self,**changes):
        data={'name':'Unified software','price':'0.01000000','account':str(self.account.pk),'version':'1.0.0',
            'archive':archive(),'requirements':'Python 3.13','license_text':'Personal use','video':video(),
            'image':None}
        data.update(changes);return {k:v for k,v in data.items() if v is not None}

    def test_single_submit_creates_product_release_offer_and_media(self):
        response=self.client.post(self.url,self.data())
        self.assertEqual(response.status_code,201,response.content)
        product=MerchantProduct.objects.get()
        self.assertEqual(product.currency,'BCH');self.assertTrue(product.video);self.assertFalse(product.image)
        release=SoftwareRelease.objects.get(product=product)
        offer=SoftwareOffer.objects.get(release=release)
        self.assertEqual(offer.amount_units,1000000)
        self.assertEqual(offer.account,self.account);self.assertEqual(offer.seller,self.owner)
        self.assertEqual(len(release.sha256),64)
        self.assertTrue(response.json()['product']['has_video'])
        public=self.client.get(reverse('bch_flow:software_store'))
        self.assertContains(public,'data-preview-video',count=1)
        self.assertContains(public,'preload="none"')
        self.assertNotContains(public,'autoplay')

    def test_invalid_video_and_archive_leave_no_partial_product(self):
        for changes in ({'video':SimpleUploadedFile('fake.mp4',b'<html>'+b'x'*30)},
                        {'archive':SimpleUploadedFile('fake.zip',b'not zip')}):
            response=self.client.post(self.url,self.data(**changes))
            self.assertEqual(response.status_code,400,response.content)
            self.assertEqual(MerchantProduct.objects.count(),0)
            self.assertEqual(SoftwareRelease.objects.count(),0)

    def test_cross_tenant_and_sandbox_accounts_rejected(self):
        other=create_organization(self.owner,'Other studio','other-studio')
        foreign=FlowAccount.objects.create(organization=other,asset='BCH',environment='live')
        sandbox=FlowAccount.objects.create(organization=self.org,asset='BTC',environment='sandbox')
        for account in (foreign,sandbox):
            response=self.client.post(self.url,self.data(account=str(account.pk)))
            self.assertEqual(response.status_code,400)
        self.assertEqual(MerchantProduct.objects.count(),0)

    def test_missing_csrf_cannot_create_software(self):
        from django.test import Client
        client=Client(enforce_csrf_checks=True)
        client.cookies[COOKIE_NAME]=self.client.cookies[COOKIE_NAME].value
        response=client.post(self.url,self.data())
        self.assertNotIn(response.status_code,(200,201))
        self.assertEqual(MerchantProduct.objects.count(),0)

    def test_foreign_organization_cannot_be_modified(self):
        other=register_identity('foreign-unified@fixture.invalid','unified-password-123')
        org=create_organization(other,'Foreign studio','foreign-unified')
        url=reverse('bch_flow:merchant_catalog_software_create',args=[org.pk])
        self.assertEqual(self.client.post(url,self.data()).status_code,404)
        self.assertEqual(MerchantProduct.objects.count(),0)

    def test_legacy_wallet_product_creation_still_works(self):
        response=self.client.post(reverse('bch_flow:merchant_catalog_create',args=[self.org.pk]),
            {'name':'Wallet reference','price':'0.01','currency':'BCH'})
        self.assertEqual(response.status_code,201,response.content)
        self.assertEqual(SoftwareRelease.objects.count(),0)
        self.assertEqual(SoftwareOffer.objects.count(),0)

    def test_database_failure_cleans_up_uploaded_files(self):
        from django.db import IntegrityError
        from django.conf import settings
        from pathlib import Path
        with patch.object(SoftwareOffer.objects,'create',side_effect=IntegrityError('conflict')):
            response=self.client.post(self.url,self.data())
        self.assertEqual(response.status_code,409)
        self.assertEqual(MerchantProduct.objects.count(),0)
        self.assertEqual(SoftwareRelease.objects.count(),0)
        self.assertEqual([p for p in Path(settings.MEDIA_ROOT).rglob('*') if p.is_file()],[])

    def test_readonly_member_cannot_create(self):
        BCHMembership.objects.filter(identity=self.owner,organization=self.org).update(role='viewer')
        self.assertEqual(self.client.post(self.url,self.data()).status_code,403)
        self.assertEqual(MerchantProduct.objects.count(),0)

    def test_storage_failure_rolls_back_product_and_release(self):
        from app_merchant_catalog.media import catalog_video_storage
        with patch.object(catalog_video_storage(), '_save', side_effect=OSError('unavailable')):
            response=self.client.post(self.url,self.data())
        self.assertEqual(response.status_code,503)
        self.assertEqual(MerchantProduct.objects.count(),0)
        self.assertEqual(SoftwareRelease.objects.count(),0)

    def test_public_video_range_and_archive_visibility(self):
        response=self.client.post(self.url,self.data());self.assertEqual(response.status_code,201)
        product=MerchantProduct.objects.get()
        url=reverse('bch_flow:software_product_video',args=[product.pk])
        response=self.client.get(url,HTTP_RANGE='bytes=4-11')
        self.assertEqual(response.status_code,206)
        self.assertEqual(b''.join(response.streaming_content),b'ftypisom')
        response=self.client.get(url,HTTP_RANGE='bytes=99999-')
        self.assertEqual(response.status_code,416)
        product.archived_at=__import__('django').utils.timezone.now();product.save()
        self.assertEqual(self.client.get(url).status_code,404)

    def test_removing_video_preserves_paid_archive_and_image(self):
        self.assertEqual(self.client.post(self.url,self.data()).status_code,201)
        product=MerchantProduct.objects.get();old_video=product.video.name
        release=SoftwareRelease.objects.get();image_name=product.image.name
        with self.captureOnCommitCallbacks(execute=True):
            response=self.client.post(reverse('bch_flow:merchant_catalog_update',args=[self.org.pk,product.pk]),
                {'name':product.name,'price':'0.01','currency':'BCH','remove_video':'1'})
        self.assertEqual(response.status_code,200,response.content)
        product.refresh_from_db()
        self.assertFalse(product.video)
        self.assertEqual(product.image.name,image_name)
        self.assertTrue(release.archive.storage.exists(release.archive.name))
        self.assertFalse(product.video.storage.exists(old_video))
        self.assertEqual(SoftwareRelease.objects.count(),1)

    def test_image_query_does_not_fetch_license_or_archive(self):
        self.assertEqual(self.client.post(self.url,self.data(video=None,image=SimpleUploadedFile('cover.png',b'\x89PNG\r\n\x1a\n'+b'0'*40))).status_code,201)
        product=MerchantProduct.objects.get()
        with CaptureQueriesContext(connection) as captured:
            response=self.client.get(reverse('bch_flow:software_product_image',args=[product.pk]))
        self.assertEqual(response.status_code,200);b''.join(response.streaming_content)
        offer_queries=[q['sql'] for q in captured if 'softwareoffer' in q['sql'].lower()]
        self.assertTrue(offer_queries)
        self.assertTrue(all('license_text' not in query for query in offer_queries))
        self.assertTrue(all('size_bytes' not in query for query in offer_queries))


import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
from unittest import skipUnless
from django.contrib.staticfiles.testing import StaticLiveServerTestCase


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS') == '1' and shutil.which('ffmpeg'), 'Enable browser tests with ffmpeg installed.')
@override_settings(DEBUG=True,LANGUAGE_CODE='en')
class UnifiedSoftwareBrowserTests(StaticLiveServerTestCase):
    setUp = UnifiedSoftwareTests.setUp

    def test_catalog_submission_and_preview_playback(self):
        with tempfile.TemporaryDirectory() as temporary:
            clip=Path(temporary)/'preview.mp4'
            subprocess.run(['ffmpeg','-loglevel','error','-f','lavfi','-i','color=c=teal:s=160x90:d=1',
                '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(clip)],check=True,timeout=20)
            from django.conf import settings
            data={'base':self.live_server_url,'catalog':reverse('bch_flow:merchant_catalog',args=[self.org.pk]),
                  'store':reverse('bch_flow:software_store'),'token':self.client.cookies[COOKIE_NAME].value,
                  'cookie':COOKIE_NAME,'account':str(self.account.pk),'clip':str(clip),
                  'archive':base64.b64encode(archive().read()).decode(),
                  'image':str(Path(settings.BASE_DIR)/'app_merchant_catalog/static/merchant_catalog/images/software-hero.webp')}
            result=subprocess.run(['node',str(Path(__file__).with_name('unified-software.cjs'))],
                env={**os.environ,'UNIFIED_INPUT':json.dumps(data)},capture_output=True,text=True,timeout=100)
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            print(result.stdout.strip())
        self.assertEqual(MerchantProduct.objects.count(),1)
        self.assertEqual(SoftwareRelease.objects.count(),2)
        self.assertEqual(SoftwareOffer.objects.count(),2)
