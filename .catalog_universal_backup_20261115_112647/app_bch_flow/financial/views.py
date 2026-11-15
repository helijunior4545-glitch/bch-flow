from app_bch_flow.wallets.wizardconnect.protocol import relay_urls
from django.utils.translation import gettext_lazy as _
import uuid
from urllib.parse import urlencode
from django.core import signing
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import Http404, JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from app_bch_flow.models import (
    BCHMembership,
    FlowAccount,
    FlowRequest,
    FlowWithdrawal,
    FlowInbox,
    FlowNodeConnection,
)
from app_bch_flow.views.authentication import current_identity
from . import service
from .amounts import PaymentError, ProviderUnavailable, display, units
from .forms import RequestForm, WithdrawalForm
from .assets import ASSET_INFO, SANDBOX_ONLY
from .providers import validate_mp_signature

from app_bch_flow.identity.demo_credentials import DEMO_PASSWORD

SALT = "flow-payment-checkout-v1"
LABELS = {
    "sandbox": _("Sandbox · no real money"),
    "testnet": _("Test network · no monetary value"),
    "mercadopago_test": _("Mercado Pago · test credentials"),
    "live": _("Production · real payments"),
}


STATUS_LABELS = {
    "open": _("Awaiting payment"),
    "partial": _("Partially received"),
    "paid": _("Received"),
    "overpaid": _("Overpaid"),
    "expired": _("Expired"),
    "review": _("Under review"),
    "pending": _("Awaiting authorization"),
    "approved": _("Authorized"),
    "submitting": _("Broadcasting"),
    "submitted": _("Broadcast"),
    "cancelled": _("Cancelled"),
    "unknown": _("Verification pending"),
}


def _member(request, org_id):
    identity = current_identity(request)
    if identity is None:
        return None
    return get_object_or_404(
        BCHMembership.objects.select_related("organization", "identity"),
        identity=identity,
        organization_id=org_id,
        is_active=True,
        organization__is_active=True,
        role__in=("owner", "admin", "operator", "viewer"),
    )


def _url(member, asset, environment, wallet=None):
    return (
        reverse("bch_flow:financial_home", args=[member.organization_id])
        + "?"
        + urlencode({"asset": asset, "environment": environment, **({"wallet": str(wallet)} if wallet else {})})
    )


def _amounts(records, asset):
    for record in records:
        record.formatted_amount = display(record.amount_units, asset)
        if hasattr(record, "status"):
            record.friendly_status = STATUS_LABELS.get(record.status, record.status)
        if hasattr(record, "fee_limit_units"):
            record.formatted_fee_limit = display(record.fee_limit_units, asset)
            record.formatted_reservation = display(
                record.amount_units + record.fee_limit_units, asset
            )
    return records


