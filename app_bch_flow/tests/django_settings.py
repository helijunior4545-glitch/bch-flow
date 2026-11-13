"""Isolated PostgreSQL test profile. Never use for production or real payments."""

import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parents[2]
SECRET_KEY = "bch-flow-isolated-tests-only-not-a-production-key"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "app_bch_flow",
]
AUTH_USER_MODEL = "auth.User"
DATABASES = {
    "default": dj_database_url.parse(
        os.environ.get("FLOW_TEST_DATABASE_URL", "postgresql://localhost/bch_flow_test")
    )
}
DATABASE_ROUTERS = []
ROOT_URLCONF = "app_bch_flow.tests.django_urls"
MIDDLEWARE = [
    "app_bch_flow.middleware.JurySandboxMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.template.context_processors.csrf",
            ]
        },
    }
]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
LANGUAGE_CODE = "en"
LANGUAGES = [("en", "English"), ("pt-br", "Português"), ("es", "Español")]
STATIC_URL = "/static/"
CSRF_FAILURE_VIEW = "django.views.csrf.csrf_failure"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
FLOW_PAYMENTS_SANDBOX_ENABLED = True
