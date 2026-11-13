import uuid
from django.db import models
from django.db.models import Q

NETWORKS = [('mainnet','mainnet'), ('chipnet','chipnet')]
PROVIDERS = [('wizardconnect','wizardconnect'), ('xo_template','xo_template')]

class BCHWalletConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey('app_bch_flow.BCHIdentity', on_delete=models.CASCADE, related_name='wallets')
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', null=True, blank=True, on_delete=models.PROTECT)
    provider = models.CharField(max_length=32, choices=PROVIDERS)
    public_address = models.CharField(max_length=160)
    network = models.CharField(max_length=16, default='mainnet', choices=NETWORKS)
    proof_method = models.CharField(max_length=40, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = 'bchflow_wallet_connection'
        indexes = [models.Index(fields=['identity','revoked_at'], name='bch_wallet_owner_active'), models.Index(fields=['organization','network'], name='bch_wallet_org_network')]
        constraints = [
            models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']), name='bch_wallet_valid_network'),
            models.CheckConstraint(condition=Q(provider__in=['wizardconnect','xo_template']), name='bch_wallet_valid_provider'),
            models.CheckConstraint(condition=Q(verified_at__isnull=True) | ~Q(proof_method=''), name='bch_wallet_verified_has_proof'),
        ]
    def clean(self):
        from django.core.exceptions import ValidationError
        from app_bch_flow.core.address_validation import validate_cashaddr
        validate_cashaddr(self.public_address, self.network)
        if self.organization_id and self.identity_id:
            from app_bch_flow.models import BCHMembership
            if not BCHMembership.objects.filter(identity_id=self.identity_id, organization_id=self.organization_id, is_active=True).exists():
                raise ValidationError('Wallet owner must be active organization member')

class BCHWalletChallenge(models.Model):
    """Hash of a single-use wallet proof challenge; no private keys or signatures stored."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey('app_bch_flow.BCHIdentity', on_delete=models.CASCADE)
    organization = models.ForeignKey('app_bch_flow.BCHOrganization', null=True, blank=True, on_delete=models.PROTECT)
    public_address = models.CharField(max_length=160)
    network = models.CharField(max_length=16, choices=NETWORKS)
    provider = models.CharField(max_length=32, choices=PROVIDERS)
    challenge_digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'bchflow_wallet_challenge'
        indexes = [models.Index(fields=['identity','expires_at'], name='bch_challenge_identity_exp')]
        constraints = [models.CheckConstraint(condition=Q(network__in=['mainnet','chipnet']), name='bch_challenge_network')]
