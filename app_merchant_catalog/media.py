"""Public promotional MP4 storage, separate from private paid ZIP archives."""
import re
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage, storages
from django.http import FileResponse, Http404, HttpResponse, HttpResponseRedirect, StreamingHttpResponse
from django.utils.translation import gettext as _

MAX_VIDEO_BYTES = 20 * 1024 * 1024


def catalog_video_storage():
    if 'catalog_video' in settings.STORAGES:
        return storages['catalog_video']
    if settings.STORAGES.get('default', {}).get('BACKEND', '').startswith('cloudinary_storage.'):
        return timed_video_storage()
    return default_storage


def validate_video(upload):
    if not upload:
        return
    if not upload.name.lower().endswith(('.mp4','.mov','.m4v','.webm')) or not 16 <= upload.size <= MAX_VIDEO_BYTES:
        raise ValidationError(_('Upload an MP4 video up to 20 MB.'))
    header = upload.read(64)
    upload.seek(0)
    webm=upload.name.lower().endswith('.webm') and header.startswith(b'\x1aE\xdf\xa3')
    if not webm and (header[4:8] != b'ftyp' or not any(brand in header[8:] for brand in (b'isom',b'iso2',b'mp41',b'mp42',b'avc1',b'M4V ',b'qt  '))):
        raise ValidationError(_('Upload a valid MP4 video.'))


def save_preview(field, name, upload):
    try:
        if field.storage.__class__.__module__.startswith('cloudinary_storage.'):
            field.storage=timed_cloudinary_storage(field.storage.__class__)
        field.save(name,upload,save=False)
    except Exception as exc:
        if is_cloudinary(field.storage):
            raise OSError('The preview media could not be stored.') from exc
        raise


def is_cloudinary(storage):
    return any(cls.__module__.startswith('cloudinary_storage.') for cls in storage.__class__.mro())


def timed_cloudinary_storage(base):
    from .upload_limits import upload_timeout
    class TimedStorage(base):
        def _upload(self,name,content):
            import os
            import cloudinary.uploader
            return cloudinary.uploader.upload(content,use_filename=True,resource_type=self._get_resource_type(name),
                tags=self.TAG,folder=os.path.dirname(name),timeout=upload_timeout())
    return TimedStorage()


def timed_video_storage():
    from cloudinary_storage.storage import VideoMediaCloudinaryStorage
    return timed_cloudinary_storage(VideoMediaCloudinaryStorage)


def delete_preview(storage,name):
    if is_cloudinary(storage):
        import cloudinary.uploader
        cloudinary.uploader.destroy(name,invalidate=True,resource_type=storage._get_resource_type(name),timeout=2)
    else:
        storage.delete(name)


def stage_visual(product,image=None,video=None,remove_image=False,remove_video=False):
    if image and video:
        raise ValidationError(_('Choose either an image or a video, not both.'))
    changes = {}
    uploaded = []
    if image:
        from .services import validate_image
        ext = validate_image(image)
        save_preview(product.image,f'{uuid.uuid4().hex}.{ext}',image)
        uploaded.append((product.image.storage,product.image.name))
        changes = {'image':product.image.name,'video':''}
    elif video:
        validate_video(video)
        save_preview(product.video,f'{uuid.uuid4().hex}.mp4',video)
        uploaded.append((product.video.storage,product.video.name))
        changes = {'video':product.video.name,'image':''}
    else:
        if remove_image or (product.image and product.video): changes['image']=''
        if remove_video: changes['video']=''
    return changes,uploaded


def public_media(file, content_type, request=None):
    # Public Cloudinary assets already have a CDN. Do not download them through
    # the Django worker on every card view. Authorization/availability happens first.
    if is_cloudinary(file.storage):
        response = HttpResponseRedirect(file.url)
    else:
        try:
            stream = file.open('rb')
            if content_type == 'video/mp4' and request and request.headers.get('Range'):
                size = file.size
                match = re.fullmatch(r'bytes=(\d{0,20})-(\d{0,20})', request.headers['Range'])
                if not match or not any(match.groups()):
                    stream.close()
                    response = HttpResponse(status=416)
                    response['Content-Range'] = f'bytes */{size}'
                    return response
                start, end = match.groups()
                start, end = (int(start), min(int(end) if end else size-1, size-1)) if start else (max(0,size-int(end)),size-1)
                if start > end or start >= size:
                    stream.close()
                    response = HttpResponse(status=416)
                    response['Content-Range'] = f'bytes */{size}'
                    return response
                stream.seek(start)
                def chunks():
                    remaining = end-start+1
                    try:
                        while remaining:
                            chunk = stream.read(min(65536,remaining))
                            if not chunk: break
                            remaining -= len(chunk)
                            yield chunk
                    finally:
                        stream.close()
                response = StreamingHttpResponse(chunks(), status=206, content_type=content_type)
                response['Content-Range'] = f'bytes {start}-{end}/{size}'
                response['Content-Length'] = str(end-start+1)
            else:
                response = FileResponse(stream, content_type=content_type)
        except OSError as exc:
            raise Http404 from exc
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'public, max-age=300'
    if content_type == 'video/mp4': response['Accept-Ranges'] = 'bytes'
    return response
