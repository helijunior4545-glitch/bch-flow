from django.urls import path, include

urlpatterns = [
    path("bch-flow/", include("app_bch_flow.urls")),
    path("i18n/", include("django.conf.urls.i18n")),
]
