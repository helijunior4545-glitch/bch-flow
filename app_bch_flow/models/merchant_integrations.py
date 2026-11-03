"""Merchant authorization metadata. Secrets are stored only as authenticated ciphertext."""

import uuid
from django.db import models
from django.db.models import Q


class FlowMerchantIdentity(models.Model):
    provider = models.CharField(max_length=24, default="mercadopago")
    collector_id = models.CharField(max_length=80)
    organization = models.ForeignKey(
        "app_bch_flow.BCHOrganization", on_delete=models.PROTECT
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "collector_id"],
                name="flow_receiver_one_organization",
            )
        ]


class FlowProviderConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "app_bch_flow.BCHOrganization", on_delete=models.PROTECT
    )
    provider = models.CharField(max_length=24, default="mercadopago")
    environment = models.CharField(max_length=20)
    collector_id = models.CharField(max_length=80, blank=True)
    site_id = models.CharField(max_length=12, blank=True)
    method = models.CharField(max_length=12, default="manual")
    status = models.CharField(max_length=16, default="disconnected")
    access_ciphertext = models.TextField(blank=True)
    refresh_ciphertext = models.TextField(blank=True)
    webhook_ciphertext = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey("app_bch_flow.BCHIdentity", on_delete=models.PROTECT)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "provider", "environment"],
                name="flow_merchant_connection_scope",
            ),
            models.CheckConstraint(
                condition=Q(environment__in=["mercadopago_test", "live"]),
                name="flow_connection_environment",
            ),
            models.CheckConstraint(
                condition=Q(status__in=["connected", "disconnected", "error"]),
                name="flow_connection_status",
            ),
        ]


class FlowOAuthGrant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "app_bch_flow.BCHOrganization", on_delete=models.PROTECT
    )
    actor = models.ForeignKey("app_bch_flow.BCHIdentity", on_delete=models.PROTECT)
    environment = models.CharField(max_length=20)
    state_digest = models.CharField(max_length=64, unique=True)
    session_digest = models.CharField(max_length=64)
    verifier_ciphertext = models.TextField()
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
