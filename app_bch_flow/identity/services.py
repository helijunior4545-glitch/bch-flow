from django.core.exceptions import ValidationError
from django.db import IntegrityError,transaction
from django.utils.text import slugify
from app_bch_flow.models import BCHIdentity,BCHOrganization,BCHMembership

def register_identity(email,password):
    email = email.strip().lower()
    if not email or len(password)<12:
        raise ValidationError('Email and a password of at least 12 characters are required')
    identity = BCHIdentity(email=email)
    identity.set_password(password)
    identity.full_clean()
    identity.save()
    return identity

def authenticate_identity(email,password):
    identity = BCHIdentity.objects.filter(email=email.strip().lower(),is_active=True).first()
    if identity and identity.check_password(password):
        return identity
    return None

def create_organization(identity,name,slug):
    slug = slugify(slug)
    if not slug or len(slug)>80:
        raise ValidationError('Invalid organization slug')
    with transaction.atomic(using='default'):
        org = BCHOrganization.objects.create(name=name.strip(),slug=slug)
        BCHMembership.objects.create(identity=identity,organization=org,role='owner')
    return org

def require_membership(identity,organization,roles=('owner','admin','operator','viewer')):
    return BCHMembership.objects.select_related('organization').get(identity=identity,organization=organization,is_active=True,organization__is_active=True,role__in=roles)
