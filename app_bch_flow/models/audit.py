import uuid
from django.db import models

class BCHAuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', null=True, on_delete=models.PROTECT)
    actor = models.ForeignKey('app_bch_flow.BCHIdentity', null=True, on_delete=models.PROTECT)
    event_type = models.CharField(max_length=120)
    metadata = models.JSONField(default=dict)
    request_id = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_audit_event'
        indexes = [models.Index(fields=['organization','created_at'], name='bch_audit_org_date')]

class BCHFinancialEvent(models.Model):
    """Append-only intent/observation history. No private key or raw signature storage."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', on_delete=models.PROTECT)
    invoice = models.ForeignKey('app_bch_flow.BCHInvoice', null=True, blank=True, on_delete=models.PROTECT)
    payment = models.ForeignKey('app_bch_flow.BCHPayment', null=True, blank=True, on_delete=models.PROTECT)
    transfer = models.ForeignKey('app_bch_flow.BCHTransfer', null=True, blank=True, on_delete=models.PROTECT)
    event_type = models.CharField(max_length=80)
    previous_status = models.CharField(max_length=32, blank=True)
    next_status = models.CharField(max_length=32, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_financial_event'
        indexes = [models.Index(fields=['organization','created_at'], name='bch_fin_event_org_date')]
        constraints = [models.CheckConstraint(condition=(models.Q(invoice__isnull=False,payment__isnull=True,transfer__isnull=True) | models.Q(invoice__isnull=True,payment__isnull=False,transfer__isnull=True) | models.Q(invoice__isnull=True,payment__isnull=True,transfer__isnull=False)), name='bch_fin_event_one_subject')]
