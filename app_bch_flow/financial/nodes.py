"""Provider selection and non-custodial public wallet derivation."""

import hashlib
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.views.decorators.debug import sensitive_variables
from embit import bip32, networks, script
from app_bch_flow.models import FlowNodeConnection, FlowDerivedAddress
from .amounts import PaymentError, ProviderUnavailable


def public_wallet(value):
    try:
        key = bip32.HDKey.from_base58(value)
        if key.is_private or key.depth != 3 or key.child_number < 2**31:
            raise ValueError
        if key.version not in (
            networks.NETWORKS["main"]["xpub"],
            bytes.fromhex("04b24746"),
        ):
            raise ValueError
        # Canonical version prevents the same wallet being linked via xpub/zpub aliases.
        canonical = key.to_base58(version=networks.NETWORKS["main"]["xpub"])
        return key, hashlib.sha256(canonical.encode()).hexdigest()
    except Exception:
        raise PaymentError(
            "Use an account-level mainnet xpub or zpub. Private keys and seeds are never accepted."
        ) from None


def derive_address(public_key, asset, branch, index):
    if (
        asset not in ("BTC", "BCH")
        or type(branch) is not int
        or branch not in (0, 1)
        or type(index) is not int
        or not 0 <= index < 2**31
    ):
        raise PaymentError("Invalid public wallet derivation.")
    key, _ = public_wallet(public_key)
    pub = key.derive([branch, index]).key
    if asset == "BTC":
        return script.p2wpkh(pub).address(networks.NETWORKS["main"])
    from app_bch_flow.wallet.v53b_cashaddr import compressed_pubkey_to_cashaddr

    return compressed_pubkey_to_cashaddr(pub.sec())


def allocate_address(connection, branch=0):
    with transaction.atomic():
        locked = FlowNodeConnection.objects.select_for_update().get(pk=connection.pk)
        if locked.archived_at:
            raise PaymentError(
                "This wallet is archived. Restore it before creating addresses."
            )
        field = "next_receive" if branch == 0 else "next_change"
        index = getattr(locked, field)
        address = derive_address(locked.public_key, locked.asset, branch, index)
        FlowDerivedAddress.objects.create(
            connection=locked, branch=branch, index=index, address=address
        )
        setattr(locked, field, index + 1)
        locked.save(update_fields=[field])
        return address


def blockchain_node(account):
    from .providers import CoreNode, provider_config

    config = provider_config(account)
    name = config.get("provider", "core")
    if name == "core":
        return CoreNode(account)
    if name == "nownodes":
        from .nownodes import NOWNodes

        return NOWNodes(account, config)
    raise ProviderUnavailable(
        "Unsupported blockchain provider. Select a configured integration."
    )


def _audit_wallet(actor, wallet, event):
    from app_bch_flow.models import BCHAuditEvent

    BCHAuditEvent.objects.create(
        actor=actor,
        organization_id=wallet.organization_id,
        event_type="flow.wallet." + event,
        metadata={"wallet_id": str(wallet.pk), "asset": wallet.asset},
    )


@sensitive_variables("api_key", "password", "encrypted")
def connect_nownodes(
    actor, org_id, asset, api_key, xpub, confirmations, password, name=""
):
    from .integrations import reauthenticate
    from .secrets import seal
    from .nownodes import NOWNodes
    from app_bch_flow.models import FlowAccount

    reauthenticate(actor, org_id, password)
    if (
        asset not in ("BTC", "BCH")
        or type(confirmations) is not int
        or not 1 <= confirmations <= 100
    ):
        raise PaymentError("Invalid asset or confirmation policy.")
    if (
        not isinstance(api_key, str)
        or not 8 <= len(api_key) <= 4096
        or any(c.isspace() for c in api_key)
    ):
        raise PaymentError("A valid NOWNodes API key is required.")
    _, fingerprint = public_wallet(xpub)
    candidate = FlowAccount(organization_id=org_id, asset=asset, environment="live")
    # Read-only check: saving a connection never signs or transmits a transaction.
    node = NOWNodes(
        candidate,
        {
            "provider": "nownodes",
            "api_key": api_key,
            "public_key": xpub,
            "confirmations": confirmations,
        },
    )
    node.ready()
    encrypted = seal(api_key)
    if len(name) > 80:
        raise PaymentError("Wallet name is too long.")
    with transaction.atomic():
        from .service import membership, APPROVE_ROLES
        from app_bch_flow.models import BCHOrganization

        membership(actor, org_id, APPROVE_ROLES)
        BCHOrganization.objects.select_for_update().get(pk=org_id)
        existing = FlowNodeConnection.objects.filter(
            wallet_fingerprint=fingerprint
        ).first()
        if existing and (
            str(existing.organization_id) != str(org_id)
            or existing.asset != asset
            or existing.environment != "live"
        ):
            raise PaymentError(
                "This public wallet is already registered for another asset or organization. Use a separate account public key for each wallet."
            )
        if existing:
            account = (
                FlowAccount.objects.select_for_update().filter(wallet=existing).first()
            )
            if account is None:
                raise PaymentError(
                    "The wallet registration changed. Refresh before reconnecting."
                )
            existing = FlowNodeConnection.objects.select_for_update().get(
                pk=existing.pk
            )
            if existing.archived_at:
                raise PaymentError(
                    "This wallet is archived. Restore it before updating credentials."
                )
            if existing.confirmations != confirmations:
                raise PaymentError(
                    "The confirmation policy of an existing wallet cannot be changed here."
                )
            existing.api_ciphertext = encrypted
            existing.verified_at = timezone.now()
            existing.name = name.strip() or existing.name
            existing.save(update_fields=["api_ciphertext", "verified_at", "name"])
            _audit_wallet(actor, existing, "reconnected")
            return existing
        connection = FlowNodeConnection.objects.create(
            organization_id=org_id,
            asset=asset,
            environment="live",
            provider="nownodes",
            public_key=xpub,
            wallet_fingerprint=fingerprint,
            api_ciphertext=encrypted,
            confirmations=confirmations,
            verified_at=timezone.now(),
            name=name.strip(),
        )
        # An unused legacy account can be adopted. Never move financial history.
        legacy = (
            FlowAccount.objects.select_for_update()
            .filter(
                organization_id=org_id,
                asset=asset,
                environment="live",
                wallet__isnull=True,
            )
            .first()
        )
        if legacy and not (
            legacy.frozen
            or legacy.sync_cursor
            or legacy.available_units
            or legacy.reserved_units
            or legacy.requests.exists()
            or legacy.withdrawals.exists()
            or legacy.journal.exists()
        ):
            legacy.wallet = connection
            legacy.save(update_fields=["wallet"])
        else:
            FlowAccount.objects.create(
                organization_id=org_id,
                asset=asset,
                environment="live",
                wallet=connection,
            )
        _audit_wallet(actor, connection, "created")
        return connection


