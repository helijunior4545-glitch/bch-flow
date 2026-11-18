import json
from pathlib import Path
import subprocess
import tempfile
from unittest.mock import patch
from django.test import SimpleTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from app_merchant_catalog.video_processing import normalize_video,MAX_PREVIEW_BYTES
from .test_unified_software import video


class VideoProcessingTests(SimpleTestCase):
    def test_long_video_is_short_silent_and_resized(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'long.mp4'
            subprocess.run(['ffmpeg','-loglevel','error','-f','lavfi','-i','color=c=red:s=1280x720:r=5:d=22',
                '-f','lavfi','-i','sine=frequency=440:duration=22','-c:v','libx264','-preset','ultrafast',
                '-pix_fmt','yuv420p','-c:a','aac','-shortest',str(source)],check=True,timeout=15)
            result=normalize_video(SimpleUploadedFile('long.mp4',source.read_bytes(),content_type='video/mp4'))
            output=Path(directory)/'result.mp4';output.write_bytes(result.read())
            probe=subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)],
                capture_output=True,check=True,text=True,timeout=5)
            details=json.loads(probe.stdout)
            self.assertLessEqual(float(details['format']['duration']),20.1)
            self.assertEqual(len(details['streams']),1)
            stream=details['streams'][0]
            self.assertEqual(stream['codec_name'],'h264');self.assertEqual(stream['codec_type'],'video')
            self.assertLessEqual(stream['width'],960);self.assertLessEqual(stream['height'],540)
            self.assertLessEqual(result.size,MAX_PREVIEW_BYTES)

    def test_small_video_is_not_upscaled(self):
        result=normalize_video(video())
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'result.mp4';path.write_bytes(result.read())
            probe=subprocess.run(['ffprobe','-v','error','-show_streams','-of','json',str(path)],capture_output=True,text=True,check=True)
            stream=json.loads(probe.stdout)['streams'][0]
            self.assertLessEqual(stream['width'],160);self.assertLessEqual(stream['height'],90)

    def test_missing_converter_has_clear_validation_error(self):
        with patch('app_merchant_catalog.video_processing.shutil.which',return_value=None):
            with self.assertRaises(ValidationError):normalize_video(video())
