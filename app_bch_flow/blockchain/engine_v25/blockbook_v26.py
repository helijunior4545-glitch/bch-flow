"""V2.6 explicit HTTPS Blockbook provider. Read-only UTXO snapshots, not payment proof."""
import json
import re
import socket
import ssl
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, build_opener, HTTPSHandler, HTTPRedirectHandler
from .contracts import Snapshot, Outpoint
from .engine import ProviderFailure

HEX = re.compile(r"[0-9a-fA-F]{64}\Z")

class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ProviderFailure('provider_error')

class BlockbookProvider:
    """Explicit endpoint; no implicit public hosts. Set unique names and pinned URLs."""
    def __init__(self, name, endpoint, *, api_key='', timeout=5):
        self.name = name
        url = urlsplit(endpoint)
        if (url.scheme != 'https' or not url.hostname or url.username or url.password
                or url.query or url.fragment or url.path not in ('', '/') or url.port not in (None, 443)):
            raise ValueError('HTTPS origin required (no path, credentials, port override or query)')
        if not isinstance(timeout, (int, float)) or not 1 <= timeout <= 8:
            raise ValueError('timeout out of bounds')
        self.origin = 'https://' + url.hostname.lower()
        self.api_key = api_key
        self.timeout = timeout

    def _get(self, path):
        headers = {'Accept':'application/json', 'User-Agent':'BCHFlow-V26-ReadOnly'}
        if self.api_key:
            headers['api-key'] = self.api_key
        req = Request(self.origin + path, headers=headers, method='GET')
        try:
            with build_opener(HTTPSHandler(), _NoRedirect()).open(req, timeout=self.timeout) as response:
                if response.status != 200:
                    raise ProviderFailure('provider_error')
                raw = response.read(256001)
                if len(raw) > 256000:
                    raise ProviderFailure('provider_invalid_response')
            return json.loads(raw)
        except HTTPError as exc:
            raise ProviderFailure('provider_auth_error' if exc.code in (401,403) else 'provider_error') from None
        except (TimeoutError, socket.timeout):
            raise ProviderFailure('provider_timeout') from None
        except (URLError, OSError, ssl.SSLError):
            raise ProviderFailure('provider_error') from None
        except (ValueError, UnicodeError):
            raise ProviderFailure('provider_invalid_response') from None

    def observe(self, address):
        status = self._get('/api')
        if not isinstance(status, dict) or not isinstance(status.get('blockbook'),dict) or not isinstance(status.get('backend'),dict):
            raise ProviderFailure('provider_invalid_response')
        book, backend = status['blockbook'], status['backend']
        if book.get('inSync') is not True or book.get('initialSync') is True:
            raise ProviderFailure('provider_not_synced')
        if backend.get('chain') not in ('main','mainnet') or str(book.get('coin','')).lower() not in ('bcash','bitcoin cash','bitcoincash','bch'):
            raise ProviderFailure('provider_wrong_network')
        rows = self._get('/api/v2/utxo/' + quote(address, safe=':'))
        if not isinstance(rows,list) or len(rows)>1000:
            raise ProviderFailure('provider_invalid_response')
        out=[]
        for item in rows:
            if not isinstance(item,dict):
                raise ProviderFailure('provider_invalid_response')
            txid, vout, value, confirmations = (item.get(k) for k in ('txid','vout','value','confirmations'))
            if (not isinstance(txid,str) or not HEX.fullmatch(txid) or type(vout) is not int
                or not 0<=vout<=100000 or not isinstance(value,str) or not value.isascii()
                or not value.isdecimal() or type(confirmations) is not int or not 0<=confirmations<=10000000):
                raise ProviderFailure('provider_invalid_response')
            out.append(Outpoint(txid.lower(),vout,int(value),confirmations))
        return Snapshot(self.name,address,'mainnet',tuple(out))
