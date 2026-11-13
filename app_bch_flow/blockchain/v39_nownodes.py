"""V3.9 NOWNodes BCH Blockbook: authenticated, read-only, fail-closed."""
import os
import re
from urllib.parse import urlsplit
from urllib.request import Request
from .v34_blockbook import BlockbookReadOnlyProvider, NetworkReadError, _integer

HOST = 'bchbook.nownodes.io'
BASE = 'https://' + HOST

class NOWNodesBCHProvider(BlockbookReadOnlyProvider):
    def __init__(self, **kwargs):
        if os.getenv('BCHFLOW_V39_ENABLE_NOWNODES') != '1':
            raise NetworkReadError('NOWNodes disabled; explicit opt-in required')
        key = os.getenv('BCHFLOW_V39_NOWNODES_API_KEY', '')
        if not isinstance(key, str) or not key or len(key) > 512 or any(ord(c) < 33 or ord(c) > 126 for c in key):
            raise NetworkReadError('Missing or invalid NOWNodes API key')
        # V3.4 performs TLS/redirect/response limits and address evidence validation.
        # V3.9 explicitly requires the original V3.4 network gate and host allowlist.
        super().__init__(**kwargs)
        if self.base != BASE:
            raise NetworkReadError('V3.9 requires exact NOWNodes HTTPS host')
        self._api_key = key

    def _get(self, path, params):
        # V3.4 owns the bounded HTTPS transport; intercept Request creation in
        # an instance-local opener wrapper so auth never leaks into URL/logs.
        original = self.opener
        key = self._api_key
        class AuthOpener:
            def open(self, request, timeout):
                if not isinstance(request, Request):
                    raise NetworkReadError('Unexpected request type')
                parsed = urlsplit(request.full_url)
                if parsed.scheme != 'https' or parsed.hostname != HOST or parsed.port not in (None, 443) or parsed.username or parsed.password:
                    raise NetworkReadError('Authentication destination rejected')
                request.add_unredirected_header('api-key', key)
                return original.open(request, timeout=timeout)
        self.opener = AuthOpener()
        try:
            return super()._get(path, params)
        finally:
            self.opener = original

    def status(self):
        data = self._get('/api/status', {})
        book, backend = data.get('blockbook'), data.get('backend')
        if not isinstance(book, dict) or not isinstance(backend, dict):
            raise NetworkReadError('Invalid NOWNodes status schema')
        if book.get('coin') != 'Bcash' or book.get('network') != 'BCH' or backend.get('chain') != 'main':
            raise NetworkReadError('NOWNodes BCH mainnet identity mismatch')
        if book.get('inSync') is not True or book.get('initialSync') is not False or book.get('inSyncMempool') is not True:
            raise NetworkReadError('NOWNodes not fully synchronized')
        height = _integer(book.get('bestHeight'), 'Blockbook height', 100_000_000)
        blocks = _integer(backend.get('blocks'), 'backend height', 100_000_000)
        headers = _integer(backend.get('headers'), 'backend headers', 100_000_000)
        if height == 0 or height != blocks or blocks != headers:
            raise NetworkReadError('NOWNodes chain height disagreement')
        return {'coin':'BCH', 'network':'mainnet', 'height':height, 'in_sync':True, 'provider':HOST}

    def outputs_for_address(self, *, network, address):
        self.status()  # no address evidence if provider reports unsynchronized
        return super().outputs_for_address(network=network, address=address)
