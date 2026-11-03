"""BCH Flow monitor-only settings. Import the guarded local settings first."""
from .settings import *  # noqa: F401,F403
import os
from django.core.exceptions import ImproperlyConfigured

_MONITOR_USER = os.environ.get('BCHFLOW_MONITOR_DB_USER', '')
_MONITOR_PASSWORD = os.environ.get('BCHFLOW_MONITOR_DB_PASSWORD', '')
if _MONITOR_USER != 'bchflow_monitor_ro' or not _MONITOR_PASSWORD:
    raise ImproperlyConfigured('Monitor read-only database credentials are required')
DATABASES['default'] = {**DATABASES['default'],
                        'USER': _MONITOR_USER,
                        'PASSWORD': _MONITOR_PASSWORD,
                        'OPTIONS': {**DATABASES['default'].get('OPTIONS', {}),
                                    'options': '-c default_transaction_read_only=on'}}
