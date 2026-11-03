"""BCH Flow standalone LOCAL-ONLY Django settings. Not for deployment."""
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(DJANGO_DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / '.env')
SECRET_KEY = env('DJANGO_SECRET_KEY')
if SECRET_KEY in {'REPLACE_WITH_RANDOM_SECRET', ''}:
    raise RuntimeError('Set a random DJANGO_SECRET_KEY in .env')
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
    'bch_wallet_v301',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
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
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'
DB_HOST = env('DB_HOST', default='127.0.0.1')
DB_PORT = env('DB_PORT', default='5432')
DB_NAME = env('DB_NAME', default='bchflow_dev')
DB_USER = env('DB_USER', default='bchflow_dev')
if (DB_HOST, DB_PORT, DB_NAME, DB_USER) != ('127.0.0.1', '5432', 'bchflow_dev', 'bchflow_dev'):
    raise RuntimeError('BCH Flow LOCAL: only 127.0.0.1:5432/bchflow_dev as bchflow_dev is allowed')
DB_PASSWORD = env('DB_PASSWORD')
if not DB_PASSWORD or DB_PASSWORD == 'REPLACE_WITH_LOCAL_POSTGRES_PASSWORD':
    raise RuntimeError('Set the local PostgreSQL DB_PASSWORD in .env')
DATABASES = {'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': DB_NAME,
    'USER': DB_USER,
    'PASSWORD': DB_PASSWORD,
    'HOST': DB_HOST,
    'PORT': DB_PORT,
    'CONN_MAX_AGE': 0,
    'OPTIONS': {'connect_timeout': 5},
}}
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
SESSION_COOKIE_SECURE = False  # LOCAL HTTP ONLY.
CSRF_COOKIE_SECURE = False  # LOCAL HTTP ONLY.
# Existing BCH Flow safety gates must remain active. No live payment enablement.
