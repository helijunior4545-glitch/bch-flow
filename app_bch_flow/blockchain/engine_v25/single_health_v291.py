"""V2.9.1 explicit single-provider health; never observes addresses or changes invoices."""
import os
from .blockbook_v26 import BlockbookProvider
from .engine import ProviderFailure
from .health_v29 import inspect_status


def diagnose_one(suffix='A', *, probe=False):
    if suffix not in ('A', 'B'):
        raise ValueError('provider suffix must be A or B')
    name = 'blockbook_' + suffix.lower()
    endpoint = os.getenv('BCHFLOW_V26_PROVIDER_' + suffix + '_URL', '').strip()
    key = os.getenv('BCHFLOW_V26_PROVIDER_' + suffix + '_KEY', '')
    result = {'provider': name, 'configured': bool(endpoint), 'probed': False,
              'state': 'NOT_CONFIGURED'}
    if not endpoint:
        return result
    try:
        provider = BlockbookProvider(name, endpoint, api_key=key)
    except (ValueError, TypeError):
        result['state'] = 'INVALID_CONFIGURATION'
        return result
    result['state'] = 'CONFIGURED_NOT_TESTED'
    if not probe:
        return result
    result['probed'] = True
    try:
        result['state'] = inspect_status(provider._get('/api'))
    except ProviderFailure as exc:
        code = str(exc)
        result['state'] = code.upper() if code in {
            'provider_error', 'provider_timeout', 'provider_auth_error',
            'provider_invalid_response', 'provider_not_synced', 'provider_wrong_network'
        } else 'PROVIDER_FAILURE'
    except Exception:
        result['state'] = 'PROVIDER_FAILURE'
    return result
