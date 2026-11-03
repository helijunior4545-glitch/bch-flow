"""Financial mutations use one account lock, integer units and immutable journals.

Sandbox is executable without credentials. Live operations require explicit server
configuration; legacy watch-only observations cannot credit these accounts.
"""

from django.utils.translation import gettext as _


import hashlib
import json
import re
import uuid
from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from app_bch_flow.models import (
    BCHMembership,
    BCHIdentity,
    BCHAuditEvent,
    FlowAccount,
    FlowRequest,
    FlowReceipt,
    FlowWithdrawal,
    FlowJournal,
    FlowSpend,
)
from .amounts import PaymentError, ProviderUnavailable, MAX_UNITS, units
from .providers import CoreNode, MercadoPago, provider_config
from .assets import ASSET_INFO, SANDBOX_ONLY

WRITE_ROLES = ("owner", "admin", "operator")
APPROVE_ROLES = ("owner", "admin")


def membership(actor, organization, roles=WRITE_ROLES):
    if (
        not actor
        or not actor.is_active
        or not BCHMembership.objects.filter(
            identity=actor,
            identity__is_active=True,
            organization_id=organization,
            role__in=roles,
            is_active=True,
            organization__is_active=True,
        ).exists()
    ):
        raise PaymentError(
            _("You are not authorized for this organization or operation.")
        )


