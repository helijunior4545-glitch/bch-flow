"""Guest capability access. An email address alone never authorizes a purchase."""
import hashlib
import re
import secrets
import uuid
from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import Http404
from django.urls import reverse
from django.utils import timezone
from .models import SoftwareGuestSession, SoftwareOrder

GUEST_COOKIE = 'bch_software_guest'
RECOVERY_SALT = 'software-order-recovery-v1'
GRANTS_KEY = 'software_order_grants'
TOKEN_PATTERN = re.compile(r'^[A-Za-z0-9_-]{43}$')


def token_digest(token):
    return hashlib.sha256(token.encode('ascii')).hexdigest()


def browser_token(request):
    token = request.COOKIES.get(GUEST_COOKIE, '')
    if not TOKEN_PATTERN.fullmatch(token):
        return secrets.token_urlsafe(32)
    guest = SoftwareGuestSession.objects.filter(token_digest=token_digest(token)).first()
    if guest and guest.expires_at <= timezone.now():
        return secrets.token_urlsafe(32)
    return token


def set_guest_cookie(response, token):
    response.set_cookie(GUEST_COOKIE, token, max_age=30 * 86400, httponly=True,
                        secure=not settings.DEBUG, samesite='Lax', path='/')
    return response


def current_guest(request):
    token = request.COOKIES.get(GUEST_COOKIE, '')
    if not TOKEN_PATTERN.fullmatch(token):
        return None
    return SoftwareGuestSession.objects.filter(
        token_digest=token_digest(token), expires_at__gt=timezone.now()).first()


def recovery_token(order):
    return signing.dumps({'order': str(order.pk), 'guest': str(order.guest_id),
                          'digest': order.guest.token_digest}, salt=RECOVERY_SALT, compress=True)


def recovery_claims(token):
    try:
        data = signing.loads(token, salt=RECOVERY_SALT)
        digest = data['digest']
        if not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest):
            raise ValueError
        return {'pk': uuid.UUID(data['order']), 'guest_id': uuid.UUID(data['guest']),
                'guest__token_digest': digest, 'buyer__isnull': True}
    except (signing.BadSignature, KeyError, ValueError, TypeError, AttributeError):
        raise Http404 from None


def recovery_order(token):
    try:
        return SoftwareOrder.objects.select_related('guest').get(**recovery_claims(token))
    except (SoftwareOrder.DoesNotExist, ValidationError):
        raise Http404 from None


def guest_order_filter(request):
    guest = current_guest(request)
    allowed = Q(guest=guest) if guest else Q(pk__in=[])
    # A recovered link grants only its own order, never the other purchases made
    # by the original browser (even when those share an email address).
    for token in list(request.session.get(GRANTS_KEY, {}).values())[-50:]:
        try:
            allowed |= Q(**recovery_claims(token))
        except Http404:
            continue
    return allowed


def recovery_url(request, order):
    return request.build_absolute_uri(reverse('bch_flow:software_recover', args=[recovery_token(order)]))
