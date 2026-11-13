"""Independent, opaque sessions. Store only SHA-256 of 256-bit tokens."""
import hashlib
import secrets
from datetime import timedelta
from django.utils import timezone
from app_bch_flow.models import BCHSession
COOKIE_NAME = 'bchflow_session'
SESSION_HOURS = 12

def digest_token(token):
    return hashlib.sha256(token.encode('ascii')).hexdigest()

def create_session(identity):
    token = secrets.token_urlsafe(32)
    session = BCHSession.objects.create(identity=identity,token_digest=digest_token(token),expires_at=timezone.now()+timedelta(hours=SESSION_HOURS))
    return token,session

def resolve_session(token):
    if not token or len(token)>200:
        return None
    try:
        session = BCHSession.objects.select_related('identity').get(token_digest=digest_token(token))
    except (BCHSession.DoesNotExist,ValueError,UnicodeEncodeError):
        return None
    return session if session.valid else None

def revoke_session(token):
    if token:
        BCHSession.objects.filter(token_digest=digest_token(token),revoked_at__isnull=True).update(revoked_at=timezone.now())

def set_session_cookie(response,token):
    response.set_cookie(COOKIE_NAME,token,max_age=SESSION_HOURS*3600,secure=True,httponly=True,samesite='Lax',path='/')

def clear_session_cookie(response):
    response.delete_cookie(COOKIE_NAME,path='/',samesite='Lax')