@never_cache
@sensitive_post_parameters("password", "raw_transaction")
@require_http_methods(["GET", "POST"])
def home(request, org_id):
    member = _member(request, org_id)
    if member is None:
        return redirect("bch_flow:login")
    asset = request.GET.get("asset", "BCH")
    environment = request.GET.get("environment", "live")
    if member.identity.is_demo and environment != 'sandbox':
        if request.method == 'POST':
            return HttpResponse(_('Demo accounts can only use the sandbox.'), status=403)
        return redirect(_url(member, asset if asset in ('BTC', 'BCH', 'BRL') else 'BCH', 'sandbox'))
    if asset not in ("BTC", "BCH", "BRL") or environment not in LABELS:
        raise Http404
    if asset in SANDBOX_ONLY and environment != "sandbox":
        raise Http404
    wallet_scope = FlowNodeConnection.objects.filter(organization_id=org_id, asset=asset, environment=environment)
    wallets = wallet_scope.filter(archived_at__isnull=True).select_related('account').order_by('created_at')
    selected_wallet = None
    wallet_id = request.GET.get('wallet') if environment == 'live' else None
    if wallet_id and wallet_id != 'legacy':
        try:
            wallet_uuid = uuid.UUID(wallet_id)
        except (ValueError, TypeError):
            raise Http404
        selected_wallet = get_object_or_404(wallet_scope, pk=wallet_uuid)
    elif wallet_id != 'legacy':
        selected_wallet = wallets.first()
    legacy_account = FlowAccount.objects.filter(organization_id=org_id, asset=asset, environment=environment, wallet__isnull=True).first()
    account = FlowAccount.objects.filter(
        organization_id=org_id, asset=asset, environment=environment, wallet=selected_wallet
    ).first()
    selected_wallet_id = selected_wallet.pk if selected_wallet else ('legacy' if legacy_account else None)
    wallet_readonly = bool(selected_wallet and selected_wallet.archived_at)
    error, notice = "", ""
    rf = RequestForm(asset=asset, prefix="receive", initial={"key": uuid.uuid4().hex})
    wf = WithdrawalForm(asset=asset, prefix="send", initial={"key": uuid.uuid4().hex})
    if request.method == "POST":
        action = request.POST.get("action")
        try:
            if wallet_readonly:
                raise PaymentError(_("This wallet is archived. Restore it before creating operations."))
            # Presentation permissions must also be enforced on POST, not only in templates.
            if action in ("request", "withdraw") and member.role not in service.WRITE_ROLES:
                raise PaymentError(_("You are not authorized to create financial operations."))
            if action in ("approve", "submit", "cancel", "recover", "prepare_send") and member.role not in service.APPROVE_ROLES:
                raise PaymentError(_("You are not authorized to manage withdrawals."))
            if action == "request":
                rf = RequestForm(request.POST, asset=asset, prefix="receive")
                if rf.is_valid():
                    account = service.ensure_account(
                        member.identity, org_id, asset, environment, wallet_id=selected_wallet_id
                    )
                    from app_merchant_catalog.models import MerchantProduct, ReceiptProductSnapshot
                    from decimal import Decimal
                    from django.db import transaction as db_transaction
                    product_id = request.POST.get("catalog_product_id", "").strip()
                    with db_transaction.atomic():
                        product = None
                        if product_id:
                            try:
                                product = MerchantProduct.objects.get(
                                    pk=uuid.UUID(product_id), organization_id=org_id,
                                    archived_at__isnull=True, currency=asset,
                                )
                            except (MerchantProduct.DoesNotExist, ValueError, TypeError):
                                raise PaymentError(_("Selected product is unavailable for this currency."))
                            if rf.cleaned_data["amount"] != units(str(product.price), asset):
                                raise PaymentError(_("The selected product price changed. Select it again."))
                        existing = FlowRequest.objects.filter(account=account, idempotency_key=rf.cleaned_data["key"]).first()
                        if existing:
                            saved = ReceiptProductSnapshot.objects.filter(request=existing).first()
                            if (saved is None) != (product is None) or (saved and (saved.product_id != product.pk or saved.name != product.name or saved.price != product.price)):
                                raise PaymentError(_("This request key was already used with different product details."))
                        charge = service.create_request(
                            member.identity, account, rf.cleaned_data["amount"],
                            rf.cleaned_data["description"], rf.cleaned_data["key"],
                            rf.cleaned_data["payer_email"],
                        )
                        if product and not existing:
                            ReceiptProductSnapshot.objects.create(
                                request=charge, product=product, name=product.name, sku=product.sku,
                                description=product.description, currency=product.currency, price=product.price,
                            )
                    # A request survives a remote timeout and can be prepared again.
                    try:
                        service.prepare_request(charge)
                    except ProviderUnavailable:
                        pass
                    return redirect(
                        "bch_flow:financial_request",
                        org_id=org_id,
                        request_id=charge.pk,
                    )
            elif action == "withdraw":
                wf = WithdrawalForm(request.POST, asset=asset, prefix="send")
                if wf.is_valid():
                    if account is None:
                        raise PaymentError(_("This account has no receipts yet."))
                    service.create_withdrawal(
                        member.identity,
                        account,
                        wf.cleaned_data["destination"],
                        wf.cleaned_data["amount"],
                        wf.cleaned_data["fee_limit"],
                        wf.cleaned_data["key"],
                    )
                    return redirect(_url(member, asset, environment, selected_wallet_id))
            elif action in ("approve", "submit", "cancel", "recover", "prepare_send"):
                withdrawal = get_object_or_404(
                    FlowWithdrawal.objects.select_related("account"),
                    pk=request.POST.get("withdrawal"),
                    account=account,
                    account__organization_id=org_id,
                    account__asset=asset,
                    account__environment=environment,
                )
                if action == "prepare_send":
                    service.prepare_signing(member.identity, withdrawal)
                elif action == "approve":
                    service.approve_withdrawal(
                        member.identity, withdrawal, request.POST.get("password", "")
                    )
                elif action == "submit":
                    service.submit_withdrawal(
                        member.identity,
                        withdrawal,
                        request.POST.get("raw_transaction", ""),
                    )
                elif action == "recover":
                    service.recover_withdrawal(member.identity, withdrawal)
                else:
                    service.cancel_withdrawal(member.identity, withdrawal)
                return redirect(_url(member, asset, environment, selected_wallet_id))
            else:
                raise PaymentError(_("Invalid operation."))
        except PaymentError as exc:
            error = str(exc)
        except (IntegrityError, ValueError, ValidationError):
            error = _("The operation conflicted with another record. Refresh and check its status before retrying.")
    if account:
        account.refresh_from_db()
    requests = (
        _amounts(list(account.requests.order_by("-created_at")[:20]), asset)
        if account
        else []
    )
    withdrawals = (
        _amounts(list(account.withdrawals.order_by("-created_at")[:20]), asset)
        if account
        else []
    )
    journal = (
        _amounts(list(account.journal.order_by("-created_at")[:30]), asset)
        if account
        else []
    )
    active_request = next((charge for charge in requests if payment_payload_for(charge)), None)
    if active_request:
        active_request.checkout_token = signing.dumps({'request': str(active_request.pk)}, salt=SALT)
    chipnet_observation = None
    if request.method == "GET" and asset == "BCH" and environment == "testnet":
        # Chipnet watch-only data: never credit FlowAccount from this observation.
        from app_bch_flow.financial.chipnet_balance_v52 import observe_chipnet_balance
        chipnet_observation = observe_chipnet_balance()
    return render(
        request,
        "app_bch_flow/financial/home.html",
        {
            "member": member,
            "wizard_relays": relay_urls(),
            "wallets": wallets,
            "wallet_home_url": _url(member, asset, environment, selected_wallet_id),
            "selected_wallet": selected_wallet,
            "legacy_account": legacy_account,
            "wallet_readonly": wallet_readonly,
            "chipnet_observation": chipnet_observation,
            "asset_options": [
                {"code": code, **meta} for code, meta in ASSET_INFO.items()
                if code in ("BTC", "BCH", "BRL")
            ],
            "sandbox_only": asset in SANDBOX_ONLY or member.identity.is_demo,
            "is_demo": member.identity.is_demo,
            "demo_password": DEMO_PASSWORD if member.identity.is_demo else '',
            "asset": asset,
            "environment": environment,
            "environment_label": LABELS[environment],
            "account": account,
            "available": display(account.available_units if account else 0, asset),
            "reserved": display(account.reserved_units if account else 0, asset),
            "requests": requests,
            "active_request": active_request,
            "withdrawals": withdrawals,
            "journal": journal,
            "request_form": rf,
            "withdrawal_form": wf,
            "error": error,
            "notice": notice,
            "can_write": member.role in service.WRITE_ROLES and not wallet_readonly,
            "can_approve": member.role in service.APPROVE_ROLES and not wallet_readonly,
            "is_sandbox": environment == "sandbox",
        },
        status=400 if error else 200,
    )


