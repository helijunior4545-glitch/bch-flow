"""V2.8 explicit provider preflight. No network on status reads; fail closed."""
import os
from urllib.parse import urlsplit
from .blockbook_v26 import BlockbookProvider
from .engine import observe


def provider_status():
    enabled = os.getenv('BCHFLOW_V26_ENABLE_OBSERVATION') == '1'
    records = []
    origins = []
    providers = []
    for suffix, name in (('A', 'blockbook_a'), ('B', 'blockbook_b')):
        endpoint = os.getenv('BCHFLOW_V26_PROVIDER_' + suffix + '_URL', '').strip()
        key = os.getenv('BCHFLOW_V26_PROVIDER_' + suffix + '_KEY', '')
        if not endpoint:
            records.append({'name': name, 'state': 'NOT_CONFIGURED'})
            continue
        try:
            provider = BlockbookProvider(name, endpoint, api_key=key)
            # Prevent same-origin providers from being counted as independent sources.
            if provider.origin in origins:
                records.append({'name': name, 'state': 'DUPLICATE_ORIGIN'})
            else:
                origins.append(provider.origin)
                providers.append(provider)
                records.append({'name': name, 'state': 'CONFIGURED_NOT_TESTED'})
        except (ValueError, TypeError):
            records.append({'name': name, 'state': 'INVALID_CONFIGURATION'})
    ready = enabled and len(providers) == 2 and len(origins) == 2
    state = ('DISABLED' if not enabled else 'READY_NOT_TESTED' if ready else 'INCOMPLETE_CONFIGURATION')
    return {'state': state, 'providers': tuple(records), 'ready': ready}, tuple(providers)


def observe_configured(address):
    status, providers = provider_status()
    return observe(address, providers if status['ready'] else (), enabled=status['ready'], minimum_agreement=2)
