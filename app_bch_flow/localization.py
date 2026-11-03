"""English is the explicit default; only a selected language cookie overrides it."""

from django.middleware.locale import LocaleMiddleware


class ExplicitLocaleMiddleware(LocaleMiddleware):
    def process_request(self, request):
        original = request.META.get("HTTP_ACCEPT_LANGUAGE")
        request.META["HTTP_ACCEPT_LANGUAGE"] = "en"
        try:
            super().process_request(request)
        finally:
            if original is None:
                request.META.pop("HTTP_ACCEPT_LANGUAGE", None)
            else:
                request.META["HTTP_ACCEPT_LANGUAGE"] = original
