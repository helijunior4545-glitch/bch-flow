import uuid
from django.db import models
from django.db.models import Q

class BCHOrganization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'bchflow_organization'
        constraints = [models.CheckConstraint(condition=~Q(name=''), name='bch_org_name_not_blank')]

class BCHMembership(models.Model):
    ROLE_CHOICES = [(v,v) for v in ('owner','admin','operator','viewer')]
    identity = models.ForeignKey('app_bch_flow.BCHIdentity', on_delete=models.CASCADE, related_name='memberships')
    organization = models.ForeignKey(BCHOrganization, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_membership'
        constraints = [models.UniqueConstraint(fields=['identity','organization'], name='bchflow_unique_member'), models.CheckConstraint(condition=Q(role__in=['owner','admin','operator','viewer']), name='bch_membership_valid_role')]
        indexes = [models.Index(fields=['organization','is_active'], name='bch_member_org_active')]
