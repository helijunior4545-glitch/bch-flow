"""V2.9 read-only provider health. No address/UTXO query, no database writes."""
from .engine import ProviderFailure
from .runtime_v26 import provider_status


def inspect_status(payload):
    if not isinstance(payload, dict):
        return 'INVALID_RESPONSE'
    book, backend = payload.get('blockbook'), payload.get('backend')
    if not isinstance(book, dict) or not isinstance(backend, dict):
        return 'INVALID_RESPONSE'
    coin = str(book.get('coin', '')).lower()
    if backend.get('chain') not in ('main', 'mainnet') or coin not in ('bcash', 'bitcoin cash', 'bitcoincash', 'bch'):
        return 'WRONG_NETWORK'
    if book.get('inSync') is not True or book.get('initialSync') is True:
        return 'NOT_SYNCED'
    return 'HEALTHY'


def diagnose(*, probe=False, status_provider=provider_status):
    """Return sanitized diagnostic records; probe=True alone authorizes /api GET."""
    status, providers = status_provider()
    result = {'configuration': status['state'], 'ready': bool(status['ready']),
              'probed': False, 'overall': 'NOT_TESTED', 'providers': []}
    if not status['ready']:
        result['overall'] = 'DISABLED' if status['state'] == 'DISABLED' else 'INCOMPLETE_CONFIGURATION'
        result['providers'] = [{'name': r['name'], 'state': r['state']} for r in status['providers']]
        return result
    if not probe:
        result['providers'] = [{'name': p.name, 'state': 'NOT_TESTED'} for p in providers]
        return result
    result['probed'] = True
    for provider in providers:
        try:
            state = inspect_status(provider._get('/api'))
        except ProviderFailure as exc:
            state = 'PROVIDER_FAILURE'
            # Only known public-safe error codes; never include HTTP body or key.
            detail = str(exc)
            if detail in {'provider_error','provider_timeout','provider_auth_error','provider_invalid_response','provider_not_synced','provider_wrong_network'}:
                state = detail.upper()
        except Exception:
            state = 'PROVIDER_FAILURE'
        result['providers'].append({'name': provider.name, 'state': state})
    states = [r['state'] for r in result['providers']]
    result['overall'] = 'HEALTHY' if len(states) == 2 and all(s == 'HEALTHY' for s in states) else 'DEGRADED'
    return result
