from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from .models import MerchantProduct


def ordered_products(org_id, include_archived=False):
    qs = MerchantProduct.objects.filter(organization_id=org_id)
    if not include_archived:
        qs = qs.filter(archived_at__isnull=True)
    return qs.order_by("-is_pinned", "position", "-created_at")


def serialize(product):
    return {"id": str(product.pk), "name": product.name, "sku": product.sku,
            "description": product.description, "price": str(product.price),
            "currency": product.currency, "pinned": product.is_pinned,
            "position": product.position, "archived": bool(product.archived_at),
            "updated": product.updated_at.date().isoformat(), "image_url": ("image/" + str(product.pk) + "/") if product.image else ""}


@transaction.atomic
def save_product(org_id, form, instance=None):
    # Lock organization row to serialize writes within the same tenant.
    from app_bch_flow.models import BCHOrganization
    BCHOrganization.objects.select_for_update().get(pk=org_id)
    item = form.save(commit=False)
    item.organization_id = org_id
    if instance is None:
        maximum = MerchantProduct.objects.filter(organization_id=org_id).aggregate(m=Max("position"))["m"] or 0
        item.position = maximum + 1
    item.save()
    return item


@transaction.atomic
def set_pin(org_id, product_id, pinned):
    from app_bch_flow.models import BCHOrganization
    BCHOrganization.objects.select_for_update().get(pk=org_id)
    product = MerchantProduct.objects.get(pk=product_id, organization_id=org_id, archived_at__isnull=True)
    product.is_pinned = bool(pinned)
    product.save(update_fields=("is_pinned", "updated_at"))
    return product


@transaction.atomic
def move_product(org_id, product_id, direction):
    from app_bch_flow.models import BCHOrganization
    if direction not in ("up", "down"):
        raise ValueError("Invalid direction")
    BCHOrganization.objects.select_for_update().get(pk=org_id)
    item = MerchantProduct.objects.get(pk=product_id, organization_id=org_id, archived_at__isnull=True)
    peers = list(MerchantProduct.objects.filter(organization_id=org_id, archived_at__isnull=True, is_pinned=item.is_pinned).order_by("position", "created_at", "pk"))
    index = next(i for i,p in enumerate(peers) if p.pk == item.pk)
    target = index + (-1 if direction == "up" else 1)
    if 0 <= target < len(peers):
        peers[index], peers[target] = peers[target], peers[index]
        for i,p in enumerate(peers):
            if p.position != i:
                p.position = i
                p.save(update_fields=("position", "updated_at"))
    return item


@transaction.atomic
def reorder_pins(org_id, ids):
    from app_bch_flow.models import BCHOrganization
    BCHOrganization.objects.select_for_update().get(pk=org_id)
    pinned = list(MerchantProduct.objects.filter(organization_id=org_id, archived_at__isnull=True, is_pinned=True))
    lookup = {str(p.pk): p for p in pinned}
    if len(ids) != len(set(ids)) or set(ids) != set(lookup):
        raise ValueError("Pinned product list does not match this organization")
    for index, pk in enumerate(ids):
        p = lookup[pk]
        p.position = index
        p.save(update_fields=("position", "updated_at"))

# Image signatures are verified server-side; no SVG/HTML or executable uploads.
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.conf import settings
import uuid

MAX_IMAGE_BYTES = 5 * 1024 * 1024

def validate_image(upload):
    if not upload:
        return None
    if upload.size > MAX_IMAGE_BYTES or upload.size < 16:
        raise ValidationError("Image must be between 16 bytes and 5 MB")
    header = upload.read(32)
    upload.seek(0)
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        ext = "png"
    elif header.startswith(b"\xff\xd8\xff"):
        ext = "jpg"
    elif header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        ext = "webp"
    else:
        raise ValidationError("Only PNG, JPEG or WEBP images are supported")
    return ext

def update_image(product, upload=None, remove=False):
    if not remove and not upload:
        return
    old_name = product.image.name if product.image else ""
    if remove:
        product.image = ""
    else:
        ext = validate_image(upload)
        product.image.save(f"{uuid.uuid4().hex}.{ext}", upload, save=False)
    product.save(update_fields=("image", "updated_at"))
    # Delete the previous file only after successful model save.
    if old_name and old_name != product.image.name:
        transaction.on_commit(lambda: product.image.storage.delete(old_name))
