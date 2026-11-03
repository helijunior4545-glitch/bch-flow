"""BCH financial records. Recording an operation never broadcasts a transaction."""
import uuid
from django.db import models
from django.db.models import Q, F

NETWORKS = [('mainnet','mainnet'), ('chipnet','chipnet')]
INVOICE_STATES = [('created','created'), ('pending','pending'), ('partial','partial'), ('paid','paid'), ('expired','expired'), ('cancelled','cancelled')]
PAYMENT_STATES = [('created','created'), ('observed','observed'), ('confirming','confirming'), ('confirmed','confirmed'), ('rejected','rejected'), ('reorged','reorged')]
TRANSFER_STATES = [('created','created'), ('awaiting_authorization','awaiting_authorization'), ('authorized','authorized'), ('broadcast','broadcast'), ('confirming','confirming'), ('confirmed','confirmed'), ('failed','failed'), ('cancelled','cancelled'), ('reorged','reorged')]
IDEMPOTENCY_STATES = [('processing','processing'), ('completed','completed'), ('failed','failed')]

class BCHExchangeRateSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fiat_currency = models.CharField(max_length=3, default='BRL')
    fiat_per_bch = models.DecimalField(max_digits=22, decimal_places=8)
    provider = models.CharField(max_length=100)
    observed_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_exchange_rate'
        constraints = [models.CheckConstraint(condition=Q(fiat_per_bch__gt=0), name='bchflow_rate_positive'), models.CheckConstraint(condition=Q(expires_at__gt=F('observed_at')), name='bch_rate_valid_window')]

class BCHInvoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', on_delete=models.PROTECT)
    external_reference = models.CharField(max_length=120, blank=True)
    description = models.CharField(max_length=255, blank=True)
    amount_satoshis = models.BigIntegerField()
    receiving_cashaddr = models.CharField(max_length=160)
    network = models.CharField(max_length=16, default='mainnet', choices=NETWORKS)
    status = models.CharField(max_length=32, default='created', choices=INVOICE_STATES)
    exchange_rate = models.ForeignKey(BCHExchangeRateSnapshot, null=True, blank=True, on_delete=models.PROTECT)
    expires_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'bchflow_invoice'
        constraints = [
            models.CheckConstraint(condition=Q(amount_satoshis__gt=0), name='bchflow_invoice_positive'),
            models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']), name='bch_invoice_network'),
            models.CheckConstraint(condition=Q(status__in=[v for v,_ in INVOICE_STATES]), name='bch_invoice_state'),
            models.UniqueConstraint(fields=['organization','external_reference'], condition=~Q(external_reference=''), name='bch_invoice_external_ref'),
        ]
        indexes = [models.Index(fields=['organization','status'], name='bch_invoice_org_status')]
    def clean(self):
        from django.core.exceptions import ValidationError
        from app_bch_flow.core.address_validation import validate_cashaddr
        validate_cashaddr(self.receiving_cashaddr, self.network)
        if self.created_at and self.expires_at <= self.created_at:
            raise ValidationError('Invoice expiry must be after creation')

class BCHTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    txid = models.CharField(max_length=64)
    network = models.CharField(max_length=16, default='mainnet', choices=NETWORKS)
    confirmations = models.PositiveIntegerField(default=0)
    block_hash = models.CharField(max_length=64, blank=True)
    block_height = models.PositiveBigIntegerField(null=True, blank=True)
    verification_source = models.CharField(max_length=120, blank=True)
    observed_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = 'bchflow_transaction'
        constraints = [models.UniqueConstraint(fields=['network','txid'], name='bchflow_unique_network_txid'), models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']), name='bch_tx_network')]
    def clean(self):
        from django.core.exceptions import ValidationError
        import re
        if not re.fullmatch(r'[0-9a-fA-F]{64}', self.txid or ''):
            raise ValidationError({'txid':'TXID must contain 64 hex characters'})
        if self.verified_at and not self.verification_source:
            raise ValidationError('Verified transaction requires verification source')
    def save(self, *args, **kwargs):
        self.txid = self.txid.lower()
        super().save(*args, **kwargs)

class BCHPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', on_delete=models.PROTECT)
    invoice = models.ForeignKey(BCHInvoice, on_delete=models.PROTECT, related_name='payments')
    transaction = models.ForeignKey(BCHTransaction, on_delete=models.PROTECT, null=True, blank=True)
    output_index = models.PositiveIntegerField(null=True, blank=True)
    received_satoshis = models.BigIntegerField(default=0)
    status = models.CharField(max_length=32, default='created', choices=PAYMENT_STATES)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'bchflow_payment'
        constraints = [
            models.CheckConstraint(condition=Q(received_satoshis__gte=0), name='bchflow_payment_nonnegative'),
            models.CheckConstraint(condition=Q(status__in=[v for v,_ in PAYMENT_STATES]), name='bch_payment_state'),
            models.CheckConstraint(condition=(Q(transaction__isnull=True, output_index__isnull=True) | Q(transaction__isnull=False, output_index__isnull=False)), name='bch_payment_tx_output_pair'),
            models.UniqueConstraint(fields=['transaction','output_index'], condition=Q(transaction__isnull=False), name='bchflow_unique_payment_output'),
        ]
        indexes = [models.Index(fields=['organization','status'], name='bch_payment_org_status')]
    def clean(self):
        from django.core.exceptions import ValidationError
        errors = {}
        if self.invoice_id and self.organization_id and self.invoice.organization_id != self.organization_id:
            errors['organization'] = 'Payment organization differs from invoice'
        if self.transaction_id and self.invoice_id and self.transaction.network != self.invoice.network:
            errors['transaction'] = 'Transaction network differs from invoice'
        if self.status == 'confirmed' and (not self.transaction_id or not self.verified_at):
            errors['status'] = 'Confirmed payment requires transaction and verified timestamp'
        if errors: raise ValidationError(errors)

class BCHTransfer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey('app_bch_flow.BCHIdentity', on_delete=models.PROTECT)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', null=True, blank=True, on_delete=models.PROTECT)
    source_wallet = models.ForeignKey('app_bch_flow.BCHWalletConnection', null=True, blank=True, on_delete=models.PROTECT)
    recipient_cashaddr = models.CharField(max_length=160)
    network = models.CharField(max_length=16, default='mainnet', choices=NETWORKS)
    amount_satoshis = models.BigIntegerField()
    fee_satoshis = models.BigIntegerField(null=True, blank=True)
    transaction = models.ForeignKey(BCHTransaction, on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=32, default='created', choices=TRANSFER_STATES)
    authorization_reference = models.CharField(max_length=120, blank=True)
    authorized_at = models.DateTimeField(null=True, blank=True)
    broadcast_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    failure_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'bchflow_transfer'
        constraints = [
            models.CheckConstraint(condition=Q(amount_satoshis__gt=0), name='bchflow_transfer_positive'),
            models.CheckConstraint(condition=Q(fee_satoshis__isnull=True) | Q(fee_satoshis__gte=0), name='bch_transfer_fee_nonnegative'),
            models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']), name='bch_transfer_network'),
            models.CheckConstraint(condition=Q(status__in=[v for v,_ in TRANSFER_STATES]), name='bch_transfer_state'),
            models.CheckConstraint(condition=~Q(status='confirmed') | Q(confirmed_at__isnull=False, transaction__isnull=False), name='bch_transfer_confirmed_evidence'),
        ]
        indexes = [models.Index(fields=['organization','created_at'], name='bch_transfer_org_date')]
    def clean(self):
        from django.core.exceptions import ValidationError
        from app_bch_flow.core.address_validation import validate_cashaddr
        validate_cashaddr(self.recipient_cashaddr, self.network)
        errors = {}
        if self.transaction_id and self.transaction.network != self.network:
            errors['transaction'] = 'Transfer and transaction networks differ'
        if self.source_wallet_id:
            wallet = self.source_wallet
            if wallet.identity_id != self.identity_id or wallet.organization_id != self.organization_id or wallet.network != self.network:
                errors['source_wallet'] = 'Source wallet must match identity, organization and network'
            if wallet.revoked_at is not None or wallet.verified_at is None:
                errors['source_wallet'] = 'Source wallet must be verified and active'
        if self.organization_id and self.identity_id:
            from app_bch_flow.models import BCHMembership
            if not BCHMembership.objects.filter(identity_id=self.identity_id, organization_id=self.organization_id, is_active=True).exists():
                errors['organization'] = 'Identity must be an active organization member'
        if errors: raise ValidationError(errors)

class BCHIdempotencyKey(models.Model):
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', on_delete=models.PROTECT)
    key = models.CharField(max_length=160)
    request_digest = models.CharField(max_length=64)
    state = models.CharField(max_length=20, default='processing', choices=IDEMPOTENCY_STATES)
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    response_body = models.JSONField(null=True, blank=True)
    locked_until = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'bchflow_idempotency_key'
        constraints = [models.UniqueConstraint(fields=['organization','key'], name='bchflow_unique_idempotency'), models.CheckConstraint(condition=Q(state__in=[v for v,_ in IDEMPOTENCY_STATES]), name='bch_idempotency_state')]
