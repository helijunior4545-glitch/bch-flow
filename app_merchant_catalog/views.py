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
from .media import validate_video, save_preview, stage_visual, delete_preview
from .upload_limits import bounded_upload
from .software_forms import SoftwareProductForm

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
        "wallet_home_url": None, "software_form": SoftwareProductForm(organization=member.organization)})

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
        validate_video(request.FILES.get("video"))
    except ValidationError as exc:
        return JsonResponse({"ok": False, "error": "; ".join(exc.messages)}, status=400)
    try:
        with transaction.atomic():
            product = services.save_product(org_id, form)
            services.update_image(product, request.FILES.get("image"))
    except IntegrityError: return JsonResponse({"ok": False, "error": _("SKU already exists.")}, status=409)
    return JsonResponse({"ok": True, "product": services.serialize(product)}, status=201)

@require_POST
@bounded_upload
def update(request, org_id, product_id):
    from .software_forms import ReleaseForm
    from .models import SoftwareRelease,SoftwareOffer
    from .software_storage import SoftwareStorageError
    member, error = access(request, org_id, write=True)
    if error is not None: return error
    product = get_object_or_404(MerchantProduct, pk=product_id, organization_id=org_id)
    release_form = None
    post = request.POST.copy()
    if request.FILES.get('archive'):
        release_form=ReleaseForm(post,request.FILES,organization=member.organization)
        if not release_form.is_valid():
            return JsonResponse({'ok':False,'errors':release_form.errors.get_json_data()},status=400)
        post['currency']=release_form.cleaned_data['account'].asset
    form = ProductForm(post, instance=product)
    if not form.is_valid(): return JsonResponse({'ok':False,'errors':form.errors.get_json_data()},status=400)
    image,video=request.FILES.get('image'),request.FILES.get('video')
    try:
        services.validate_image(image);validate_video(video)
        if image and video:raise ValidationError(_('Choose either an image or a video, not both.'))
        if video:
            from .video_processing import normalize_video
            video=normalize_video(video)
    except ValidationError as exc:
        return JsonResponse({'ok':False,'error':'; '.join(exc.messages)},status=400)
    old={key:(getattr(product,key).storage,getattr(product,key).name) for key in ('image','video')}
    uploaded=[]
    try:
        changes,staged=stage_visual(product,image,video,post.get('remove_image')=='1',post.get('remove_video')=='1')
        uploaded.extend(staged)
        release=None
        if release_form:
            data=release_form.cleaned_data
            release=SoftwareRelease(product=product,version=data['version'],sha256=release_form.archive_digest,
                size_bytes=data['archive'].size,requirements=data['requirements'],license_text=data['license_text'],notes=data['notes'])
            release.archive.save(data['archive'].name,data['archive'],save=False)
            uploaded.append((release.archive.storage,release.archive.name))
        with transaction.atomic():
            from app_bch_flow.models import BCHOrganization,FlowAccount
            BCHOrganization.objects.select_for_update().get(pk=org_id)
            current=MerchantProduct.objects.select_for_update().get(pk=product_id,organization_id=org_id)
            # Delete the actual replaced file, including concurrent edits.
            old={key:(getattr(current,key).storage,getattr(current,key).name) for key in ('image','video')}
            for key in ('name','sku','description','price','currency'):setattr(current,key,form.cleaned_data[key])
            for key,value in changes.items():setattr(current,key,value)
            if release:
                if current.archived_at:raise ValidationError(_('Restore the software before publishing a version.'))
                account=FlowAccount.objects.select_for_update().get(pk=data['account'].pk,organization_id=org_id,environment='live',frozen=False,asset=data['account'].asset)
                release.product=current;release.save()
                SoftwareOffer.objects.create(release=release,account=account,seller=member.identity,amount_units=data['amount_units'])
            current.save()
            for key in changes:
                storage,name=old[key]
                if name and name!=getattr(current,key).name:
                    transaction.on_commit(lambda storage=storage,name=name:delete_preview(storage,name),robust=True)
        product=current
    except Exception as exc:
        for storage,name in uploaded:
            try:delete_preview(storage,name)
            except Exception:pass
        if isinstance(exc,IntegrityError):
            return JsonResponse({'ok':False,'error':_('SKU or version already exists.')},status=409)
        if isinstance(exc,ValidationError):
            return JsonResponse({'ok':False,'error':'; '.join(exc.messages)},status=400)
        from app_bch_flow.models import FlowAccount
        if isinstance(exc,FlowAccount.DoesNotExist):
            return JsonResponse({'ok':False,'error':_('The receiving account is no longer available.')},status=400)
        if isinstance(exc,(OSError,SoftwareStorageError)):
            return JsonResponse({'ok':False,'error':_('The software files could not be stored. Please retry.')},status=503)
        raise
    return JsonResponse({'ok':True,'product':services.serialize(product),'media_processed':bool(video),'media_message':_('Video optimized: the first 20 seconds at most, resized and without audio.') if video else ''})

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