def checkout_url(charge):
    token = signing.dumps({"request": str(charge.pk)}, salt=SALT)
    return reverse("bch_flow:financial_checkout", args=[token])


@never_cache
@require_http_methods(["GET", "POST"])
def request_detail(request, org_id, request_id):
    member = _member(request, org_id)
    if member is None:
        return redirect("bch_flow:login")
    charge = get_object_or_404(
        FlowRequest.objects.select_related("account"),
        pk=request_id,
        account__organization_id=org_id,
    )
    error = ""
    if request.method == "POST":
        try:
            service.membership(member.identity, org_id)
            action = request.POST.get("action")
            if action == "simulate" and member.role not in service.WRITE_ROLES:
                raise PaymentError(_("You are not authorized to simulate receipts."))
            if action in ("refresh", "prepare") and member.role not in service.WRITE_ROLES:
                raise PaymentError(_("You are not authorized to modify payment requests."))
            if action == "simulate":
                service.simulate_receipt(
                    member.identity,
                    charge,
                    units(request.POST.get("amount", ""), charge.account.asset),
                    request.POST.get("key", ""),
                )
            elif action == "refresh":
                txid = request.POST.get("txid", "").strip()
                if charge.account.asset in ('BTC', 'BCH') and not txid and charge.account.environment != 'sandbox':
                    from .worker import sync_crypto
                    sync_crypto(charge.account)
                else:
                    service.reconcile_request(charge, txid or None)
            elif action == "prepare":
                service.prepare_request(charge)
            else:
                raise PaymentError(_("Invalid operation."))
            return redirect(
                "bch_flow:financial_request", org_id=org_id, request_id=request_id
            )
        except PaymentError as exc:
            error = str(exc)
        except IntegrityError:
            error = (
                _("This payment was already recorded. Check the history before retrying.")
            )
    charge.refresh_from_db()
    return render(
        request,
        "app_bch_flow/financial/request.html",
        {
            "member": member,
            "wallet_home_url": _url(member, charge.account.asset, charge.account.environment, charge.account.wallet_id or "legacy"),
            "charge": charge,
            "status_label": STATUS_LABELS.get(charge.status, charge.status),
            "amount": display(charge.amount_units, charge.account.asset),
            "received": display(charge.received_units, charge.account.asset),
            "error": error,
            "checkout_url": checkout_url(charge),
            # BTC-only presentation data; BCH and Pix retain their existing payloads.
            "btc_receive_address": (
                charge.address
                if charge.account.asset == "BTC"
                and charge.account.environment != "sandbox"
                and not charge.address.startswith("pending:")
                else ""
            ),
            "btc_payment_uri": (
                payment_payload_for(charge)
                if charge.account.asset == "BTC" and charge.account.environment != "sandbox"
                else ""
            ),
            "operation_key": uuid.uuid4().hex,
            "environment_label": LABELS[charge.account.environment],
            "is_sandbox": charge.account.environment == "sandbox",
            "can_write": member.role in service.WRITE_ROLES,
        },
        status=400 if error else 200,
    )


