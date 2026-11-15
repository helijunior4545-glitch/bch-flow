import json
from django.http import FileResponse
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db import IntegrityError
from django.http import JsonResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views.decorators.http import require_GET, require_POST
from app_bch_flow.models import BCHMembership
from app_bch_flow.views.authentication import current_identity
from .forms import ProductForm
from .models import MerchantProduct
from . import services

WRITE_ROLES = ("owner", "admin", "operator")

def membership(request, org_id):
    identity = current_identity(request)
    if identity is None:
        return None
    return get_object_or_404(BCHMembership.objects.select_related("organization", "identity"),
        identity=identity, organization_id=org_id, is_active=True, organization__is_active=True)

def access(request, org_id, write=False):
    member = membership(request, org_id)
    if member is None:
        return None, JsonResponse({"ok": False, "error": "Authentication required"}, status=401)
    if write and (member.role not in WRITE_ROLES or member.identity.is_demo):
        return member, JsonResponse({"ok": False, "error": "Permission denied"}, status=403)
    return member, None

@require_GET
def index(request, org_id):
    member = membership(request, org_id)
    if member is None:
        return redirect("bch_flow:login")
    return render(request, "merchant_catalog/index.html", {"member": member,
        "can_edit": member.role in WRITE_ROLES and not member.identity.is_demo,
        "wallet_home_url": None})

@require_GET
def products(request, org_id):
    member, error = access(request, org_id)
    if error is not None: return error
    qs = services.ordered_products(org_id, include_archived=True)
    return JsonResponse({"ok": True, "products": [services.serialize(p) for p in qs]})

@require_POST
def create(request, org_id):
    member, error = access(request, org_id, write=True)
    if error is not None: return error
    form = ProductForm(request.POST)
    if not form.is_valid(): return JsonResponse({"ok": False, "errors": form.errors.get_json_data()}, status=400)
    try:
        services.validate_image(request.FILES.get("image"))
    except ValidationError as exc:
        return JsonResponse({"ok": False, "error": "; ".join(exc.messages)}, status=400)
    try:
        with transaction.atomic():
            product = services.save_product(org_id, form)
            services.update_image(product, request.FILES.get("image"))
    except IntegrityError: return JsonResponse({"ok": False, "error": _("SKU already exists.")}, status=409)
    return JsonResponse({"ok": True, "product": services.serialize(product)}, status=201)

@require_POST
def update(request, org_id, product_id):
    member, error = access(request, org_id, write=True)
    if error is not None: return error
    product = get_object_or_404(MerchantProduct, pk=product_id, organization_id=org_id)
    form = ProductForm(request.POST, instance=product)
    if not form.is_valid(): return JsonResponse({"ok": False, "errors": form.errors.get_json_data()}, status=400)
    try:
        services.validate_image(request.FILES.get("image"))
    except ValidationError as exc:
        return JsonResponse({"ok": False, "error": "; ".join(exc.messages)}, status=400)
    try:
        with transaction.atomic():
            product = services.save_product(org_id, form, instance=product)
            services.update_image(product, request.FILES.get("image"), request.POST.get("remove_image") == "1")
    except IntegrityError: return JsonResponse({"ok": False, "error": _("SKU already exists.")}, status=409)
    return JsonResponse({"ok": True, "product": services.serialize(product)})

@require_POST
def action(request, org_id, product_id):
    member, error = access(request, org_id, write=True)
    if error is not None: return error
    product = get_object_or_404(MerchantProduct, pk=product_id, organization_id=org_id)
    choice = request.POST.get("action")
    if choice == "pin":
        if product.archived_at: return JsonResponse({"ok": False, "error": "Archived product"}, status=400)
        product = services.set_pin(org_id, product_id, True)
    elif choice == "unpin": product = services.set_pin(org_id, product_id, False)
    elif choice == "archive":
        product.archived_at = timezone.now()
        product.is_pinned = False
        product.save(update_fields=("archived_at", "is_pinned", "updated_at"))
    elif choice in ("up", "down"):
        if product.archived_at: return JsonResponse({"ok": False, "error": "Archived product"}, status=400)
        product = services.move_product(org_id, product_id, choice)
    elif choice == "restore":
        product.archived_at = None
        product.save(update_fields=("archived_at", "updated_at"))
    else: return JsonResponse({"ok": False, "error": "Invalid action"}, status=400)
    return JsonResponse({"ok": True, "product": services.serialize(product)})

@require_POST
def reorder(request, org_id):
    member, error = access(request, org_id, write=True)
    if error is not None: return error
    try:
        payload = json.loads(request.body)
        ids = payload["ids"]
        if not isinstance(ids, list) or len(ids) > 500 or not all(isinstance(x, str) for x in ids):
            raise ValueError("Invalid list")
        services.reorder_pins(org_id, ids)
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return JsonResponse({"ok": False, "error": "Invalid pinned product order"}, status=400)
    return JsonResponse({"ok": True})

@require_GET
def image(request, org_id, product_id):
    member, error = access(request, org_id)
    if error is not None:
        return error
    product = get_object_or_404(MerchantProduct, pk=product_id, organization_id=org_id)
    if not product.image:
        raise Http404
    name = product.image.name.lower()
    content_type = "image/png" if name.endswith(".png") else "image/webp" if name.endswith(".webp") else "image/jpeg"
    response = FileResponse(product.image.open("rb"), content_type=content_type)
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, max-age=60"
    return response
