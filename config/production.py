"""Explicit production entrypoint. Never use the local server for real payments.

Use DJANGO_SETTINGS_MODULE=config.production and inject credentials securely.
FLOW_DATABASE_URL is separate from the existing local-only DB_* configuration.
"""

from .settings import *  # noqa: F403

DEBUG = False
ALLOWED_HOSTS = env.list("FLOW_ALLOWED_HOSTS")
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
    raise RuntimeError("Configure explicit production hostnames")
if len(SECRET_KEY) < 50:
    raise RuntimeError("A strong production DJANGO_SECRET_KEY is required")
DATABASES = {"default": environ.Env.db_url_config(env("FLOW_DATABASE_URL"))}
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
    raise RuntimeError("Financial operations require PostgreSQL")
DATABASES["default"].setdefault("OPTIONS", {})["sslmode"] = "verify-full"
FLOW_PAYMENTS_SANDBOX_ENABLED = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = ["https://" + host for host in ALLOWED_HOSTS]
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False
# Set only when the application is reachable exclusively through a trusted proxy
# that strips incoming X-Forwarded-Proto headers before setting its own.
if env.bool("FLOW_TRUST_HTTPS_PROXY", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
X_FRAME_OPTIONS = "DENY"

LANGUAGE_COOKIE_SECURE = True
