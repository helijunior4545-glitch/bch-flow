from django.urls import path
from . import health, v3_invoices

urlpatterns = [
    path("health/", health.health, name="bchflow-health"),
    path("organizations/<uuid:org_id>/invoices/", v3_invoices.invoices, name="bchflow-v3-invoices"),
]
