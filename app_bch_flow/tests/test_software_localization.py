from types import SimpleNamespace

from django.conf import settings
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings
from django.utils import translation

from app_bch_flow.localization import SoftwareLocaleMiddleware


@override_settings(LANGUAGE_CODE='pt-br', LANGUAGES=[('en', 'English'), ('pt-br', 'Português'), ('es', 'Español')])
class SoftwareLocaleTests(SimpleTestCase):
    def response(self, name='software_store', app='bch_flow', cookie=None, path='/portable/software/', raises=False):
        request = RequestFactory().get(path, HTTP_ACCEPT_LANGUAGE='pt-BR')
        request.resolver_match = SimpleNamespace(app_names=[app], url_name=name)
        if cookie is not None:
            request.COOKIES[settings.LANGUAGE_COOKIE_NAME] = cookie

        def view(request):
            middleware.process_view(request, None, (), {})
            if raises:
                raise ValueError('view failed')
            response = HttpResponse(translation.get_language())
            response['Content-Language'] = 'pt-br'  # Simulate a host locale middleware.
            return response

        middleware = SoftwareLocaleMiddleware(view)
        return middleware(request)

    def test_standalone_default_and_header_are_english_at_any_mount_path(self):
        with translation.override('pt-br'):
            response = self.response()
            self.assertEqual(response.content, b'en')
            self.assertEqual(response['Content-Language'], 'en')
            self.assertEqual(translation.get_language(), 'pt-br')

    def test_saved_language_and_explicit_url_take_precedence(self):
        self.assertEqual(self.response(cookie='es')['Content-Language'], 'es')
        self.assertEqual(self.response(cookie='es', path='/en/software/')['Content-Language'], 'en')

    def test_invalid_cookie_falls_back_to_english(self):
        self.assertEqual(self.response(cookie='unsupported')['Content-Language'], 'en')

    def test_other_apps_and_seller_dashboard_are_unchanged(self):
        with translation.override('pt-br'):
            for name, app in [('software_store', 'another_app'), ('software_publish', 'bch_flow'), ('dashboard', 'bch_flow')]:
                self.assertEqual(self.response(name=name, app=app).content, b'pt-br')

    def test_context_is_restored_after_view_failure(self):
        with translation.override('es'):
            with self.assertRaises(ValueError):
                self.response(raises=True)
            self.assertEqual(translation.get_language(), 'es')
