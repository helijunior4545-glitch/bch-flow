import io
from unittest import TestCase
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from app_merchant_catalog.software_storage import (
    AuthenticatedSoftwareCloudinaryStorage, SoftwareStorageError,
    software_archive_storage,
)


class SoftwareStorageTests(TestCase):
    @override_settings(STORAGES={'default': {'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage'}})
    def test_image_backend_is_replaced_only_for_software(self):
        self.assertIsInstance(software_archive_storage(), AuthenticatedSoftwareCloudinaryStorage)

    def test_zip_upload_is_raw_authenticated_and_does_not_overwrite(self):
        # The standalone app doesn't require Cloudinary unless that host uses it.
        import sys
        from types import ModuleType
        from unittest.mock import Mock
        cloud = ModuleType('cloudinary')
        cloud.exceptions = ModuleType('cloudinary.exceptions')
        cloud.exceptions.Error = RuntimeError
        cloud.uploader = ModuleType('cloudinary.uploader')
        cloud.uploader.upload = Mock(side_effect=lambda content, **options: {'public_id':options['public_id']})
        with patch.dict(sys.modules, {'cloudinary':cloud,'cloudinary.exceptions':cloud.exceptions,'cloudinary.uploader':cloud.uploader}):
            storage = AuthenticatedSoftwareCloudinaryStorage()
            first = storage.save('a.zip', SimpleUploadedFile('a.zip', b'ZIP'))
            second = storage.save('a.zip', SimpleUploadedFile('a.zip', b'ZIP'))
            self.assertNotEqual(first,second)
            options = cloud.uploader.upload.call_args.kwargs
            self.assertEqual(options['resource_type'],'raw')
            self.assertEqual(options['type'],'authenticated')
            self.assertFalse(options['overwrite'])
            self.assertLess(len(first),100)
            cloud.uploader.upload.side_effect=RuntimeError('provider details')
            with self.assertRaises(SoftwareStorageError) as failure:
                storage.save('a.zip', SimpleUploadedFile('a.zip',b'ZIP'))
            self.assertNotIn('provider details',str(failure.exception))

    def test_staged_archive_cleanup_uses_authenticated_raw_deletion(self):
        import sys
        from types import ModuleType
        from unittest.mock import Mock
        cloud=ModuleType('cloudinary');cloud.uploader=ModuleType('cloudinary.uploader')
        cloud.uploader.destroy=Mock(return_value={'result':'ok'})
        with patch.dict(sys.modules,{'cloudinary':cloud,'cloudinary.uploader':cloud.uploader}):
            AuthenticatedSoftwareCloudinaryStorage().delete('software/releases/staged.zip')
        cloud.uploader.destroy.assert_called_once_with('software/releases/staged.zip',resource_type='raw',type='authenticated',invalidate=True,timeout=2)

    def test_download_uses_signed_raw_url_and_reads_archive(self):
        import sys
        from types import ModuleType
        from unittest.mock import Mock
        cloud = ModuleType('cloudinary')
        cloud.utils = ModuleType('cloudinary.utils')
        cloud.utils.private_download_url = Mock(return_value='https://example.invalid/signed')
        modules = {'cloudinary': cloud, 'cloudinary.utils': cloud.utils}
        with patch.dict(sys.modules, modules), patch('app_merchant_catalog.software_storage.urlopen',
                return_value=io.BytesIO(b'ZIP bytes')) as fetch:
            with AuthenticatedSoftwareCloudinaryStorage().open('release.zip') as archive:
                self.assertEqual(archive.read(), b'ZIP bytes')
            options = cloud.utils.private_download_url.call_args.kwargs
            self.assertEqual(options['resource_type'], 'raw')
            self.assertEqual(options['type'], 'authenticated')
            self.assertTrue(options['secure'])
            self.assertIn('expires_at', options)
            fetch.assert_called_once_with('https://example.invalid/signed', timeout=60)
        with patch.dict(sys.modules, modules), patch('app_merchant_catalog.software_storage.urlopen',
                side_effect=OSError('private provider details')):
            with self.assertRaises(SoftwareStorageError) as failure:
                AuthenticatedSoftwareCloudinaryStorage().open('release.zip')
            self.assertNotIn('private provider details', str(failure.exception))

    def test_public_url_is_not_available(self):
        with self.assertRaises(ValueError):
            AuthenticatedSoftwareCloudinaryStorage().url('a.zip')
