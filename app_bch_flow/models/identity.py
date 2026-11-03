"""Standalone BCH Flow identity. Not Django AUTH_USER_MODEL."""
import uuid
from django.db import models
from django.db.models import Q
from django.utils import timezone

class BCHIdentity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'bchflow_identity'
        constraints = [models.CheckConstraint(condition=~Q(email=''), name='bch_identity_email_not_blank')]
    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)
    def set_password(self, raw):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw)
    def check_password(self, raw):
        from django.contrib.auth.hashers import check_password
        return check_password(raw, self.password_hash)

class BCHSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(BCHIdentity, on_delete=models.CASCADE, related_name='sessions')
    token_digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = 'bchflow_session'
        indexes = [models.Index(fields=['identity','expires_at'], name='bch_session_identity_exp')]
        constraints = [models.CheckConstraint(condition=Q(expires_at__gt=models.F('created_at')), name='bch_session_exp_after_create')]
    @property
    def valid(self):
        return self.revoked_at is None and self.expires_at > timezone.now() and self.identity.is_active
