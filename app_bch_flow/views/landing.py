from django.conf import settings
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.shortcuts import render
from app_bch_flow.views.authentication import current_identity
from app_bch_flow.identity.jury import access_context


def index(request):
    presentation_url = getattr(settings, "FLOW_HACKATHON_PRESENTATION_URL", "").strip()
    if presentation_url:
        try:
            URLValidator(schemes=["https"])(presentation_url)
        except ValidationError:
            presentation_url = ""
    return render(request, "app_bch_flow/landing/index.html", {
        "hackathon_presentation_url": presentation_url,
        "hackathon_token_address": getattr(settings, "FLOW_HACKATHON_TOKEN_ADDRESS", "").strip(),
        "identity": current_identity(request),
        **access_context(),
    })
