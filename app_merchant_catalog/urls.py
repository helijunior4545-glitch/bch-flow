from django.urls import path
from . import views
urlpatterns = [
    path("dashboard/organizations/<uuid:org_id>/catalog/", views.index, name="merchant_catalog"),
    path("dashboard/organizations/<uuid:org_id>/catalog/api/products/", views.products, name="merchant_catalog_products"),
    path("dashboard/organizations/<uuid:org_id>/catalog/api/products/<uuid:product_id>/image/", views.image, name="merchant_catalog_image"),
    path("dashboard/organizations/<uuid:org_id>/catalog/api/products/create/", views.create, name="merchant_catalog_create"),
    path("dashboard/organizations/<uuid:org_id>/catalog/api/products/reorder/", views.reorder, name="merchant_catalog_reorder"),
    path("dashboard/organizations/<uuid:org_id>/catalog/api/products/<uuid:product_id>/update/", views.update, name="merchant_catalog_update"),
    path("dashboard/organizations/<uuid:org_id>/catalog/api/products/<uuid:product_id>/action/", views.action, name="merchant_catalog_action"),
]
