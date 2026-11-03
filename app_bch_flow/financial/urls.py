from django.urls import path
from . import views

urlpatterns = [
    path(
        "dashboard/organizations/<uuid:org_id>/payments/",
        views.home,
        name="financial_home",
    ),
    path(
        "dashboard/organizations/<uuid:org_id>/payments/requests/<uuid:request_id>/",
        views.request_detail,
        name="financial_request",
    ),
    path(
        "dashboard/organizations/<uuid:org_id>/payments/withdrawals/<uuid:withdrawal_id>/signing-package.json",
        views.signing_package,
        name="financial_signing_package",
    ),
    path("checkout/<str:token>/", views.checkout, name="financial_checkout"),
    path("checkout/<str:token>/qr.svg", views.qr, name="financial_qr"),
    path(
        "checkout/<str:token>/status/",
        views.checkout_status,
        name="financial_checkout_status",
    ),
    path(
        "webhooks/mercadopago/<uuid:org_id>/<str:environment>/",
        views.mercado_webhook,
        name="financial_mp_webhook",
    ),
]
