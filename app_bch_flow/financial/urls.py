from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/organizations/<uuid:org_id>/payments/requests/<uuid:request_id>/receipt/", views.receipt, name="financial_receipt"),
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

from . import integration_views

urlpatterns += [
    path(
        "dashboard/organizations/<uuid:org_id>/integrations/",
        integration_views.home,
        name="merchant_integrations",
    ),
    path(
        "integrations/mercadopago/callback/",
        integration_views.oauth_callback,
        name="merchant_mp_callback",
    ),
]

# BCHFLOW_FINAL_CATALOG_CONVERTER_V1
from .market_converter import rates as _bfc_rates
urlpatterns += [path("api/market-rates/", _bfc_rates, name="financial_market_rates")]

# BCH_FLOW_FINANCIAL_V11_READ_ONLY_OHLC
from .financial_live_ohlc import candles as _bfr_live_ohlc
urlpatterns += [path("api/live-ohlc/", _bfr_live_ohlc, name="financial_live_ohlc")]