def select_wallet(org_id, asset, environment, wallet_id=None):
    wallets = FlowNodeConnection.objects.filter(
        organization_id=org_id, asset=asset, environment=environment
    )
    if wallet_id:
        try:
            wallet = wallets.filter(pk=wallet_id).first()
        except (ValueError, ValidationError):
            wallet = None
        if wallet is None:
            raise PaymentError(
                "This wallet is not available for this organization, asset and environment."
            )
        return wallet
    available = list(
        wallets.filter(archived_at__isnull=True).order_by("created_at")[:2]
    )
    if len(available) > 1:
        raise PaymentError("Choose the wallet for this operation.")
    return available[0] if available else None


@sensitive_variables("password")
def manage_wallet(actor, org_id, wallet_id, action, password):
    from .integrations import reauthenticate
    from app_bch_flow.models import FlowAccount, FlowReceipt
    from django.core.exceptions import ValidationError

    reauthenticate(actor, org_id, password)
    from .service import membership, APPROVE_ROLES

    if action not in ("archive_wallet", "restore_wallet", "delete_wallet"):
        raise PaymentError("Invalid wallet operation.")
    with transaction.atomic():
        membership(actor, org_id, APPROVE_ROLES)
        try:
            wallet = FlowNodeConnection.objects.get(
                pk=wallet_id, organization_id=org_id
            )
        except (FlowNodeConnection.DoesNotExist, ValueError, ValidationError):
            raise PaymentError("Wallet not found in this organization.") from None
        account = FlowAccount.objects.select_for_update().filter(wallet=wallet).first()
        wallet = (
            FlowNodeConnection.objects.select_for_update()
            .filter(pk=wallet.pk, organization_id=org_id)
            .first()
        )
        if wallet is None:
            raise PaymentError(
                "The wallet registration changed. Refresh before trying again."
            )
        if action == "restore_wallet":
            wallet.archived_at = None
            wallet.save(update_fields=["archived_at"])
            _audit_wallet(actor, wallet, "restored")
            return
        if account and (
            account.available_units
            or account.reserved_units
            or account.frozen
            or account.withdrawals.exclude(
                status__in=["submitted", "cancelled"]
            ).exists()
            or account.requests.filter(
                status__in=["open", "partial", "review"]
            ).exists()
            or FlowReceipt.objects.filter(request__account=account)
            .exclude(status="credited")
            .exists()
        ):
            raise PaymentError(
                "Resolve this wallet's balance, pending requests, withdrawals or payment reviews before removing it."
            )
        used = bool(
            wallet.next_receive
            or wallet.next_change
            or wallet.addresses.exists()
            or (
                account
                and (
                    account.requests.exists()
                    or account.withdrawals.exists()
                    or account.journal.exists()
                )
            )
        )
        if action == "delete_wallet":
            if used:
                raise PaymentError(
                    "This wallet has addresses or financial history. Archive it to preserve its records."
                )
            _audit_wallet(actor, wallet, "deleted")
            if account:
                account.delete()
            wallet.delete()
            return
        wallet.archived_at = timezone.now()
        wallet.save(update_fields=["archived_at"])
        _audit_wallet(actor, wallet, "archived")
