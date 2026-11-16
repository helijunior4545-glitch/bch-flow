"""Software commerce uses authoritative ledger evidence, never browser assertions."""
import hashlib
import stat
import uuid
import zipfile
from pathlib import PurePosixPath
from django.core.exceptions import ValidationError
from django.db import transaction
from app_bch_flow.financial import service
from app_bch_flow.financial.amounts import PaymentError
from app_bch_flow.models import BCHIdentity
from .models import MerchantProduct, SoftwareOffer, SoftwareOrder

MAX_ARCHIVE = 100 * 1024 * 1024


def inspect_archive(upload):
    if not upload or not upload.name.lower().endswith('.zip') or not 0 < upload.size <= MAX_ARCHIVE:
        raise ValidationError('Upload a ZIP file up to 100 MB.')
    try:
        with zipfile.ZipFile(upload) as archive:
            entries = archive.infolist()
            if not entries or len(entries) > 10000 or sum(i.file_size for i in entries) > 500 * 1024 * 1024:
                raise ValidationError('Archive is empty or exceeds expanded size limits.')
            names = set()
            for item in entries:
                path = PurePosixPath(item.filename)
                if (path.is_absolute() or '..' in path.parts or '\\' in item.filename
                        or ':' in item.filename or item.flag_bits & 1
                        or stat.S_ISLNK(item.external_attr >> 16)):
                    raise ValidationError('Unsafe paths, symlinks or encrypted files are not supported.')
                if not item.is_dir() and item.file_size > 0:
                    names.add(path.name.lower())
            if 'readme.md' not in names or 'license.txt' not in names:
                raise ValidationError('Include README.md and LICENSE.txt in the package.')
            if archive.testzip() is not None:
                raise ValidationError('Archive integrity check failed.')
    except (zipfile.BadZipFile, RuntimeError, NotImplementedError, OSError) as exc:
        raise ValidationError('Invalid or unsupported ZIP archive.') from exc
    finally:
        upload.seek(0)
    digest = hashlib.sha256()
    for chunk in upload.chunks():
        digest.update(chunk)
    upload.seek(0)
    return digest.hexdigest()


def available_offers():
    return SoftwareOffer.objects.select_related('release__product__organization', 'account').filter(
        active=True, release__product__archived_at__isnull=True,
        release__product__organization__is_active=True, account__environment='live',
        account__asset__in=('BTC', 'BCH', 'BRL'), account__frozen=False,
    )


def order_software(buyer, offer_id, key):
    try:
        key = uuid.UUID(str(key))
    except (ValueError, TypeError, AttributeError):
        raise PaymentError('Invalid checkout operation. Reload the product page.') from None
    with transaction.atomic():
        # Serialize double clicks across accounts and products for the same buyer.
        buyer = BCHIdentity.objects.select_for_update().get(pk=buyer.pk, is_active=True)
        if buyer.is_demo:
            raise PaymentError('Demo accounts cannot purchase software.')
        order = SoftwareOrder.objects.select_related('payment__account').filter(buyer=buyer, idempotency_key=key).first()
        if order:
            if str(order.offer_id) != str(offer_id):
                raise PaymentError('This operation was already used for a different offer.')
        else:
            offer = available_offers().select_for_update(of=('self',)).get(pk=offer_id)
            # Serialize archive/publish changes with order creation.
            product = MerchantProduct.objects.select_for_update().get(pk=offer.release.product_id)
            if product.archived_at or offer.account.organization_id != product.organization_id:
                raise PaymentError('This software is no longer available.')
            charge = service.create_request(offer.seller, offer.account, offer.amount_units,
                product.name[:160], 'software-' + key.hex, buyer.email)
            order = SoftwareOrder.objects.create(buyer=buyer, offer=offer, payment=charge,
                idempotency_key=key, product_name=product.name, license_text=offer.release.license_text)
    # Persist the order before external I/O. Retrying uses the same provider key.
    service.prepare_request(order.payment)
    return order


def downloadable(order):
    return service.confirmed_payment(order.payment)
