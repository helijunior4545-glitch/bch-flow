"""BCH Flow local development settings."""

from .base import *  # noqa: F403

SECRET_KEY = env('DJANGO_SECRET_KEY')
if SECRET_KEY in {'REPLACE_WITH_RANDOM_SECRET', ''}:
    raise RuntimeError('Set a random DJANGO_SECRET_KEY in .env')
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
