"""Private raw ZIP storage when the host uses Cloudinary for public images."""
import tempfile
import time
import uuid
from urllib.request import urlopen

from django.conf import settings
from django.core.files import File
from django.core.files.storage import Storage, default_storage, storages
from django.utils.deconstruct import deconstructible
from .upload_limits import upload_timeout


class SoftwareStorageError(OSError):
    """An operational archive-storage failure safe to display to the seller."""


@deconstructible
class AuthenticatedSoftwareCloudinaryStorage(Storage):
    def _save(self, name, content):
        # Random IDs keep retries from overwriting a buyer's published artifact.
        import cloudinary.exceptions
        import cloudinary.uploader

        key = 'software/releases/' + uuid.uuid4().hex + '.zip'
        try:
            result = cloudinary.uploader.upload(
                content, public_id=key, resource_type='raw',
                type='authenticated', overwrite=False, timeout=upload_timeout(),
            )
        except (cloudinary.exceptions.Error, OSError):
            raise SoftwareStorageError(
                'The ZIP could not be stored. Please retry or contact support.'
            ) from None
        return result['public_id']

    def _open(self, name, mode='rb'):
        if mode not in ('r', 'rb'):
            raise ValueError('Software archives are read-only.')
        from cloudinary.utils import private_download_url

        # Never expose this signed provider URL to the buyer. The existing Django
        # endpoint checks ownership/payment, hashes the ZIP, then streams it.
        url = private_download_url(
            name, None, resource_type='raw', type='authenticated',
            expires_at=int(time.time()) + 60, attachment=True, secure=True,
        )
        stream = tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024)
        try:
            with urlopen(url, timeout=60) as response:
                total = 0
                while chunk := response.read(1024 * 1024):
                    total += len(chunk)
                    if total > 100 * 1024 * 1024:
                        raise SoftwareStorageError('The software package exceeds the download limit.')
                    stream.write(chunk)
            stream.seek(0)
        except (OSError, ValueError):
            stream.close()
            raise SoftwareStorageError('The software package is temporarily unavailable.') from None
        return File(stream, name=name)

    def delete(self,name):
        # Only staged, unpublished artifacts are removed by upload rollback.
        import cloudinary.uploader
        cloudinary.uploader.destroy(name,resource_type='raw',type='authenticated',invalidate=True,timeout=2)

    def exists(self, name):
        # _save always creates a fresh UUID; no public HEAD request is necessary.
        return False

    def url(self, name):
        raise ValueError('Software archives are available only through the authorized download endpoint.')


def software_archive_storage():
    if 'software' in settings.STORAGES:
        return storages['software']
    backend = settings.STORAGES.get('default', {}).get('BACKEND', '')
    if backend.startswith('cloudinary_storage.'):
        return AuthenticatedSoftwareCloudinaryStorage()
    return default_storage
