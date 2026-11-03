"""Replay-safe polling and webhook consumption. Run continuously in a supervisor."""

from django.utils.translation import gettext as _


from django.db import transaction
from app_bch_flow.models import FlowInbox, FlowRequest, FlowAccount, FlowReceipt
from .service import reconcile_request
from .providers import CoreNode
from .amounts import PaymentError


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


def sync_crypto(account):
    node = CoreNode(account)
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
    requests = list(
        account.requests.exclude(address__startswith="pending:").order_by("created_at")
    )
    count = 0
    for txid in sorted(txids - {None}):
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
