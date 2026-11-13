"""Replay-safe polling and webhook consumption. Run continuously in a supervisor."""

from django.utils.translation import gettext as _

from django.db import transaction
from app_bch_flow.models import FlowInbox, FlowRequest, FlowAccount, FlowReceipt
from .service import reconcile_request
from .providers import CoreNode
from .nodes import blockchain_node
from .amounts import PaymentError, ProviderUnavailable, units


def process_inbox(limit=100):
    completed = failed = 0
    # Lock each job for the duration of its authoritative provider lookup. Other
    # workers skip it rather than executing the same job in parallel.
    for _created_or_unused in range(limit):
        with transaction.atomic():
            item = (
                FlowInbox.objects.select_for_update(skip_locked=True)
                .filter(status="pending", attempts__lt=10)
                .order_by("updated_at")
                .first()
            )
            if item is None:
                break
            item.attempts += 1
            requests = list(
                FlowRequest.objects.select_related("account").filter(
                    account__organization_id=item.organization_id,
                    account__asset="BRL",
                    account__environment=item.environment,
                    provider_reference=item.resource_id,
                )
            )
            try:
                if len(requests) != 1:
                    raise PaymentError(
                        _("The linked payment request is not available yet.")
                    )
                # Savepoint protects the inbox retry counter from a rolled-back mutation.
                with transaction.atomic():
                    reconcile_request(requests[0])
                item.status = "done"
                completed += 1
            except PaymentError:
                item.status = "failed" if item.attempts >= 10 else "pending"
                failed += 1
            item.save(update_fields=["status", "attempts", "updated_at"])
            if item.status == "pending":
                # Retry on the next worker tick, not ten immediate requests.
                break
    return completed, failed


def _verify_btc_change_outputs(account, node, txids):
    """BTC only: verify registered change against the wallet's decoded transaction.

    Never credit change as an external receipt. Never infer ownership from a
    matching address alone. This verifies the recorded outpoint and amount;
    spending eligibility remains the responsibility of the BTC provider.
    """
    if account.asset != "BTC":
        return

    from app_bch_flow.models import FlowBTCChange

    changes = (
        FlowBTCChange.objects.filter(account=account, txid__in=txids)
        .select_related("withdrawal")
        .order_by("created_at")
    )
    for change in changes:
        withdrawal = change.withdrawal
        if (
            withdrawal.account_id != account.pk
            or withdrawal.txid != change.txid
            or withdrawal.status not in ("submitted", "submitting", "unknown")
            or change.vout is None
            or change.amount_units is None
            or change.amount_units <= 0
        ):
            raise PaymentError(_("BTC change record is inconsistent with its withdrawal."))
        confirmations, outputs = node.outputs(change.txid)
        if confirmations < 0:
            raise PaymentError(_("BTC change transaction was removed from the active chain."))
        matching = [
            output for output in outputs
            if output.get("n") == change.vout
        ]
        if len(matching) != 1:
            raise PaymentError(_("BTC change output index does not match the transaction."))
        output = matching[0]
        if (
            node.output_address(output) != change.address
            or units(output.get("value"), "BTC") != change.amount_units
        ):
            raise PaymentError(_("BTC change output address or amount differs from the record."))


def sync_crypto(account):
    node = blockchain_node(account)
    node.ready()
    changes = node.rpc("listsinceblock", account.sync_cursor, 1, True)
    unexpected_sends = {
        item.get("txid")
        for item in changes.get("transactions", [])
        if item.get("category") == "send"
    }
    for txid in unexpected_sends:
        if not account.withdrawals.filter(txid=txid).exists():
            FlowAccount.objects.filter(pk=account.pk).update(frozen=True)
            raise PaymentError(
                _(
                    "An unreconciled external withdrawal was detected. The account is blocked for review."
                )
            )
    txids = {
        entry.get("txid")
        for entry in changes.get("transactions", []) + changes.get("removed", [])
        if entry.get("category") in ("receive", "send")
    }
    # Existing credited receipts are checked again, even if no new block arrived.
    for source in (
        FlowReceipt.objects.filter(request__account=account)
        .exclude(status="review")
        .values_list("source_key", flat=True)
    ):
        if source.startswith(account.asset + ":" + account.environment + ":"):
            txids.add(source.split(":")[2])

    if account.asset == "BTC":
        # Include recorded BTC change even when listsinceblock has no new event.
        # Do not inspect change records belonging to BCH or BRL accounts.
        from app_bch_flow.models import FlowBTCChange

        txids.update(
            FlowBTCChange.objects.filter(account=account)
            .exclude(txid__isnull=True)
            .values_list("txid", flat=True)
        )
        try:
            _verify_btc_change_outputs(account, node, txids - {None, ""})
        except (PaymentError, ProviderUnavailable, KeyError, TypeError, ValueError):
            FlowAccount.objects.filter(pk=account.pk).update(frozen=True)
            raise PaymentError(
                _("BTC change verification failed. Account frozen for manual review.")
            ) from None

    requests = list(
        account.requests.exclude(address__startswith="pending:").order_by("created_at")
    )
    count = 0
    for txid in sorted(txids - {None, ""}):
        confirmations, outputs = node.outputs(txid)
        addresses = {node.output_address(out) for out in outputs}
        for request in requests:
            if request.address in addresses:
                try:
                    reconcile_request(request, txid)
                    count += 1
                except PaymentError:
                    # Preserve the scan cursor on failure. Replays are idempotent.
                    if account.withdrawals.filter(txid=txid).exists():
                        continue
                    raise
    cursor = changes.get("lastblock", "")
    if not isinstance(cursor, str) or len(cursor) != 64:
        raise PaymentError(_("Invalid synchronization cursor."))
    FlowAccount.objects.filter(pk=account.pk).update(sync_cursor=cursor)
    return count


def sync_accounts():
    completed = failed = 0
    for account in (
        FlowAccount.objects.filter(asset__in=("BTC", "BCH"), frozen=False)
        .exclude(environment="sandbox")
        .iterator()
    ):
        try:
            completed += sync_crypto(account)
        except PaymentError:
            failed += 1
    return completed, failed


def poll_pix(limit=50):
    from datetime import timedelta
    from django.db.models import F, Q
    from django.utils import timezone

    due = timezone.now() - timedelta(minutes=1)
    requests = (
        FlowRequest.objects.select_related("account")
        .filter(account__asset="BRL", account__frozen=False)
        .exclude(account__environment="sandbox")
        .exclude(provider_reference="")
        .filter(Q(checked_at__isnull=True) | Q(checked_at__lt=due))
        .order_by(F("checked_at").asc(nulls_first=True))[:limit]
    )
    completed = failed = 0
    for request in requests:
        try:
            reconcile_request(request)
            completed += 1
        except PaymentError:
            failed += 1
        finally:
            FlowRequest.objects.filter(pk=request.pk).update(checked_at=timezone.now())
    # Expiration never deletes receipts or undoes already credited amounts.
    FlowRequest.objects.filter(
        expires_at__lte=timezone.now(), status__in=("open", "partial")
    ).update(status="expired")
    return completed, failed