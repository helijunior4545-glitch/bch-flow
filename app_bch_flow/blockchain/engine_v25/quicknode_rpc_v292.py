"""BCH mainnet JSON-RPC read-only diagnostic. Never exposes endpoint credentials."""
import json
import os
import ssl
import urllib.error
import urllib.request
from urllib.parse import urlsplit

MAX_RESPONSE = 65536


def endpoint_configured():
    return bool(os.getenv('BCHFLOW_V292_QUICKNODE_RPC_URL', '').strip())


def _endpoint():
    url = os.getenv('BCHFLOW_V292_QUICKNODE_RPC_URL', '').strip()
    if not url:
        raise ValueError('NOT_CONFIGURED')
    parts = urlsplit(url)
    hostname = (parts.hostname or '').lower()
    if (parts.scheme != 'https' or not hostname.endswith('.bch-mainnet.quiknode.pro')
            or hostname == '.bch-mainnet.quiknode.pro' or parts.port not in (None, 443)
            or parts.username or parts.password or parts.query or parts.fragment
            or not parts.path.strip('/')):
        raise ValueError('INVALID_CONFIGURATION')
    return url


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _rpc(url, method, params=()):
    request = urllib.request.Request(
        url,
        data=json.dumps({'jsonrpc': '1.0', 'id': 'bchflow-v292', 'method': method,
                         'params': list(params)}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Accept': 'application/json',
                 'User-Agent': 'BCHFlow-HybridHealth/2.9.2'}, method='POST')
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context()),
                                         _NoRedirect())
    try:
        with opener.open(request, timeout=7) as response:
            if response.status != 200:
                raise ValueError('RPC_UNAVAILABLE')
            raw = response.read(MAX_RESPONSE + 1)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
        raise ValueError('RPC_UNAVAILABLE') from None
    if len(raw) > MAX_RESPONSE:
        raise ValueError('INVALID_RESPONSE')
    try:
        payload = json.loads(raw)
    except (ValueError, UnicodeError):
        raise ValueError('INVALID_RESPONSE') from None
    if not isinstance(payload, dict) or payload.get('error') is not None:
        raise ValueError('RPC_UNAVAILABLE')
    return payload.get('result')


def diagnose_rpc(*, probe=False, rpc=_rpc):
    result = {'provider': 'quicknode_rpc', 'configured': endpoint_configured(),
              'probed': False, 'state': 'NOT_CONFIGURED'}
    try:
        url = _endpoint()
    except ValueError as exc:
        result['state'] = str(exc)
        return result
    result['state'] = 'CONFIGURED_NOT_TESTED'
    if not probe:
        return result
    result['probed'] = True
    try:
        # getblockchaininfo provides explicit network identity when supported.
        info = rpc(url, 'getblockchaininfo')
        if not isinstance(info, dict):
            raise ValueError('INVALID_RESPONSE')
        chain = info.get('chain')
        if chain not in ('main', 'mainnet'):
            result['state'] = 'WRONG_NETWORK'
            return result
        blocks = info.get('blocks')
        headers = info.get('headers')
        if (type(blocks) is not int or blocks < 0 or type(headers) is not int
                or headers < blocks):
            raise ValueError('INVALID_RESPONSE')
        if info.get('initialblockdownload') is True or headers - blocks > 6:
            result['state'] = 'NOT_SYNCED'
            return result
        best_hash = rpc(url, 'getbestblockhash')
        if (not isinstance(best_hash, str) or len(best_hash) != 64
                or any(c not in '0123456789abcdefABCDEF' for c in best_hash)):
            raise ValueError('INVALID_RESPONSE')
        result.update(state='HEALTHY', chain='main', blocks=blocks,
                      headers=headers, best_block_hash=best_hash.lower())
    except ValueError as exc:
        code = str(exc)
        result['state'] = code if code in {'INVALID_RESPONSE', 'RPC_UNAVAILABLE', 'NOT_SYNCED', 'WRONG_NETWORK'} else 'RPC_UNAVAILABLE'
    except Exception:
        result['state'] = 'RPC_UNAVAILABLE'
    return result