def _public_charge(token):
    try:
        payload = signing.loads(token, salt=SALT, max_age=86400)
        return get_object_or_404(
            FlowRequest.objects.select_related("account__organization"),
            pk=payload["request"],
            account__organization__is_active=True,
        )
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        raise Http404 from None


def _secure(response):
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    response["X-Robots-Tag"] = "noindex, nofollow"
    response["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    )
    return response


@require_GET
def checkout(request, token):
    charge = _public_charge(token)
    from django.utils import timezone

    expired = charge.expires_at <= timezone.now()
    payload = payment_payload_for(charge)
    return _secure(
        render(
            request,
            "app_bch_flow/financial/checkout.html",
            {
                "charge": charge,
                "status_label": STATUS_LABELS.get(charge.status, charge.status),
                "amount": display(charge.amount_units, charge.account.asset),
                "received": display(charge.received_units, charge.account.asset),
                "remaining": display(
                    max(0, charge.amount_units - charge.received_units),
                    charge.account.asset,
                ),
                "payment_payload": payload,
                "btc_receive_address": (
                    charge.address
                    if charge.account.asset == "BTC"
                    and charge.account.environment != "sandbox"
                    and not charge.address.startswith("pending:")
                    else ""
                ),
                "btc_payment_uri": payload
                if charge.account.asset == "BTC" and charge.account.environment != "sandbox"
                else "",
                "token": token,
                "expired": expired,
                "environment_label": LABELS[charge.account.environment],
                "is_sandbox": charge.account.environment == "sandbox",
            },
        )
    )


@require_GET
def checkout_status(request, token):
    charge = _public_charge(token)
    from django.utils import timezone

    return _secure(
        JsonResponse(
            {
                "status": charge.status,
                "environment": charge.account.environment,
                "asset": charge.account.asset,
                "amount": display(charge.amount_units, charge.account.asset),
                "received": display(charge.received_units, charge.account.asset),
                "expired": charge.expires_at <= timezone.now(),
                "simulated": charge.account.environment == "sandbox",
            }
        )
    )


@csrf_exempt
@require_POST
def mercado_webhook(request, org_id, environment):
    if len(request.body) > 16384 or len(request.GET.getlist("data.id")) != 1:
        return JsonResponse({"error": "invalid_notification"}, status=400)
    resource = request.GET.get("data.id", "")
    if not resource or len(resource) > 256:
        return JsonResponse({"error": "invalid_notification"}, status=400)
    if environment not in ("mercadopago_test", "live"):
        return JsonResponse({"error": "invalid_environment"}, status=400)
    # Config is keyed by organization. Signature selects no payer-supplied account.
    account = FlowAccount.objects.filter(
        organization_id=org_id, asset="BRL", environment=environment
    ).first()
    if account is None:
        return JsonResponse({"error": "not_configured"}, status=503)
    try:
        from .integrations import merchant_webhook_secret

        secret = merchant_webhook_secret(account)
        validate_mp_signature(
            request.headers.get("x-signature"),
            request.headers.get("x-request-id"),
            resource,
            secret,
        )
        with transaction.atomic():
            inbox, _created_or_unused = (
                FlowInbox.objects.select_for_update().get_or_create(
                    organization_id=org_id,
                    environment=environment,
                    resource_id=resource,
                )
            )
            if inbox.status in ("done", "failed"):
                inbox.status, inbox.attempts = "pending", 0
                inbox.save(update_fields=["status", "attempts", "updated_at"])
    except ProviderUnavailable:
        return JsonResponse({"error": "provider_not_ready"}, status=503)
    except PaymentError:
        return JsonResponse({"error": "invalid_signature"}, status=401)
    return JsonResponse({"accepted": True})


def payment_payload_for(charge):
    from django.utils import timezone

    if (
        charge.expires_at <= timezone.now()
        or charge.status in ("paid", "overpaid", "review")
        or not charge.address
        or charge.address.startswith("pending:")
    ):
        return ""
    if charge.account.asset == "BTC" and charge.account.environment != "sandbox":
        # BIP-21: the QR contains a payment URI, not a private key or signing data.
        # Never issue a zero-amount request or silently substitute a new address.
        remaining = charge.amount_units - charge.received_units
        if remaining <= 0:
            return ""
        return "bitcoin:" + charge.address + "?" + urlencode(
            {"amount": display(remaining, "BTC")}
        )
    if charge.account.asset == "BCH" and charge.account.environment != "sandbox":
        # Preserve the legacy BCH payload exactly as previously generated.
        return charge.address + "?amount=" + display(
            max(0, charge.amount_units - charge.received_units), "BCH"
        )
    return charge.payment_payload


@require_GET
def qr(request, token):
    charge = _public_charge(token)
    payload = payment_payload_for(charge)
    if not payload:
        raise Http404
    import qrcode
    import qrcode.image.svg
    from io import BytesIO

    image = qrcode.make(payload, image_factory=qrcode.image.svg.SvgPathImage, border=4)
    output = BytesIO()
    image.save(output)
    return _secure(HttpResponse(output.getvalue(), content_type="image/svg+xml"))


@never_cache
@require_GET
def signing_package(request, org_id, withdrawal_id):
    member = _member(request, org_id)
    if member is None:
        return redirect("bch_flow:login")
    withdrawal = get_object_or_404(
        FlowWithdrawal.objects.select_related("account"),
        pk=withdrawal_id,
        account__organization_id=org_id,
    )
    try:
        service.membership(member.identity, org_id, service.APPROVE_ROLES)
    except PaymentError:
        raise Http404 from None
    if not withdrawal.signing_payload or withdrawal.status not in (
        "pending",
        "approved",
    ):
        raise Http404
    response = JsonResponse(withdrawal.signing_payload)
    response["Content-Disposition"] = 'attachment; filename="signing-package.json"'
    response["Cache-Control"] = "no-store"
    response["X-Content-Type-Options"] = "nosniff"
    return response

@never_cache
@require_GET
def receipt(request, org_id, request_id):
    member = _member(request, org_id)
    if member is None:
        return redirect('bch_flow:login')
    charge = get_object_or_404(FlowRequest.objects.select_related('account__organization'), pk=request_id, account__organization_id=org_id)
    receipts = list(charge.receipts.filter(status='credited').order_by('created_at'))
    verified = charge.status in ('paid', 'overpaid') and sum(item.amount_units for item in receipts) >= charge.amount_units
    response = render(request, 'app_bch_flow/financial/receipt.html', {
        'member': member, 'wallet_home_url': _url(member, charge.account.asset, charge.account.environment, charge.account.wallet_id or 'legacy'), 'charge': charge, 'receipts': receipts, 'verified': verified,
        'is_sandbox': charge.account.environment == 'sandbox',
        'amount': display(charge.amount_units, charge.account.asset),
        'received': display(sum(item.amount_units for item in receipts), charge.account.asset),
    })
    response['Cache-Control'] = 'private, no-store'
    response['X-Robots-Tag'] = 'noindex, nofollow'
    return response