@require_POST
@bounded_upload
def create_software(request, org_id):
    """Catalog UI uses this; legacy product creation stays available to the wallet."""
    from .models import SoftwareRelease, SoftwareOffer
    from .software_storage import SoftwareStorageError
    member, error = access(request, org_id, write=True)
    if error is not None: return error
    form = SoftwareProductForm(request.POST, request.FILES, organization=member.organization)
    if not form.is_valid():
        return JsonResponse({'ok':False,'errors':form.errors.get_json_data()},status=400)
    data = form.cleaned_data
    saved_files = []
    product = MerchantProduct(organization_id=org_id, name=data['name'],sku=data['sku'],
        description=data['description'],price=data['price'],currency=data['account'].asset)
    release = SoftwareRelease(product=product, version=data['version'],
        sha256=form.archive_digest,size_bytes=data['archive'].size,requirements=data['requirements'],
        license_text=data['license_text'],notes=data['notes'])
    try:
        # Stage remote uploads before acquiring tenant/database locks. Publish all
        # database records together only after every file is safely stored.
        import uuid
        if data.get('image'):
            ext = services.validate_image(data['image'])
            save_preview(product.image,f'{uuid.uuid4().hex}.{ext}',data['image'])
            saved_files.append((product.image.storage,product.image.name))
        if data.get('video'):
            save_preview(product.video,f'{uuid.uuid4().hex}.mp4',data['video'])
            saved_files.append((product.video.storage,product.video.name))
        release.archive.save(data['archive'].name,data['archive'],save=False)
        saved_files.append((release.archive.storage,release.archive.name))
        with transaction.atomic():
            from app_bch_flow.models import BCHOrganization, FlowAccount
            from django.db.models import Max
            BCHOrganization.objects.select_for_update().get(pk=org_id)
            account = FlowAccount.objects.select_for_update().get(pk=data['account'].pk, organization_id=org_id, frozen=False, environment='live',asset=data['account'].asset)
            product.position = (MerchantProduct.objects.filter(organization_id=org_id).aggregate(value=Max('position'))['value'] or 0)+1
            product.save()
            release.save()
            SoftwareOffer.objects.create(release=release,account=account,seller=member.identity,amount_units=data['amount_units'])
    except Exception as exc:
        for storage,name in saved_files:
            try: storage.delete(name)
            except Exception:
                import logging
                logging.getLogger(__name__).warning('Software upload cleanup failed for %s',storage.__class__.__name__)
        if isinstance(exc, IntegrityError):
            return JsonResponse({'ok':False,'error':_('SKU already exists.')},status=409)
        from app_bch_flow.models import FlowAccount
        if isinstance(exc, FlowAccount.DoesNotExist):
            return JsonResponse({'ok':False,'error':_('The receiving account is no longer available.')},status=400)
        if isinstance(exc, (SoftwareStorageError, OSError)):
            return JsonResponse({'ok':False,'error':_('The software files could not be stored. Please retry.')},status=503)
        raise
    return JsonResponse({'ok':True,'product':services.serialize(product),'media_processed':bool(data.get('video')),'media_message':_('Video optimized: the first 20 seconds at most, resized and without audio.') if data.get('video') else ''},status=201)


@require_GET
def video_preview(request, org_id, product_id):
    member,error=access(request,org_id)
    if error is not None:return error
    product=get_object_or_404(MerchantProduct,pk=product_id,organization_id=org_id)
    if not product.video:raise Http404
    from .media import public_media
    response=public_media(product.video,'video/mp4',request)
    response['Cache-Control']='private, no-store'
    return response
