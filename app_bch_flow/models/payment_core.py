"""Amounts are integer base units. No private keys or banking credentials live here."""

import uuid
from django.db import models
from django.db.models import Q, F

ASSETS = [("BTC", "Bitcoin"), ("BCH", "Bitcoin Cash"), ("BRL", "Real / Pix")]
ENVIRONMENTS = [
    ("sandbox", "Demonstração"),
    ("testnet", "Rede de testes"),
    ("mercadopago_test", "Teste Mercado Pago"),
    ("live", "Produção"),
]
MAX_UNITS = 2_100_000_000_000_000


class FlowAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "app_bch_flow.BCHOrganization", on_delete=models.PROTECT
    )
    asset = models.CharField(max_length=3, choices=ASSETS)
    environment = models.CharField(
        max_length=20, choices=ENVIRONMENTS, default="sandbox"
    )
    available_units = models.BigIntegerField(default=0)
    reserved_units = models.BigIntegerField(default=0)
    frozen = models.BooleanField(default=False)
    sync_cursor = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "asset", "environment"],
                name="flow_account_tenant_asset_env",
            ),
            models.CheckConstraint(
                condition=Q(asset__in=["BTC", "BCH", "BRL"]), name="flow_account_asset"
            ),
            models.CheckConstraint(
                condition=Q(
                    environment__in=["sandbox", "testnet", "mercadopago_test", "live"]
                ),
                name="flow_account_environment",
            ),
            models.CheckConstraint(
                condition=Q(available_units__gte=0, reserved_units__gte=0),
                name="flow_account_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(
                    available_units__lte=MAX_UNITS, reserved_units__lte=MAX_UNITS
                ),
                name="flow_account_bounded",
            ),
            models.CheckConstraint(
                condition=(
                    Q(environment__in=["sandbox", "live"])
                    | Q(asset__in=["BTC", "BCH"], environment="testnet")
                    | Q(asset="BRL", environment="mercadopago_test")
                ),
                name="flow_asset_environment",
            ),
        ]


class FlowRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        FlowAccount, on_delete=models.PROTECT, related_name="requests"
    )
    created_by = models.ForeignKey("app_bch_flow.BCHIdentity", on_delete=models.PROTECT)
    amount_units = models.BigIntegerField()
    received_units = models.BigIntegerField(default=0)
    description = models.CharField(max_length=160, blank=True)
    address = models.CharField(max_length=180)
    checked_at = models.DateTimeField(null=True, blank=True)
    payer_email = models.EmailField(blank=True)
    provider_reference = models.CharField(max_length=100, blank=True)
    payment_payload = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        default="open",
        choices=[
            (s, s) for s in ("open", "partial", "paid", "overpaid", "expired", "review")
        ],
    )
    idempotency_key = models.CharField(max_length=80)
    payload_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["account", "idempotency_key"], name="flow_request_idempotent"
            ),
            # Addresses are never shared between requests, even across tenants.
            models.UniqueConstraint(
                fields=["address"], name="flow_request_unique_address"
            ),
            models.CheckConstraint(
                condition=Q(
                    amount_units__gt=0,
                    amount_units__lte=MAX_UNITS,
                    received_units__gte=0,
                ),
                name="flow_request_valid_amount",
            ),
        ]


class FlowReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        FlowRequest, on_delete=models.PROTECT, related_name="receipts"
    )
    # BTC/BCH+network+txid+vout identifies one output globally, not per organization.
    source_key = models.CharField(max_length=180, unique=True)
    amount_units = models.BigIntegerField()
    confirmations = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=16,
        default="observed",
        choices=[(s, s) for s in ("observed", "credited", "review")],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    credited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(amount_units__gt=0, amount_units__lte=MAX_UNITS),
                name="flow_receipt_positive",
            )
        ]


class FlowWithdrawal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        FlowAccount, on_delete=models.PROTECT, related_name="withdrawals"
    )
    requested_by = models.ForeignKey(
        "app_bch_flow.BCHIdentity",
        on_delete=models.PROTECT,
        related_name="flow_requested",
    )
    approved_by = models.ForeignKey(
        "app_bch_flow.BCHIdentity",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="flow_approved",
    )
    destination = models.CharField(max_length=180)
    amount_units = models.BigIntegerField()
    fee_limit_units = models.BigIntegerField(default=0)
    actual_fee_units = models.BigIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        default="pending",
        choices=[
            (s, s)
            for s in (
                "pending",
                "approved",
                "submitting",
                "submitted",
                "cancelled",
                "unknown",
            )
        ],
    )
    idempotency_key = models.CharField(max_length=80)
    payload_hash = models.CharField(max_length=64)
    signing_payload = models.JSONField(default=dict, blank=True)
    txid = models.CharField(max_length=64, blank=True)
    approved_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["account", "idempotency_key"], name="flow_withdrawal_idempotent"
            ),
            models.CheckConstraint(
                condition=Q(
                    amount_units__gt=0,
                    amount_units__lte=MAX_UNITS,
                    fee_limit_units__gte=0,
                    fee_limit_units__lte=MAX_UNITS,
                ),
                name="flow_withdrawal_valid_amount",
            ),
        ]


class FlowJournal(models.Model):
    """One immutable, structurally balanced debit/credit pair per movement."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        FlowAccount, on_delete=models.PROTECT, related_name="journal"
    )
    key = models.CharField(max_length=180)
    debit = models.CharField(
        max_length=12, choices=[(s, s) for s in ("available", "reserved", "external")]
    )
    credit = models.CharField(
        max_length=12, choices=[(s, s) for s in ("available", "reserved", "external")]
    )
    amount_units = models.BigIntegerField()
    reference = models.UUIDField()
    actor = models.ForeignKey(
        "app_bch_flow.BCHIdentity", null=True, on_delete=models.PROTECT
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["account", "key"], name="flow_journal_idempotent"
            ),
            models.CheckConstraint(
                condition=Q(amount_units__gt=0, amount_units__lte=MAX_UNITS),
                name="flow_journal_positive",
            ),
            models.CheckConstraint(
                condition=~Q(debit=F("credit")), name="flow_journal_distinct_sides"
            ),
            models.CheckConstraint(
                condition=Q(
                    debit__in=["available", "reserved", "external"],
                    credit__in=["available", "reserved", "external"],
                ),
                name="flow_journal_valid_buckets",
            ),
        ]


class FlowSpend(models.Model):
    """Reserve external transaction inputs across all tenants before broadcasting."""

    withdrawal = models.ForeignKey(
        FlowWithdrawal, on_delete=models.PROTECT, related_name="inputs"
    )
    asset = models.CharField(max_length=3)
    environment = models.CharField(max_length=20)
    txid = models.CharField(max_length=64)
    vout = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["asset", "environment", "txid", "vout"],
                name="flow_spend_unique_input",
            )
        ]


class FlowInbox(models.Model):
    organization = models.ForeignKey(
        "app_bch_flow.BCHOrganization", on_delete=models.PROTECT
    )
    environment = models.CharField(max_length=20)
    resource_id = models.CharField(max_length=80)
    status = models.CharField(max_length=12, default="pending")
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "environment", "resource_id"],
                name="flow_inbox_resource",
            )
        ]
