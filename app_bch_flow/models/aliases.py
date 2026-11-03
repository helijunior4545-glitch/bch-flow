from django.db import models
from django.db.models import Q

class BCHPaymentAlias(models.Model):
    alias = models.CharField(max_length=32, unique=True)
    identity = models.ForeignKey('app_bch_flow.BCHIdentity', null=True, blank=True, on_delete=models.PROTECT)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', null=True, blank=True, on_delete=models.PROTECT)
    cashaddr = models.CharField(max_length=160)
    network = models.CharField(max_length=16, default='mainnet', choices=[('mainnet','mainnet'),('chipnet','chipnet')])
    verified_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_payment_alias'
        constraints = [
            models.CheckConstraint(condition=(Q(identity__isnull=False, organization__isnull=True) | Q(identity__isnull=True, organization__isnull=False)), name='bchflow_alias_one_owner'),
            models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']), name='bch_alias_valid_network'),
            models.CheckConstraint(condition=Q(is_active=False) | Q(verified_at__isnull=False), name='bch_alias_active_verified'),
        ]
    def clean(self):
        from django.core.exceptions import ValidationError
        from app_bch_flow.core.address_validation import validate_cashaddr
        from app_bch_flow.directory.aliases import normalize_alias
        self.alias = normalize_alias(self.alias)
        validate_cashaddr(self.cashaddr, self.network)
        if self.is_active and self.verified_at is None:
            raise ValidationError('Active alias requires verified address ownership')
    def save(self,*args,**kwargs):
        from app_bch_flow.directory.aliases import normalize_alias
        self.alias = normalize_alias(self.alias)
        super().save(*args,**kwargs)
