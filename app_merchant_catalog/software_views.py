import hashlib
import uuid
from django.core import signing
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from app_bch_flow.financial.amounts import PaymentError, display
from app_bch_flow.financial.views import checkout_url, payment_payload_for, payment_qr_url
from app_bch_flow.views.authentication import current_identity
from .models import MerchantProduct, SoftwareRelease, SoftwareOffer, SoftwareOrder, SoftwareDownload
from .software import available_offers, downloadable, order_software
from .software_forms import ReleaseForm, OfferForm, GuestCheckoutForm
from .software_access import (GRANTS_KEY, browser_token, guest_order_filter,
                              recovery_order, recovery_url, set_guest_cookie, token_digest)
from .software_storage import SoftwareStorageError
from .views import access

SALT = 'software-download-v1'
STATE_LABELS = {'ready': _('Ready to download'), 'review': _('Under review'), 'expired': _('Payment window ended'), 'preparing': _('Preparing payment'), 'partial': _('Partially paid'), 'confirming': _('Confirming payment'), 'waiting': _('Awaiting payment')}


def private(response):
    response['Cache-Control'] = 'no-store, private'
    response['Referrer-Policy'] = 'same-origin'
    response['X-Content-Type-Options'] = 'nosniff'
    response['X-Robots-Tag'] = 'noindex, nofollow'
    return response


def decorate_offers(offers):
    for offer in offers:
        offer.price_label = display(offer.amount_units, offer.account.asset)
        offer.method_label = 'Pix' if offer.account.asset == 'BRL' else offer.account.asset
    return offers


@require_GET
def storefront(request):
    offers = decorate_offers(list(available_offers().defer('release__license_text', 'release__requirements', 'release__notes').order_by('-release__published_at')))
    products = {}
    for offer in offers:
        product = offer.release.product
        if product.pk not in products:
            products[product.pk] = {'product': product, 'release': offer.release, 'offers': []}
        if products[product.pk]['release'].pk == offer.release_id:
            products[product.pk]['offers'].append(offer)
    return render(request, 'merchant_catalog/software_store.html', {'items': products.values()})


@require_GET
def product_image(request, product_id):
    # Catalog administration is private. Only images belonging to software
    # with a currently available public offer are exposed here.
    name = available_offers().filter(release__product_id=product_id).values_list('release__product__image', flat=True).first()
    if not name:
        raise Http404
    image = MerchantProduct(image=name).image
    from .media import public_media
    if image.storage.__class__.__module__.startswith('cloudinary_storage.'):
        return public_media(image, 'image/jpeg')
    try:
        image.open('rb')
        # Cloudinary stores a public_id, usually without a file extension.
        # Inspect the bytes instead of assuming the storage key is a filename.
        header = image.read(12)
        image.seek(0)
    except OSError as exc:
        image.close()
        raise Http404 from exc
    if header.startswith(b'\x89PNG\r\n\x1a\n'):
        content_type = 'image/png'
    elif header.startswith(b'\xff\xd8\xff'):
        content_type = 'image/jpeg'
    elif header.startswith(b'RIFF') and header[8:12] == b'WEBP':
        content_type = 'image/webp'
    else:
        image.close()
        raise Http404
    response = FileResponse(image, content_type=content_type)
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'public, max-age=300'
    return response


@require_GET
def product(request, product_id):
    item = get_object_or_404(MerchantProduct, pk=product_id, archived_at__isnull=True, organization__is_active=True)
    release = item.releases.filter(offers__in=available_offers()).distinct().order_by('-published_at').first()
    if not release:
        raise Http404
    offers = decorate_offers(list(available_offers().filter(release=release)))
    buyer = current_identity(request)
    response = private(render(request, 'merchant_catalog/software_product.html', {
        'product': item, 'release': release, 'offers': offers, 'operation': uuid.uuid4(),
        'buyer': buyer, 'checkout_form': GuestCheckoutForm(),
    }))
    return set_guest_cookie(response, browser_token(request)) if buyer is None else response


