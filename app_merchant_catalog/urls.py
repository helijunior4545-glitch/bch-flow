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

from . import software_views as software
urlpatterns += [
    path('dashboard/organizations/<uuid:org_id>/catalog/sales/', software.sales, name='software_sales'),
    path('software/', software.storefront, name='software_store'),
    path('software/forget-access/', software.forget_guest_access, name='software_forget_guest'),
    path('software/access/<str:token>/', software.recover, name='software_recover'),
    path('software/purchases/', software.purchases, name='software_purchases'),
    path('software/products/<uuid:product_id>/', software.product, name='software_product'),
    path('software/buy/<int:offer_id>/', software.buy, name='software_buy'),
    path('software/orders/<uuid:order_id>/', software.order_detail, name='software_order'),
    path('software/orders/<uuid:order_id>/retry/', software.retry_payment, name='software_retry'),
    path('software/orders/<uuid:order_id>/status/', software.order_status, name='software_status'),
    path('software/orders/<uuid:order_id>/download/', software.download_link, name='software_download_link'),
    path('software/download/<str:token>/', software.download, name='software_download'),
    path('dashboard/organizations/<uuid:org_id>/catalog/<uuid:product_id>/publish/', software.publish, name='software_publish'),
    path('dashboard/organizations/<uuid:org_id>/catalog/releases/<uuid:release_id>/offers/', software.add_offer, name='software_offer'),
]
