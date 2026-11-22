"""Shared settings for the BCH Flow Django entrypoints."""
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(DJANGO_DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / '.env')
DEBUG = env.bool('DJANGO_DEBUG', default=False)
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'app_bch_flow.apps.BCHFlowConfig',
    'app_merchant_catalog.apps.MerchantCatalogConfig',
    'bch_wallet_v301',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'app_bch_flow.localization.ExplicitLocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.template.context_processors.i18n',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
LANGUAGE_CODE = 'en'
LANGUAGES = [('en','English'),('pt-br','Português'),('es','Español'),('fr','Français'),('de','Deutsch'),('zh-hans','简体中文'),('ja','日本語'),('ar','العربية'),('hi','हिन्दी')]
LOCALE_PATHS = [BASE_DIR / 'locale']
LANGUAGE_COOKIE_NAME = 'bchflow_language'
LANGUAGE_COOKIE_AGE = 31536000
LANGUAGE_COOKIE_HTTPONLY = True
LANGUAGE_COOKIE_SAMESITE = 'Lax'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
SESSION_COOKIE_SECURE = env.bool('DJANGO_SESSION_COOKIE_SECURE', default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool('DJANGO_CSRF_COOKIE_SECURE', default=not DEBUG)
# Existing BCH Flow safety gates must remain active. No live payment enablement.

# Multi-asset orchestration: sandbox is explicit; live integrations are opt-in.
# The JSON config contains environment-variable NAMES, never credential values.
import json as _json
FLOW_PAYMENTS_SANDBOX_ENABLED = env.bool('FLOW_PAYMENTS_SANDBOX_ENABLED', default=DEBUG)
FLOW_PAYMENTS_ALLOW_LIVE = env.bool('FLOW_PAYMENTS_ALLOW_LIVE', default=False)

# BCH Flow: expor somente o nome do usuario RPC ao provider (nao e segredo).
import os as _bchflow_os
_bchflow_os.environ.setdefault('BCHFLOW_BTC_RPC_USER', env('BCHFLOW_BTC_RPC_USER', default=''))

# BTC/BCH blockchain RPC config is separate from BRL/PIX payment providers.
# The optional JSON maps organization -> asset -> environment -> RPC metadata.
# Secrets must be referenced using *_env or *_file, not embedded in JSON.
FLOW_BLOCKCHAIN_NODES = {}
_blockchain_nodes_file = env('FLOW_BLOCKCHAIN_NODES_FILE', default='')
if _blockchain_nodes_file:
    with open(_blockchain_nodes_file, encoding='utf-8') as _blockchain_stream:
        FLOW_BLOCKCHAIN_NODES = _json.load(_blockchain_stream)
    if not isinstance(FLOW_BLOCKCHAIN_NODES, dict):
        raise ValueError('FLOW_BLOCKCHAIN_NODES_FILE must contain a JSON object')

FLOW_PAYMENT_PROVIDERS = {}
_provider_file = env('FLOW_PROVIDER_CONFIG_FILE', default='')
if _provider_file:
    with open(_provider_file, encoding='utf-8') as _provider_stream:
        FLOW_PAYMENT_PROVIDERS = _json.load(_provider_stream)


# Merchant credentials are encrypted with a separately managed key, never SECRET_KEY.
FLOW_CREDENTIAL_ENCRYPTION_KEYS = env.list('FLOW_CREDENTIAL_ENCRYPTION_KEYS', default=[])
FLOW_CREDENTIAL_KEY_FILE = env('FLOW_CREDENTIAL_KEY_FILE', default='')
FLOW_MP_OAUTH = {
    'client_id': env('MP_CLIENT_ID', default=''),
    'client_secret_env': 'MP_CLIENT_SECRET',
    'redirect_uri': env('MP_REDIRECT_URI', default=''),
    'webhook_secret_file': env('MP_WEBHOOK_SECRET_FILE', default=''),
}

# BCH CATALOG V1.1 PRIVATE MEDIA
MEDIA_ROOT = BASE_DIR / "private_media"
