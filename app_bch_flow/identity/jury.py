"""Provision and authenticate a dedicated, ordinary customer account for jurors."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils.text import slugify
from app_bch_flow.models import BCHIdentity, BCHMembership, BCHOrganization
from .services import register_identity, authenticate_identity, create_organization


class JuryConfigurationError(Exception):
    pass


def configuration():
    return (
        getattr(settings, 'FLOW_JURY_EMAIL', '').strip().lower(),
        getattr(settings, 'FLOW_JURY_PASSWORD', ''),
        slugify(getattr(settings, 'FLOW_JURY_ORGANIZATION_SLUG', 'bch-flow-jury')),
    )


def access_context():
    email, password, _slug = configuration()
    return {'jury_configured': bool(email and password)}


def authenticate_juror():
    email, password, slug = configuration()
    if not email or not password:
        raise JuryConfigurationError('Configure FLOW_JURY_EMAIL and FLOW_JURY_PASSWORD.')
    identity = authenticate_identity(email, password)
    if not identity or identity.is_demo:
        raise JuryConfigurationError('The configured jury customer account is unavailable.')
    member = BCHMembership.objects.select_related('organization').filter(
        identity=identity, organization__slug=slug, is_active=True,
        organization__is_active=True,
    ).first()
    if not member:
        raise JuryConfigurationError('The configured jury organization is unavailable.')
    return identity, member.organization


@transaction.atomic
def provision_juror():
    email, password, slug = configuration()
    try:
        validate_email(email)
    except ValidationError:
        raise JuryConfigurationError('Configure a valid FLOW_JURY_EMAIL.') from None
    if len(password) < 12:
        raise JuryConfigurationError('FLOW_JURY_PASSWORD must have at least 12 characters.')
    if not slug:
        raise JuryConfigurationError('Configure FLOW_JURY_ORGANIZATION_SLUG.')
    identity = BCHIdentity.objects.select_for_update().filter(email=email).first()
    created = identity is None
    if identity:
        if identity.is_demo or not identity.is_active or not identity.check_password(password):
            raise JuryConfigurationError('Existing account credentials or account type do not match; nothing was changed.')
        member = BCHMembership.objects.select_related('organization').filter(
            identity=identity, organization__slug=slug, is_active=True,
            organization__is_active=True,
        ).first()
        if member:
            return identity, member.organization, False
        if identity.memberships.exists():
            raise JuryConfigurationError('This account already belongs to another organization; nothing was changed.')
    if BCHOrganization.objects.filter(slug=slug).exists():
        raise JuryConfigurationError('The organization slug is already in use; nothing was changed.')
    if created:
        identity = register_identity(email, password)
    organization = create_organization(identity, 'BCH Flow · Jury', slug)
    return identity, organization, created