def fingerprint(data):
    return hashlib.sha256(
        json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def check_key(key):
    if not isinstance(key, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{12,80}", key):
        raise PaymentError(_("Invalid operation key. Refresh the form."))


def ensure_account(actor, org_id, asset, environment):
    membership(actor, org_id)
    if asset not in ASSET_INFO or environment not in (
        "sandbox",
        "testnet",
        "mercadopago_test",
        "live",
    ):
        raise PaymentError(_("Invalid asset or environment."))
    if (environment == "testnet" and asset == "BRL") or (
        environment == "mercadopago_test" and asset != "BRL"
    ):
        raise PaymentError(_("This environment does not support the selected asset."))
    if environment == "sandbox" and not getattr(
        settings, "FLOW_PAYMENTS_SANDBOX_ENABLED", False
    ):
        raise ProviderUnavailable(_("Sandbox is disabled in this installation."))
    if asset in SANDBOX_ONLY and environment != "sandbox":
        raise ProviderUnavailable(
            _(
                "USD and EUR accounts currently support sandbox only. Connect a supported fiat provider before accepting real payments."
            )
        )
    candidate = FlowAccount(
        organization_id=org_id, asset=asset, environment=environment
    )
    if environment != "sandbox":
        provider_config(candidate)
        # Validate credentials and endpoint configuration before persisting an account.
        MercadoPago(candidate) if asset == "BRL" else CoreNode(candidate)
    account, _created_or_unused = FlowAccount.objects.get_or_create(
        organization_id=org_id, asset=asset, environment=environment
    )
    return account


def _locked(account_id):
    account = FlowAccount.objects.select_for_update().get(pk=account_id)
    if account.frozen:
        raise PaymentError(
            _("This account is under review. New operations are blocked.")
        )
    return account


def _move(account, debit, credit, amount, key, reference, actor=None):
    if type(amount) is not int or not 0 < amount <= MAX_UNITS:
        raise PaymentError(_("Invalid movement."))
    if FlowJournal.objects.filter(account=account, key=key).exists():
        raise PaymentError(_("Movement already recorded."))
    # Debit increases the asset bucket; credit reduces it. External is clearing.
    for bucket, sign in ((debit, 1), (credit, -1)):
        if bucket != "external":
            field = bucket + "_units"
            value = getattr(account, field) + sign * amount
            if not 0 <= value <= MAX_UNITS:
                raise PaymentError(_("Insufficient balance or limit exceeded."))
            setattr(account, field, value)
    FlowJournal.objects.create(
        account=account,
        key=key,
        debit=debit,
        credit=credit,
        amount_units=amount,
        reference=reference,
        actor=actor,
    )
    account.save(update_fields=["available_units", "reserved_units"])


def create_request(actor, account, amount_units, description, key, payer_email=""):
    membership(actor, account.organization_id)
    check_key(key)
    if (
        type(amount_units) is not int
        or not 0 < amount_units <= MAX_UNITS
        or len(description) > 160
    ):
        raise PaymentError(_("Invalid amount or description."))
    if account.asset == "BRL" and account.environment != "sandbox":
        try:
            validate_email(payer_email)
        except ValidationError:
            raise PaymentError(_("Invalid payer email.")) from None
    digest = fingerprint([amount_units, description, payer_email])
    with transaction.atomic():
        locked = _locked(account.pk)
        existing = FlowRequest.objects.filter(
            account=locked, idempotency_key=key
        ).first()
        if existing:
            if existing.payload_hash != digest:
                raise PaymentError(
                    _("This key was already used for another payment request.")
                )
            return existing
        identifier = uuid.uuid4()
        request = FlowRequest.objects.create(
            id=identifier,
            account=locked,
            created_by=actor,
            amount_units=amount_units,
            description=description,
            payer_email=payer_email,
            idempotency_key=key,
            payload_hash=digest,
            address=f"pending:{identifier}",
            expires_at=timezone.now() + timedelta(minutes=30),
        )
    return request


def prepare_request(request):
    # Persist the local request before calling a remote payment-creation API. Its
    # UUID is the stable provider idempotency key across timeouts and retries.
    with transaction.atomic():
        account = _locked(request.account_id)
        request = FlowRequest.objects.select_for_update().get(
            pk=request.pk, account=account
        )
        if request.expires_at <= timezone.now():
            raise PaymentError(_("This request expired. Create a new request."))
        if not request.address.startswith("pending:"):
            return request
        if account.environment == "sandbox":
            request.address = f"sandbox:{account.asset}:{request.pk}"
            request.payment_payload = request.address
        elif account.asset == "BRL":
            request.provider_reference, request.payment_payload = MercadoPago(
                account
            ).create(request, request.payer_email)
            request.address = "mercadopago:" + request.provider_reference
        else:
            request.address = CoreNode(account).new_address()
        request.save(update_fields=["address", "payment_payload", "provider_reference"])
        return request


def _receipt(account, request, source, amount, confirmations, required):
    if (
        type(amount) is not int
        or not 0 < amount <= MAX_UNITS
        or type(confirmations) is not int
    ):
        raise PaymentError(_("Invalid payment evidence."))
    receipt = FlowReceipt.objects.filter(source_key=source).first()
    if receipt and (receipt.request_id != request.pk or receipt.amount_units != amount):
        raise PaymentError(
            _(
                "This payment already belongs to another request or has a different amount."
            )
        )
    if not receipt:
        receipt = FlowReceipt.objects.create(
            request=request, source_key=source, amount_units=amount
        )
    if receipt.status == "credited":
        if confirmations < required:
            account.frozen = True
            account.save(update_fields=["frozen"])
            receipt.status = "review"
            request.status = "review"
            request.save(update_fields=["status"])
        receipt.confirmations = max(0, confirmations)
        receipt.save(update_fields=["confirmations", "status"])
        return receipt
    if receipt.status == "review":
        return receipt
    receipt.confirmations = max(0, confirmations)
    late = request.expires_at <= timezone.now()
    if confirmations >= required and not late:
        _move(
            account,
            "available",
            "external",
            amount,
            f"receipt:{receipt.pk}",
            request.pk,
        )
        receipt.status, receipt.credited_at = "credited", timezone.now()
        request.received_units += amount
        request.status = (
            "partial"
            if request.received_units < request.amount_units
            else "paid"
            if request.received_units == request.amount_units
            else "overpaid"
        )
    elif late:
        receipt.status, request.status = "review", "review"
    receipt.save(update_fields=["confirmations", "status", "credited_at"])
    request.save(update_fields=["received_units", "status"])
    return receipt


def simulate_receipt(actor, request, amount, key):
    membership(actor, request.account.organization_id)
    check_key(key)
    with transaction.atomic():
        account = _locked(request.account_id)
        request = FlowRequest.objects.select_for_update().get(
            pk=request.pk, account=account
        )
        if account.environment != "sandbox":
            raise PaymentError(
                _("Simulation is not allowed in provider-connected accounts.")
            )
        return _receipt(account, request, f"sandbox:{account.pk}:{key}", amount, 1, 1)


def reconcile_request(request, txid=None):
    account = request.account
    if account.environment == "sandbox":
        raise PaymentError(_("Use the explicit simulation action in this environment."))
    if request.address.startswith("pending:"):
        return prepare_request(request)
    if account.asset == "BRL":
        provider = MercadoPago(account)
        data = provider.get(request.provider_reference)
        provider.validate(data, request, require_approved=False)
        # A reversal after credit freezes funds; never silently leave them spendable.
        if (
            data.get("status") in ("refunded", "charged_back", "cancelled")
            or units_or_zero(data.get("transaction_amount_refunded", 0), "BRL") > 0
        ):
            with transaction.atomic():
                locked = FlowAccount.objects.select_for_update().get(pk=account.pk)
                req = FlowRequest.objects.select_for_update().get(pk=request.pk)
                if req.received_units:
                    locked.frozen = True
                    locked.save(update_fields=["frozen"])
                    req.status = "review"
                    req.save(update_fields=["status"])
            return request
        if data.get("status") != "approved":
            return request
        provider.validate(data, request)
        observations = [
            (
                f"mp:{provider.config['collector_id']}:{data['id']}",
                request.amount_units,
                1,
            )
        ]
        required = 1
    else:
        node = CoreNode(account)
        confirmations, outputs = node.outputs(txid)
        # Change from our own outgoing transaction is not a new external receipt.
        if FlowWithdrawal.objects.filter(account=account, txid=txid.lower()).exists():
            raise PaymentError(
                _(
                    "Change from your own withdrawal cannot be credited as a new receipt."
                )
            )
        observations = []
        for out in outputs:
            if node.output_address(out) == request.address:
                if type(out.get("n")) is not int or out["n"] < 0:
                    raise PaymentError(_("Invalid output index."))
                observations.append(
                    (
                        f"{account.asset}:{account.environment}:{txid.lower()}:{out['n']}",
                        units(out["value"], account.asset),
                        confirmations,
                    )
                )
        required = node.confirmations
        if not observations:
            raise PaymentError(_("This transaction does not pay the request address."))
    with transaction.atomic():
        account = _locked(account.pk)
        request = FlowRequest.objects.select_for_update().get(
            pk=request.pk, account=account
        )
        if account.asset == "BRL":
            from app_bch_flow.models import FlowProviderConnection

            managed = FlowProviderConnection.objects.filter(
                organization_id=account.organization_id,
                provider="mercadopago",
                environment=account.environment,
            ).first()
            if managed is not None and managed.status != "connected":
                raise ProviderUnavailable(
                    _("Mercado Pago is disconnected. Connect it in Integrations.")
                )
        for source, amount, confirmations in observations:
            _receipt(account, request, source, amount, confirmations, required)
    return request


def create_withdrawal(actor, account, destination, amount, fee_limit, key):
    membership(actor, account.organization_id)
    check_key(key)
    if (
        type(amount) is not int
        or type(fee_limit) is not int
        or not 0 < amount <= MAX_UNITS
        or not 0 <= fee_limit <= MAX_UNITS
        or not destination
        or len(destination) > 180
    ):
        raise PaymentError(_("Invalid withdrawal data."))
    if account.environment != "sandbox":
        if account.asset == "BRL":
            raise ProviderUnavailable(
                _(
                    "Pix payouts require a contracted transfer product; Checkout API does not authorize payouts."
                )
            )
        destination = CoreNode(account).validate_address(destination)
    elif not destination.startswith("sandbox:"):
        raise PaymentError(_("Use a sandbox: destination for simulated transfers."))
    digest = fingerprint([destination, amount, fee_limit])
    with transaction.atomic():
        account = _locked(account.pk)
        existing = FlowWithdrawal.objects.filter(
            account=account, idempotency_key=key
        ).first()
        if existing:
            if existing.payload_hash != digest:
                raise PaymentError(
                    _("This key was already used for another withdrawal.")
                )
            return existing
        withdrawal = FlowWithdrawal.objects.create(
            account=account,
            requested_by=actor,
            destination=destination,
            amount_units=amount,
            fee_limit_units=fee_limit,
            idempotency_key=key,
            payload_hash=digest,
        )
        _move(
            account,
            "reserved",
            "available",
            amount + fee_limit,
            f"reserve:{withdrawal.pk}",
            withdrawal.pk,
            actor,
        )
        return withdrawal


def approve_withdrawal(actor, withdrawal, password):
    membership(actor, withdrawal.account.organization_id, APPROVE_ROLES)
    # Serialize reauthentication attempts across accounts and application workers.
    with transaction.atomic():
        identity = BCHIdentity.objects.select_for_update().get(pk=actor.pk)
        failures = BCHAuditEvent.objects.filter(
            actor=identity,
            event_type="flow.withdrawal.approval_failed",
            created_at__gte=timezone.now() - timedelta(minutes=5),
        ).count()
        allowed = (
            identity.is_active
            and failures < 5
            and password
            and identity.check_password(password)
        )
        if not allowed and failures < 5:
            BCHAuditEvent.objects.create(
                actor=identity,
                organization_id=withdrawal.account.organization_id,
                event_type="flow.withdrawal.approval_failed",
                metadata={},
            )
    if not allowed:
        raise PaymentError(
            _("Invalid password or too many attempts. Wait before authorizing again.")
        )
    with transaction.atomic():
        _locked(withdrawal.account_id)
        withdrawal = FlowWithdrawal.objects.select_for_update().get(pk=withdrawal.pk)
        if withdrawal.status not in ("pending", "approved"):
            raise PaymentError(
                _("This withdrawal cannot be authorized in its current state.")
            )
        withdrawal.status, withdrawal.approved_by = "approved", actor
        withdrawal.approved_until = timezone.now() + timedelta(minutes=5)
        withdrawal.save(update_fields=["status", "approved_by", "approved_until"])
    return withdrawal


def cancel_withdrawal(actor, withdrawal):
    membership(actor, withdrawal.account.organization_id, APPROVE_ROLES)
    with transaction.atomic():
        account = _locked(withdrawal.account_id)
        withdrawal = FlowWithdrawal.objects.select_for_update().get(pk=withdrawal.pk)
        if withdrawal.status == "cancelled":
            return withdrawal
        if withdrawal.status not in ("pending", "approved"):
            raise PaymentError(
                _("Do not cancel a broadcast withdrawal or one with an unknown result.")
            )
        _move(
            account,
            "available",
            "reserved",
            withdrawal.amount_units + withdrawal.fee_limit_units,
            f"cancel:{withdrawal.pk}",
            withdrawal.pk,
            actor,
        )
        withdrawal.inputs.all().delete()
        withdrawal.status = "cancelled"
        withdrawal.save(update_fields=["status"])
    return withdrawal


def submit_withdrawal(actor, withdrawal, raw=""):
    membership(actor, withdrawal.account.organization_id, APPROVE_ROLES)
    node = None
    with transaction.atomic():
        account = _locked(withdrawal.account_id)
        withdrawal = FlowWithdrawal.objects.select_for_update().get(pk=withdrawal.pk)
        if withdrawal.status == "submitted":
            return withdrawal
        if (
            withdrawal.status != "approved"
            or withdrawal.approved_by_id != actor.pk
            or not withdrawal.approved_until
            or withdrawal.approved_until <= timezone.now()
        ):
            raise PaymentError(_("Authorize the withdrawal again before broadcasting."))
        if account.environment == "sandbox":
            txid, fee, inputs = (
                hashlib.sha256(str(withdrawal.pk).encode()).hexdigest(),
                0,
                [],
            )
        else:
            if account.asset == "BRL":
                raise ProviderUnavailable(_("Pix payouts are not configured."))
            node = CoreNode(account)
            txid, fee, inputs = node.inspect_signed(withdrawal, raw)
            for item in inputs:
                claim, _created_or_unused = FlowSpend.objects.get_or_create(
                    asset=account.asset,
                    environment=account.environment,
                    txid=item["txid"],
                    vout=item["vout"],
                    defaults={"withdrawal": withdrawal},
                )
                if claim.withdrawal_id != withdrawal.pk:
                    raise PaymentError(
                        _("An input is already reserved for another withdrawal.")
                    )
        withdrawal.txid, withdrawal.actual_fee_units = txid, fee
        withdrawal.status = "submitting"
        withdrawal.save(update_fields=["txid", "actual_fee_units", "status"])
    # Commit reservations BEFORE the network side effect. A timeout keeps funds
    # reserved and preserves the expected TXID for an explicit recovery lookup.
    if node:
        try:
            if node.rpc("sendrawtransaction", raw) != txid:
                raise ProviderUnavailable(_("The node returned an unexpected TXID."))
        except ProviderUnavailable:
            FlowWithdrawal.objects.filter(pk=withdrawal.pk, status="submitting").update(
                status="unknown"
            )
            raise
    return finish_withdrawal(withdrawal.pk)


def finish_withdrawal(withdrawal_id):
    with transaction.atomic():
        snapshot = FlowWithdrawal.objects.get(pk=withdrawal_id)
        account = FlowAccount.objects.select_for_update().get(pk=snapshot.account_id)
        withdrawal = FlowWithdrawal.objects.select_for_update().get(pk=withdrawal_id)
        if withdrawal.status == "submitted":
            return withdrawal
        if (
            withdrawal.status not in ("submitting", "unknown")
            or withdrawal.actual_fee_units is None
        ):
            raise PaymentError(
                _("The withdrawal is not awaiting broadcast verification.")
            )
        spent = withdrawal.amount_units + withdrawal.actual_fee_units
        _move(
            account,
            "external",
            "reserved",
            spent,
            f"submit:{withdrawal.pk}",
            withdrawal.pk,
            withdrawal.approved_by,
        )
        remainder = withdrawal.fee_limit_units - withdrawal.actual_fee_units
        if remainder:
            _move(
                account,
                "available",
                "reserved",
                remainder,
                f"fee-release:{withdrawal.pk}",
                withdrawal.pk,
                withdrawal.approved_by,
            )
        withdrawal.status = "submitted"
        withdrawal.save(update_fields=["status"])
        return withdrawal


def recover_withdrawal(actor, withdrawal):
    membership(actor, withdrawal.account.organization_id, APPROVE_ROLES)
    if withdrawal.status not in ("unknown", "submitting") or not withdrawal.txid:
        raise PaymentError(_("No pending broadcast to check."))
    if withdrawal.account.environment == "sandbox":
        return finish_withdrawal(withdrawal.pk)
    node = CoreNode(withdrawal.account)
    node.ready()
    tx = node.rpc("gettransaction", withdrawal.txid, True)
    decoded = node.rpc("decoderawtransaction", tx["hex"])
    if decoded.get("txid") != withdrawal.txid or tx.get("confirmations", -1) < 0:
        raise PaymentError(
            _("Broadcast is not yet verified by the node. Funds remain reserved.")
        )
    return finish_withdrawal(withdrawal.pk)


def units_or_zero(value, asset):
    from decimal import Decimal

    if Decimal(str(value)) == 0:
        return 0
    return units(value, asset)


def prepare_signing(actor, withdrawal):
    membership(actor, withdrawal.account.organization_id, APPROVE_ROLES)
    with transaction.atomic():
        account = _locked(withdrawal.account_id)
        withdrawal = FlowWithdrawal.objects.select_for_update().get(pk=withdrawal.pk)
        if account.environment == "sandbox" or account.asset == "BRL":
            raise PaymentError(
                _(
                    "Signing packages are only available for node-connected BTC/BCH withdrawals."
                )
            )
        if withdrawal.status not in ("pending", "approved"):
            raise PaymentError(
                _("A signing package cannot be prepared for this withdrawal.")
            )
        if withdrawal.signing_payload:
            return withdrawal
        payload = CoreNode(account).prepare_unsigned(withdrawal)
        for item in payload["inputs"]:
            claim, _created_or_unused = FlowSpend.objects.get_or_create(
                asset=account.asset,
                environment=account.environment,
                txid=item["txid"],
                vout=item["vout"],
                defaults={"withdrawal": withdrawal},
            )
            if claim.withdrawal_id != withdrawal.pk:
                raise PaymentError(_("An input already belongs to another withdrawal."))
        withdrawal.signing_payload = payload
        withdrawal.save(update_fields=["signing_payload"])
        return withdrawal
