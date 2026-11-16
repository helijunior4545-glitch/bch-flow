import uuid
from django.db import models
from django.db.models import Q
from .software_storage import software_archive_storage

class MerchantProduct(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("app_bch_flow.BCHOrganization", on_delete=models.CASCADE, related_name="catalog_products")
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=64, blank=True)
    description = models.TextField(blank=True, max_length=2000)
    price = models.DecimalField(max_digits=22, decimal_places=8)
    currency = models.CharField(max_length=3, choices=[("BCH", "BCH"), ("BTC", "BTC"), ("BRL", "BRL")], default="BCH")
    image = models.FileField(upload_to="merchant_catalog/products/", blank=True)
    is_pinned = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bchflow_merchant_product"
        ordering = ("-is_pinned", "position", "-created_at")
        constraints = [
            models.UniqueConstraint(fields=("organization", "sku"), condition=~Q(sku=""), name="bch_cat_org_sku_unique"),
            models.CheckConstraint(condition=Q(price__gte=0), name="bch_cat_price_nonnegative"),
        ]
        indexes = [models.Index(fields=("organization", "archived_at", "is_pinned", "position"), name="bch_cat_org_sort_idx")]


class ReceiptProductSnapshot(models.Model):
    """Immutable commercial terms for one financial payment request."""
    request = models.OneToOneField("app_bch_flow.FlowRequest", primary_key=True, on_delete=models.PROTECT, related_name="catalog_snapshot")
    product = models.ForeignKey(MerchantProduct, null=True, blank=True, on_delete=models.SET_NULL, related_name="receipt_snapshots")
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=64, blank=True)
    description = models.TextField(max_length=2000, blank=True)
    currency = models.CharField(max_length=3)
    price = models.DecimalField(max_digits=22, decimal_places=8)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bchflow_receipt_product_snapshot"


class SoftwareRelease(models.Model):
    """Published releases are append-only; purchases retain their exact artifact."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(MerchantProduct, on_delete=models.PROTECT, related_name="releases")
    version = models.CharField(max_length=40)
    archive = models.FileField(upload_to="software/releases/%Y/%m/", storage=software_archive_storage)
    sha256 = models.CharField(max_length=64, editable=False)
    size_bytes = models.PositiveBigIntegerField(editable=False)
    requirements = models.TextField(max_length=2000)
    license_text = models.TextField(max_length=12000)
    notes = models.TextField(max_length=2000, blank=True)
    published_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("product", "version"), name="software_product_version")]
        ordering = ("-published_at",)


class SoftwareOffer(models.Model):
    release = models.ForeignKey(SoftwareRelease, on_delete=models.PROTECT, related_name="offers")
    account = models.ForeignKey("app_bch_flow.FlowAccount", on_delete=models.PROTECT)
    seller = models.ForeignKey("app_bch_flow.BCHIdentity", on_delete=models.PROTECT)
    amount_units = models.PositiveBigIntegerField()
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("release", "account"), name="software_offer_account"),
            models.CheckConstraint(condition=Q(amount_units__gt=0, amount_units__lte=2100000000000000), name="software_offer_amount"),
        ]


class SoftwareOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey("app_bch_flow.BCHIdentity", on_delete=models.PROTECT, related_name="software_orders")
    offer = models.ForeignKey(SoftwareOffer, on_delete=models.PROTECT)
    payment = models.OneToOneField("app_bch_flow.FlowRequest", on_delete=models.PROTECT, related_name="software_order")
    idempotency_key = models.UUIDField()
    product_name = models.CharField(max_length=160)
    license_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [models.UniqueConstraint(fields=("buyer", "idempotency_key"), name="software_buyer_operation")]


class SoftwareDownload(models.Model):
    order = models.ForeignKey(SoftwareOrder, on_delete=models.PROTECT, related_name="downloads")
    created_at = models.DateTimeField(auto_now_add=True)
