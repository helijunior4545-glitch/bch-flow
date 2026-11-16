import hashlib
import uuid
from django.core import signing
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from app_bch_flow.financial.amounts import PaymentError, display
from app_bch_flow.financial.views import checkout_url
from app_bch_flow.views.authentication import current_identity
from .models import MerchantProduct, SoftwareRelease, SoftwareOffer, SoftwareOrder, SoftwareDownload
from .software import available_offers, downloadable, order_software
from .software_forms import ReleaseForm, OfferForm
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
    offers = decorate_offers(list(available_offers().order_by('-release__published_at')))
    products = {}
    for offer in offers:
        product = offer.release.product
        if product.pk not in products:
            products[product.pk] = {'product': product, 'release': offer.release, 'offers': []}
        if products[product.pk]['release'].pk == offer.release_id:
            products[product.pk]['offers'].append(offer)
    return render(request, 'merchant_catalog/software_store.html', {'items': products.values()})


@require_GET
def product(request, product_id):
    item = get_object_or_404(MerchantProduct, pk=product_id, archived_at__isnull=True, organization__is_active=True)
    release = item.releases.filter(offers__in=available_offers()).distinct().order_by('-published_at').first()
    if not release:
        raise Http404
    offers = decorate_offers(list(available_offers().filter(release=release)))
    return private(render(request, 'merchant_catalog/software_product.html', {
        'product': item, 'release': release, 'offers': offers, 'operation': uuid.uuid4(),
        'buyer': current_identity(request),
    }))


@require_POST
def buy(request, offer_id):
    buyer = current_identity(request)
    if buyer is None:
        return redirect('bch_flow:login')
    try:
        order = order_software(buyer, offer_id, request.POST.get('operation'))
    except SoftwareOffer.DoesNotExist:
        raise Http404 from None
    except PaymentError as exc:
        try:
            key = uuid.UUID(request.POST.get('operation', ''))
            order = SoftwareOrder.objects.filter(buyer=buyer, idempotency_key=key, offer_id=offer_id).first()
        except (ValueError, TypeError, AttributeError):
            order = None
        if order:
            # Remote timeouts retain a recoverable purchase, never create another charge.
            return redirect('bch_flow:software_order', order_id=order.pk)
        return private(render(request, 'merchant_catalog/software_error.html', {'error': str(exc)}, status=400))
    return redirect('bch_flow:software_order', order_id=order.pk)


def owned_order(request, order_id):
    buyer = current_identity(request)
    if buyer is None:
        raise Http404
    return get_object_or_404(SoftwareOrder.objects.select_related('payment__account', 'offer__release__product'), pk=order_id, buyer=buyer)


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
    if buyer is None:
        return redirect('bch_flow:login')
    orders = Paginator(SoftwareOrder.objects.filter(buyer=buyer).select_related('offer__release', 'payment__account'), 20).get_page(request.GET.get('page'))
    for order in orders:
        order.delivery_state = state(order)
        order.delivery_label = STATE_LABELS[order.delivery_state]
    return private(render(request, 'merchant_catalog/software_purchases.html', {'orders': orders}))


@require_GET
def order_detail(request, order_id):
    order = owned_order(request, order_id)
    return private(render(request, 'merchant_catalog/software_order.html', {
        'order': order, 'state': state(order), 'received': display(order.payment.received_units, order.payment.account.asset), 'amount': display(order.payment.amount_units, order.payment.account.asset),
        'payment_url': checkout_url(order.payment),
    }))


@require_GET
def order_status(request, order_id):
    order = owned_order(request, order_id)
    return private(JsonResponse({'state': state(order), 'received': display(order.payment.received_units, order.payment.account.asset)}))


@require_POST
def download_link(request, order_id):
    order = owned_order(request, order_id)
    if not downloadable(order):
        return private(JsonResponse({'error': 'Payment is not confirmed for download.'}, status=409))
    token = signing.dumps({'order': str(order.pk), 'buyer': str(order.buyer_id)}, salt=SALT)
    return private(redirect(reverse('bch_flow:software_download', kwargs={'token': token})))


@require_GET
def download(request, token):
    try:
        data = signing.loads(token, salt=SALT, max_age=300)
        order = owned_order(request, data['order'])
        if data['buyer'] != str(order.buyer_id) or not downloadable(order):
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
