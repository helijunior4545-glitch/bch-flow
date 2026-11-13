"""Read-only BCH Blockbook v2 adapter. Provider data is NOT consensus proof.

Opt-in, explicit HTTPS host allowlist, bounded responses and pagination.
Never marks an invoice paid, signs, broadcasts, or writes to DB.
"""
import json
import os
import re
import ssl
from urllib.parse import urlencode, urlsplit, quote
from urllib.request import Request, build_opener, HTTPSHandler, HTTPRedirectHandler
from urllib.error import URLError, HTTPError
from .v33_engine import OutputEvidence, EvidenceError
from app_bch_flow.core.address_validation import validate_cashaddr

_TXID = re.compile(r'^[0-9a-fA-F]{64}$')
_HASH = re.compile(r'^[0-9a-fA-F]{64}$')
_MAX_BODY = 2_000_000

class NetworkReadError(RuntimeError):
    pass

class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise NetworkReadError('HTTP redirect rejected')

def _config():
    if os.getenv('BCHFLOW_V34_ENABLE_NETWORK') != '1':
        raise NetworkReadError('Network disabled; set BCHFLOW_V34_ENABLE_NETWORK=1 explicitly')
    base = os.getenv('BCHFLOW_V34_BLOCKBOOK_URL', '').strip().rstrip('/')
    allowed = {x.strip().lower() for x in os.getenv('BCHFLOW_V34_ALLOWED_HOSTS', '').split(',') if x.strip()}
    parsed = urlsplit(base)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or parsed.path not in ('', '/')
            or parsed.hostname.lower() not in allowed):
        raise NetworkReadError('Invalid HTTPS Blockbook URL or host not allowlisted')
    if parsed.port not in (None, 443):
        raise NetworkReadError('Nonstandard HTTPS port disabled')
    return base

def _integer(value, label, maximum=21_000_000 * 100_000_000):
    if isinstance(value, bool) or not isinstance(value, (int, str)) or not re.fullmatch(r'\d+', str(value)):
        raise NetworkReadError('Invalid '+label)
    n = int(value)
    if n > maximum:
        raise NetworkReadError('Out-of-range '+label)
    return n

class BlockbookReadOnlyProvider:
    """Blockbook v2 address API adapter. Supports mainnet only by default."""
    def __init__(self, *, network='mainnet', timeout=8, max_pages=3, page_size=50):
        if network != 'mainnet':
            raise NetworkReadError('Only mainnet supported; chipnet requires a separate audited adapter')
        if not (isinstance(timeout,(int,float)) and not isinstance(timeout,bool) and 1 <= timeout <= 20):
            raise NetworkReadError('Invalid timeout')
        if type(max_pages) is not int or not 1 <= max_pages <= 10:
            raise NetworkReadError('Invalid max_pages')
        if type(page_size) is not int or not 1 <= page_size <= 100:
            raise NetworkReadError('Invalid page_size')
        self.base = _config()
        self.network = network
        self.timeout = timeout
        self.max_pages = max_pages
        self.page_size = page_size
        self.opener = build_opener(HTTPSHandler(context=ssl.create_default_context()), _NoRedirect())

    def _get(self, path, params):
        url = self.base + path + '?' + urlencode(params)
        request = Request(url, headers={'Accept':'application/json','User-Agent':'BCHFlow-ReadOnly/3.4'})
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                if response.status != 200:
                    raise NetworkReadError('Unexpected HTTP status')
                raw = response.read(_MAX_BODY + 1)
        except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
            raise NetworkReadError('Blockchain provider unavailable') from exc
        if len(raw) > _MAX_BODY:
            raise NetworkReadError('Oversized provider response')
        try:
            result = json.loads(raw)
        except (UnicodeError, ValueError) as exc:
            raise NetworkReadError('Invalid provider JSON') from exc
        if not isinstance(result, dict):
            raise NetworkReadError('Unexpected provider schema')
        return result

    def outputs_for_address(self, *, network, address):
        if network != self.network:
            raise NetworkReadError('Network mismatch')
        try:
            normalized = validate_cashaddr(address, network)
        except Exception as exc:
            raise NetworkReadError('Invalid CashAddr') from exc
        results = []
        seen = set()
        expected_pages = None
        for page in range(1, self.max_pages+1):
            data = self._get('/api/v2/address/' + quote(normalized, safe=':'),
                             {'details':'txs', 'page':page, 'pageSize':self.page_size})
            if data.get('address') != normalized:
                raise NetworkReadError('Address response mismatch')
            pages = _integer(data.get('totalPages'), 'totalPages', 1_000_000)
            if pages < 1:
                raise NetworkReadError('Invalid totalPages')
            if expected_pages is None:
                expected_pages = pages
            elif pages != expected_pages:
                raise NetworkReadError('Pagination changed during read')
            txs = data.get('txs')
            if txs is None:
                txs = data.get('transactions')
            if not isinstance(txs, list) or len(txs) > self.page_size:
                raise NetworkReadError('Invalid transactions page')
            for tx in txs:
                if not isinstance(tx, dict):
                    raise NetworkReadError('Invalid transaction')
                txid = tx.get('txid')
                if not isinstance(txid, str) or not _TXID.fullmatch(txid):
                    raise NetworkReadError('Invalid transaction ID')
                confirmations = _integer(tx.get('confirmations', 0), 'confirmations', 100_000_000)
                block_hash = tx.get('blockHash') or ''
                if confirmations and (not isinstance(block_hash, str) or not _HASH.fullmatch(block_hash)):
                    raise NetworkReadError('Confirmed transaction without block hash')
                if not confirmations:
                    block_hash = ''
                vouts = tx.get('vout')
                if not isinstance(vouts, list) or len(vouts) > 10000:
                    raise NetworkReadError('Invalid transaction outputs')
                for output in vouts:
                    if not isinstance(output, dict):
                        raise NetworkReadError('Invalid output')
                    addresses = output.get('addresses', [])
                    if not isinstance(addresses, list):
                        raise NetworkReadError('Invalid output addresses')
                    if normalized not in addresses:
                        continue
                    index = _integer(output.get('n'), 'output index', 100000)
                    key = (txid.lower(), index)
                    if key in seen:
                        raise NetworkReadError('Duplicate output across pages')
                    seen.add(key)
                    try:
                        results.append(OutputEvidence(txid=txid.lower(), vout=index, address=normalized,
                            satoshis=_integer(output.get('value'), 'output value'), network=network,
                            confirmations=confirmations, block_hash=block_hash.lower()))
                    except EvidenceError as exc:
                        raise NetworkReadError('Invalid output evidence') from exc
            if page >= pages:
                return tuple(results)
        # Incomplete pagination MUST fail closed rather than return partial evidence.
        raise NetworkReadError('Pagination limit reached; results incomplete')
