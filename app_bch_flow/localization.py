"""English is the explicit default; only a selected language cookie overrides it."""

from django.middleware.locale import LocaleMiddleware
from django.utils import translation


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


class SoftwareLocaleMiddleware(ExplicitLocaleMiddleware):
    """Register before any host locale middleware; affect public software only."""

    async_capable = False

    software_views = frozenset({
        'software_store', 'software_forget_guest', 'software_recover',
        'software_purchases', 'software_product_image', 'software_product',
        'software_buy', 'software_order', 'software_retry', 'software_status',
        'software_download_link', 'software_download',
    })

    def __call__(self, request):
        # A standalone installation may not have a host locale middleware to
        # restore the translation context, including when a view raises.
        with translation.override(translation.get_language()):
            return super().__call__(request)

    def process_request(self, request):
        # Wait for URL resolution before selecting the BCH Flow policy.
        return None

    def process_view(self, request, view_func, view_args, view_kwargs):
        match = request.resolver_match
        if (
            not match
            or not {'bch_flow', 'app_bch_flow'}.intersection(match.app_names)
            or match.url_name not in self.software_views
        ):
            return None
        # Reuse BCH Flow's existing cookie-aware English default policy.
        super().process_request(request)
        explicit = translation.get_language_from_path(request.path_info)
        language = explicit or request.LANGUAGE_CODE
        translation.activate(language)
        request.LANGUAGE_CODE = language
        request.current_language = language
        request.lojasnova_language = language
        request.bch_flow_language = language
        return None

    def process_response(self, request, response):
        # The host may set Content-Language while unwinding its middleware.
        # Keep the header consistent with the language used to render BCH Flow.
        if hasattr(request, 'bch_flow_language'):
            response.headers['Content-Language'] = request.bch_flow_language
        return response
