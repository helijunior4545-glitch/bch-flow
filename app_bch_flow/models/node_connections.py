"""Public wallet configuration; private signing material never enters these records."""

import uuid
from django.db import models
from .organizations import BCHOrganization


class FlowNodeConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(BCHOrganization, on_delete=models.PROTECT)
    asset = models.CharField(
        max_length=3, choices=[("BTC", "Bitcoin"), ("BCH", "Bitcoin Cash")]
    )
    environment = models.CharField(max_length=16, default="live")
    provider = models.CharField(max_length=32, default="nownodes")
    name = models.CharField(max_length=80, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    public_key = models.CharField(max_length=120)
    wallet_fingerprint = models.CharField(max_length=64, unique=True)
    api_ciphertext = models.TextField()
    confirmations = models.PositiveSmallIntegerField(default=3)
    next_receive = models.PositiveIntegerField(default=0)
    next_change = models.PositiveIntegerField(default=0)
    verified_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)


class FlowDerivedAddress(models.Model):
    connection = models.ForeignKey(
        FlowNodeConnection, on_delete=models.PROTECT, related_name="addresses"
    )
    branch = models.PositiveSmallIntegerField()
    index = models.PositiveIntegerField()
    address = models.CharField(max_length=180, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["connection", "branch", "index"],
                name="flow_node_derivation_unique",
            )
        ]