@require_POST
def buy(request, offer_id):
    buyer = current_identity(request)
    token = browser_token(request) if buyer is None else ''
    form = GuestCheckoutForm(request.POST) if buyer is None else None
    if form is not None and not form.is_valid():
        return private(render(request, 'merchant_catalog/software_error.html',
                              {'error': _('Enter a valid email address to continue.')}, status=400))
    email = form.cleaned_data['email'] if form else ''
    try:
        order = order_software(buyer, offer_id, request.POST.get('operation'),
                               guest_email=email, guest_token=token)
    except SoftwareOffer.DoesNotExist:
        raise Http404 from None
    except PaymentError as exc:
        try:
            key = uuid.UUID(request.POST.get('operation', ''))
            owner = {'buyer': buyer} if buyer else {'guest__token_digest': token_digest(token)}
            order = SoftwareOrder.objects.filter(**owner, idempotency_key=key, offer_id=offer_id).first()
        except (ValueError, TypeError, AttributeError):
            order = None
        if order is None:
            return private(render(request, 'merchant_catalog/software_error.html', {'error': str(exc)}, status=400))
    response = private(redirect('bch_flow:software_order', order_id=order.pk))
    return set_guest_cookie(response, token) if buyer is None else response


def owned_order(request, order_id):
    buyer = current_identity(request)
    allowed = guest_order_filter(request)
    if buyer is not None:
        allowed |= Q(buyer=buyer)
    return get_object_or_404(SoftwareOrder.objects.select_related(
        'guest', 'payment__account', 'offer__release__product').filter(allowed), pk=order_id)


@require_GET
def recover(request, token):
    order = recovery_order(token)
    grants = dict(list(request.session.get(GRANTS_KEY, {}).items())[-49:])
    grants[str(order.pk)] = token
    request.session[GRANTS_KEY] = grants
    response = private(redirect('bch_flow:software_order', order_id=order.pk))
    response['Referrer-Policy'] = 'no-referrer'
    return response


def state(order):
    charge = order.payment
    if downloadable(order):
        return 'ready'
    if charge.account.frozen or charge.status == 'review':
        return 'review'
    if charge.expires_at <= timezone.now():
        return 'expired'
    if charge.address.startswith('pending:'):
        return 'preparing'
    if charge.received_units:
        return 'partial'
    if charge.receipts.exists():
        return 'confirming'
    return 'waiting'


@require_GET
def purchases(request):
    buyer = current_identity(request)
    allowed = guest_order_filter(request)
    if buyer is not None:
        allowed |= Q(buyer=buyer)
    orders = Paginator(SoftwareOrder.objects.filter(allowed).select_related(
        'offer__release', 'payment__account'), 20).get_page(request.GET.get('page'))
    for order in orders:
        order.delivery_state = state(order)
        order.delivery_label = STATE_LABELS[order.delivery_state]
    return private(render(request, 'merchant_catalog/software_purchases.html', {'orders': orders}))


@require_POST
def forget_guest_access(request):
    from .software_access import GUEST_COOKIE
    request.session.pop(GRANTS_KEY, None)
    response = private(redirect('bch_flow:software_purchases'))
    response.delete_cookie(GUEST_COOKIE, path='/', samesite='Lax')
    return response


@require_GET
def order_detail(request, order_id):
    order = owned_order(request, order_id)
    delivery_state = state(order)
    payload = payment_payload_for(order.payment) if delivery_state in ('waiting', 'partial', 'confirming') else ''
    return private(render(request, 'merchant_catalog/software_order.html', {
        'order': order, 'state': delivery_state, 'received': display(order.payment.received_units, order.payment.account.asset), 'amount': display(order.payment.amount_units, order.payment.account.asset),
        'recovery_url': recovery_url(request, order) if order.guest_id else '',
        'payment_url': checkout_url(order.payment),
        'payment_payload': payload,
        'payment_qr_url': payment_qr_url(order.payment) if payload else '',
    }))


@require_POST
def retry_payment(request, order_id):
    from app_bch_flow.financial import service
    order = owned_order(request, order_id)
    try:
        service.prepare_request(order.payment)
    except PaymentError:
        pass  # The saved order continues to show its actual preparation state.
    return private(redirect('bch_flow:software_order', order_id=order.pk))


@require_GET
def order_status(request, order_id):
    order = owned_order(request, order_id)
    return private(JsonResponse({'state': state(order), 'received': display(order.payment.received_units, order.payment.account.asset)}))


@require_POST
def download_link(request, order_id):
    order = owned_order(request, order_id)
    if not downloadable(order):
        return private(JsonResponse({'error': 'Payment is not confirmed for download.'}, status=409))
    token = signing.dumps({'order': str(order.pk), 'buyer': str(order.buyer_id), 'guest': str(order.guest_id)}, salt=SALT)
    return private(redirect(reverse('bch_flow:software_download', kwargs={'token': token})))


