from django.db import models
from django.db.models import Q

class BCHMerchant(models.Model):
    organization = models.OneToOneField('app_bch_flow.BCHOrganization', on_delete=models.PROTECT, primary_key=True)
    display_name = models.CharField(max_length=160)
    receiving_cashaddr = models.CharField(max_length=160)
    network = models.CharField(max_length=16, default='mainnet', choices=[('mainnet','mainnet'),('chipnet','chipnet')])
    enabled = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_merchant'
        constraints = [models.CheckConstraint(condition=Q(enabled=False) | Q(verified_at__isnull=False), name='bch_merchant_verified_enabled'), models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']), name='bch_merchant_network')]
    def clean(self):
        from django.core.exceptions import ValidationError
        from app_bch_flow.core.address_validation import validate_cashaddr
        validate_cashaddr(self.receiving_cashaddr, self.network)
        if self.enabled and not self.verified_at:
            raise ValidationError('Merchant receiving address must be verified before activation')
