"""Produce small, silent, first-20-second promotional previews; never paid ZIPs."""
import shutil
import subprocess
import tempfile
from pathlib import Path
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.utils.translation import gettext as _
from .upload_limits import upload_timeout

MAX_PREVIEW_BYTES=4*1024*1024


def normalize_video(upload):
    from .media import validate_video
    validate_video(upload)
    executable=shutil.which('ffmpeg')
    if not executable:
        raise ValidationError(_('Video conversion is unavailable. Please contact support.'))
    with tempfile.TemporaryDirectory(prefix='bch-preview-') as directory:
        source=Path(directory)/'source';target=Path(directory)/'preview.mp4'
        with source.open('wb') as stream:
            for chunk in upload.chunks():stream.write(chunk)
        upload.seek(0)
        try:
            subprocess.run([executable,'-nostdin','-hide_banner','-loglevel','error',
                '-threads','1','-filter_threads','1','-protocol_whitelist','file',
                '-format_whitelist','mov,matroska,webm','-i',str(source),'-map','0:v:0',
                '-t','20','-an','-map_metadata','-1','-vf',
                "scale=w='min(960,iw)':h='min(540,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=fast_bilinear,fps=24",
                '-c:v','libx264','-threads','1','-preset','veryfast','-crf','30',
                '-maxrate','900k','-bufsize','1800k','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],
                check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
                timeout=min(12,upload_timeout()))
        except (subprocess.SubprocessError,OSError) as exc:
            raise ValidationError(_('The video could not be converted. Try a shorter MP4 video.')) from exc
        if not target.exists() or not 0<target.stat().st_size<=MAX_PREVIEW_BYTES:
            raise ValidationError(_('The video could not be converted. Try a shorter MP4 video.'))
        return ContentFile(target.read_bytes(),name='preview.mp4')
