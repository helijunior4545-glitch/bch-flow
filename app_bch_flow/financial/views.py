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
)
from app_bch_flow.views.authentication import current_identity
from . import service
from .amounts import PaymentError, ProviderUnavailable, display, units
from .forms import RequestForm, WithdrawalForm
from .assets import ASSET_INFO, SANDBOX_ONLY
from .providers import validate_mp_signature

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


def _url(member, asset, environment):
    return (
        reverse("bch_flow:financial_home", args=[member.organization_id])
        + "?"
        + urlencode({"asset": asset, "environment": environment})
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
    environment = request.GET.get("environment", "sandbox")
    if asset not in ASSET_INFO or environment not in LABELS:
        raise Http404
    if asset in SANDBOX_ONLY and environment != "sandbox":
        raise Http404
    account = FlowAccount.objects.filter(
        organization_id=org_id, asset=asset, environment=environment
    ).first()
    error, notice = "", ""
    rf = RequestForm(asset=asset, prefix="receive", initial={"key": uuid.uuid4().hex})
    wf = WithdrawalForm(asset=asset, prefix="send", initial={"key": uuid.uuid4().hex})
    if request.method == "POST":
        action = request.POST.get("action")
        try:
            if action == "request":
                rf = RequestForm(request.POST, asset=asset, prefix="receive")
                if rf.is_valid():
                    account = service.ensure_account(
                        member.identity, org_id, asset, environment
                    )
                    charge = service.create_request(
                        member.identity,
                        account,
                        rf.cleaned_data["amount"],
                        rf.cleaned_data["description"],
                        rf.cleaned_data["key"],
                        rf.cleaned_data["payer_email"],
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
                    return redirect(_url(member, asset, environment))
            elif action in ("approve", "submit", "cancel", "recover", "prepare_send"):
                withdrawal = get_object_or_404(
                    FlowWithdrawal.objects.select_related("account"),
                    pk=request.POST.get("withdrawal"),
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
                return redirect(_url(member, asset, environment))
            else:
                raise PaymentError(_("Invalid operation."))
        except PaymentError as exc:
            error = str(exc)
        except (IntegrityError, ValueError, ValidationError):
            error = "The operation conflicted with another record. Refresh and check its status before retrying."
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
    return render(
        request,
        "app_bch_flow/financial/home.html",
        {
            "member": member,
            "asset_options": [
                {"code": code, **meta} for code, meta in ASSET_INFO.items()
            ],
            "sandbox_only": asset in SANDBOX_ONLY,
            "asset": asset,
            "environment": environment,
            "environment_label": LABELS[environment],
            "account": account,
            "available": display(account.available_units if account else 0, asset),
            "reserved": display(account.reserved_units if account else 0, asset),
            "requests": requests,
            "withdrawals": withdrawals,
            "journal": journal,
            "request_form": rf,
            "withdrawal_form": wf,
            "error": error,
            "notice": notice,
            "can_write": member.role in service.WRITE_ROLES,
            "can_approve": member.role in service.APPROVE_ROLES,
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
            if action == "simulate":
                service.simulate_receipt(
                    member.identity,
                    charge,
                    units(request.POST.get("amount", ""), charge.account.asset),
                    request.POST.get("key", ""),
                )
            elif action == "refresh":
                service.reconcile_request(charge, request.POST.get("txid"))
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
                "This payment was already recorded. Check the history before retrying."
            )
    charge.refresh_from_db()
    return render(
        request,
        "app_bch_flow/financial/request.html",
        {
            "member": member,
            "charge": charge,
            "status_label": STATUS_LABELS.get(charge.status, charge.status),
            "amount": display(charge.amount_units, charge.account.asset),
            "received": display(charge.received_units, charge.account.asset),
            "error": error,
            "checkout_url": checkout_url(charge),
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
    # Config is keyed by organization. Signature selects no payer-supplied account.
    account = FlowAccount.objects.filter(
        organization_id=org_id, asset="BRL", environment=environment
    ).first()
    if environment not in ("mercadopago_test", "live"):
        return JsonResponse({"error": "invalid_environment"}, status=400)
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
        or charge.address.startswith("pending:")
    ):
        return ""
    if (
        charge.account.asset in ("BTC", "BCH")
        and charge.account.environment != "sandbox"
    ):
        scheme = "bitcoin:" if charge.account.asset == "BTC" else ""
        return (
            scheme
            + charge.address
            + "?amount="
            + display(
                max(0, charge.amount_units - charge.received_units),
                charge.account.asset,
            )
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
