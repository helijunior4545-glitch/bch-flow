from pathlib import Path
from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from app_merchant_catalog.models import MerchantProduct,SoftwareRelease,SoftwareOffer
from app_merchant_catalog.media import timed_video_storage
from . import test_unified_software as unified
video=unified.video
from .test_software import archive


def image():
    return SimpleUploadedFile('cover.png',b'\x89PNG\r\n\x1a\n'+b'0'*40,content_type='image/png')


class MediaReplacementTests(TestCase):
    setUp=unified.UnifiedSoftwareTests.setUp
    data=unified.UnifiedSoftwareTests.data

    def create(self,**changes):
        response=self.client.post(self.url,self.data(**changes))
        self.assertEqual(response.status_code,201,response.content)
        return MerchantProduct.objects.get()

    def edit(self,product,**changes):
        data={'name':product.name,'price':str(product.price),'currency':product.currency}
        data.update(changes)
        return self.client.post(reverse('bch_flow:merchant_catalog_update',args=[self.org.pk,product.pk]),data)

    def test_video_replaces_image_and_deletes_old_file_after_commit(self):
        product=self.create(video=None,image=image());old=product.image.name
        with self.captureOnCommitCallbacks(execute=True):response=self.edit(product,video=video())
        self.assertEqual(response.status_code,200,response.content)
        product.refresh_from_db();self.assertFalse(product.image);self.assertTrue(product.video)
        self.assertFalse(product.image.storage.exists(old))

    def test_image_replaces_video_and_deletes_old_file_after_commit(self):
        product=self.create();old=product.video.name
        with self.captureOnCommitCallbacks(execute=True):response=self.edit(product,image=image())
        self.assertEqual(response.status_code,200,response.content)
        product.refresh_from_db();self.assertFalse(product.video);self.assertTrue(product.image)
        self.assertFalse(product.video.storage.exists(old))

    def test_upload_failure_keeps_old_media_and_returns_json(self):
        product=self.create(video=None,image=image());old=product.image.name
        with patch('app_merchant_catalog.views.stage_visual',side_effect=OSError('provider failure')):
            response=self.edit(product,video=video())
        self.assertEqual(response.status_code,503)
        self.assertFalse(response.json()['ok'])
        self.assertIn('X-BCH-Upload-ID',response)
        product.refresh_from_db();self.assertEqual(product.image.name,old)
        self.assertTrue(product.image.storage.exists(old));self.assertFalse(product.video)

    def test_both_media_are_rejected(self):
        response=self.client.post(self.url,self.data(video=video(),image=image()))
        self.assertEqual(response.status_code,400);self.assertEqual(MerchantProduct.objects.count(),0)
        product=self.create()
        response=self.edit(product,video=video(),image=image())
        self.assertEqual(response.status_code,400)

    def test_zip_can_be_added_from_same_edit_form(self):
        product=self.create();old=SoftwareRelease.objects.get();old_path=old.archive.name
        response=self.edit(product,archive=archive(),version='2.0.0',account=str(self.account.pk),
            price='0.02',requirements='Python 3.13',license_text='Updated license')
        self.assertEqual(response.status_code,200,response.content)
        self.assertEqual(SoftwareRelease.objects.count(),2)
        self.assertEqual(SoftwareOffer.objects.count(),2)
        old.refresh_from_db();self.assertEqual(old.archive.name,old_path)
        self.assertTrue(old.archive.storage.exists(old_path))

    def test_duplicate_version_keeps_original_media_and_removes_staged_files(self):
        product=self.create();before=set(p for p in Path(settings.MEDIA_ROOT).rglob('*') if p.is_file())
        response=self.edit(product,image=image(),archive=archive(),version='1.0.0',account=str(self.account.pk),
            requirements='Python',license_text='Use')
        self.assertEqual(response.status_code,409)
        product.refresh_from_db();self.assertTrue(product.video);self.assertFalse(product.image)
        self.assertEqual(set(p for p in Path(settings.MEDIA_ROOT).rglob('*') if p.is_file()),before)

    def test_private_video_preview_requires_membership_even_for_unpublished_media(self):
        product=self.create()
        SoftwareOffer.objects.update(active=False)
        url=reverse('bch_flow:merchant_catalog_video',args=[self.org.pk,product.pk])
        response=self.client.get(url,HTTP_RANGE='bytes=4-11')
        self.assertEqual(response.status_code,206)
        self.assertIn('private',response['Cache-Control'])
        self.assertIn('no-store',response['Cache-Control'])
        self.assertNotIn('public',response['Cache-Control'])
        self.assertEqual(b''.join(response.streaming_content),b'ftypisom')
        self.client.cookies.clear()
        self.assertEqual(self.client.get(url).status_code,401)

    def test_expired_upload_budget_fails_before_provider_call(self):
        from app_merchant_catalog.upload_limits import _deadline,upload_timeout
        token=_deadline.set(0)
        try:
            with self.assertRaises(OSError):upload_timeout()
        finally:_deadline.reset(token)

    def test_cloudinary_video_has_bounded_timeout_and_video_resource_type(self):
        storage=timed_video_storage()
        with patch('cloudinary.uploader.upload',return_value={'public_id':'preview'}) as upload:
            storage._upload('preview.mp4',video())
        options=upload.call_args.kwargs
        self.assertEqual(options['resource_type'],'video')
        self.assertGreater(options['timeout'],0);self.assertLessEqual(options['timeout'],20)