@require_GET
def download(request, token):
    try:
        data = signing.loads(token, salt=SALT, max_age=300)
        order = owned_order(request, data['order'])
        if (data['buyer'] != str(order.buyer_id) or
                (order.guest_id and data.get('guest') != str(order.guest_id)) or not downloadable(order)):
            raise Http404
    except (signing.BadSignature, KeyError, ValueError, TypeError):
        raise Http404 from None
    release = order.offer.release
    try:
        stream = release.archive.open('rb')
    except (OSError, ValueError):
        return private(render(request, 'merchant_catalog/software_error.html', {
            'error': 'Your purchase is saved. The file is temporarily unavailable; please try again or contact the seller.'}, status=503))
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
    if digest.hexdigest() != release.sha256:
        stream.close()
        return private(JsonResponse({'error': 'Package integrity verification failed. Contact the seller.'}, status=503))
    stream.seek(0)
    SoftwareDownload.objects.create(order=order)
    response = FileResponse(stream, as_attachment=True, filename=f'software-{release.version}.zip', content_type='application/zip')
    return private(response)


@require_http_methods(['GET', 'POST'])
def publish(request, org_id, product_id):
    member, error = access(request, org_id, write=True)
    if error is not None:
        return error
    item = get_object_or_404(MerchantProduct, pk=product_id, organization_id=org_id, archived_at__isnull=True)
    form = ReleaseForm(request.POST or None, request.FILES or None, organization=member.organization)
    if request.method == 'POST' and form.is_valid():
        data = form.cleaned_data
        try:
            with transaction.atomic():
                locked = MerchantProduct.objects.select_for_update().get(pk=item.pk)
                if locked.archived_at or SoftwareRelease.objects.filter(product=item, version=data['version']).exists():
                    raise IntegrityError('Unavailable product or duplicate release')
                release = SoftwareRelease.objects.create(product=item, version=data['version'], archive=data['archive'],
                    sha256=form.archive_digest, size_bytes=data['archive'].size, requirements=data['requirements'],
                    license_text=data['license_text'], notes=data['notes'])
                SoftwareOffer.objects.create(release=release, account=data['account'], seller=member.identity, amount_units=data['amount_units'])
        except SoftwareStorageError as exc:
            form.add_error('archive', str(exc))
        except IntegrityError:
            form.add_error('version', 'This version already exists. Publish a new version instead.')
        else:
            return redirect('bch_flow:software_product', product_id=item.pk)
    return private(render(request, 'merchant_catalog/software_publish.html', {'form': form, 'product': item, 'member': member}))


@require_http_methods(['GET', 'POST'])
def add_offer(request, org_id, release_id):
    member, error = access(request, org_id, write=True)
    if error is not None:
        return error
    release = get_object_or_404(SoftwareRelease, pk=release_id, product__organization_id=org_id)
    form = OfferForm(request.POST or None, organization=member.organization)
    if request.method == 'POST' and form.is_valid():
        try:
            SoftwareOffer.objects.create(release=release, account=form.cleaned_data['account'], seller=member.identity,
                amount_units=form.cleaned_data['amount_units'])
        except IntegrityError:
            form.add_error('account', 'This release already has an offer for this account.')
        else:
            return redirect('bch_flow:software_product', product_id=release.product_id)
    return private(render(request, 'merchant_catalog/software_publish.html', {'form': form, 'product': release.product, 'member': member, 'adding_offer': True}))


@require_GET
def sales(request, org_id):
    member, error = access(request, org_id)
    if error is not None:
        return error
    orders = Paginator(SoftwareOrder.objects.filter(payment__account__organization_id=org_id).select_related(
        'buyer', 'offer__release', 'payment__account').order_by('-created_at'), 20).get_page(request.GET.get('page'))
    for order in orders:
        order.delivery_label = STATE_LABELS[state(order)]
        order.amount_label = display(order.payment.amount_units, order.payment.account.asset)
    return private(render(request, 'merchant_catalog/software_sales.html', {'orders': orders, 'member': member}))


@require_GET
def product_video(request, product_id):
    name = available_offers().filter(release__product_id=product_id).values_list('release__product__video',flat=True).first()
    if not name:
        raise Http404
    from .media import public_media
    return public_media(MerchantProduct(video=name).video,'video/mp4',request)
