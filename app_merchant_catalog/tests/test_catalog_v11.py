from django.test import SimpleTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from app_merchant_catalog.services import validate_image

class CatalogImageValidationTests(SimpleTestCase):
    def test_reject_svg(self):
        with self.assertRaises(ValidationError):
            validate_image(SimpleUploadedFile("evil.svg", b"<svg><script>alert(1)</script></svg>"))
    def test_accept_png_signature(self):
        f = SimpleUploadedFile("test.png", b"\x89PNG\r\n\x1a\n" + b"0"*20)
        self.assertEqual(validate_image(f), "png")
    def test_reject_oversized(self):
        with self.assertRaises(ValidationError):
            validate_image(SimpleUploadedFile("big.png", b"\x89PNG\r\n\x1a\n" + b"0"*(5*1024*1024)))
