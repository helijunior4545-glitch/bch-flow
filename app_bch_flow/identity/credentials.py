"""Use Django password hashing without coupling to the host user model."""
from django.contrib.auth.hashers import make_password, check_password

def hash_password(raw):
    if not isinstance(raw, str) or len(raw) < 12:
        raise ValueError("Password must be at least 12 characters")
    return make_password(raw)

def verify_password(raw, encoded):
    return check_password(raw, encoded)
