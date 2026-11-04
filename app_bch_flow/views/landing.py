from django.shortcuts import render
from app_bch_flow.views.authentication import current_identity


def index(request):
    return render(request, "app_bch_flow/landing/index.html", {
        "identity": current_identity(request),
    })
