"""Explicit production entrypoint. Never use the local server for real payments.

Use DJANGO_SETTINGS_MODULE=config.production and inject credentials securely.
The Studio injects DATABASE_URL, SECRET_KEY and ALLOWED_HOSTS.
"""

from .base import *  # noqa: F403

DEBUG = False
MIDDLEWARE = [
    MIDDLEWARE[0],
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[1:],
]
# The Studio snapshot carries app static directories on its read-only filesystem.
# Discover those assets at startup because the Studio build skips collectstatic.
WHITENOISE_USE_FINDERS = True
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[]) or env.list("FLOW_ALLOWED_HOSTS")
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
    raise RuntimeError("Configure explicit production hostnames")
SECRET_KEY = env("SECRET_KEY", default="") or env("DJANGO_SECRET_KEY")
if len(SECRET_KEY) < 50:
    raise RuntimeError("A strong production SECRET_KEY or DJANGO_SECRET_KEY is required")
studio_database_url = env("DATABASE_URL", default="")
DATABASES = {"default": environ.Env.db_url_config(studio_database_url or env("FLOW_DATABASE_URL"))}
if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
    raise RuntimeError("Financial operations require PostgreSQL")
database_options = DATABASES["default"].setdefault("OPTIONS", {})
if studio_database_url:
    database_options.setdefault("sslmode", "verify-full")
else:
    database_options["sslmode"] = "verify-full"
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
