"""V5.1-B: live read-only BCH corroboration, fail closed. No settlement authority."""
import json
import os
import re
import ssl
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPSHandler, HTTPRedirectHandler

from app_bch_flow.blockchain.v51_corroboration import corroborate, CorroborationError
from app_bch_flow.blockchain.v51_cashaddr import normalize_mainnet_cashaddr, CashAddrError

TX_RE = re.compile(r"[a-fA-F0-9]{64}\Z")
PRIMARY = "https://bchbook.nownodes.io"
SECONDARY = "https://api.blockchair.com"
MAX_BYTES = 512_000

class LiveEvidenceError(ValueError):
    """Public error code; no API key, URL, or raw provider body in output."""
    pass

def _stage_error(stage, exc):
    code = str(exc) if isinstance(exc, LiveEvidenceError) else 'unexpected_provider_error'
    return LiveEvidenceError(stage + ':' + code)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise LiveEvidenceError("redirect_denied")

def _url(base, expected):
    parts = urlsplit(base)
    if (parts.scheme != 'https' or parts.hostname != expected or parts.username or
            parts.password or parts.port not in (None, 443) or parts.query or
            parts.fragment or parts.path not in ('', '/')):
        raise LiveEvidenceError('endpoint_not_allowlisted')
    return base.rstrip('/')

def _fetch(url, headers, opener=None):
    request = Request(url, headers={'User-Agent': 'BCHFlow-Diagnostic/5.1', **headers}, method='GET')
    opener = opener or build_opener(NoRedirect(), HTTPSHandler(context=ssl.create_default_context()))
    try:
        with opener.open(request, timeout=8) as response:
            if response.status != 200:
                raise LiveEvidenceError('provider_http_status')
            raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise LiveEvidenceError('response_too_large')
            result = json.loads(raw.decode('utf-8'))
            if not isinstance(result, dict):
                raise LiveEvidenceError('response_not_object')
            return result
    except HTTPError as exc:
        raise LiveEvidenceError('http_' + str(exc.code)) from exc
    except (URLError, TimeoutError, OSError, UnicodeError, ValueError) as exc:
        if isinstance(exc, LiveEvidenceError):
            raise
        raise LiveEvidenceError('provider_unavailable_or_invalid_json') from exc

def _integer(value, name, minimum=0):
    if type(value) is not int or value < minimum:
        raise LiveEvidenceError('invalid_' + name)
    return value

def _sats(value):
    if not isinstance(value, str) or not value.isdecimal() or len(value) > 20:
        raise LiveEvidenceError('invalid_satoshis')
    return _integer(int(value), 'satoshis')

def _addresses(item, mode='blockbook'):
    """Accept only explicit mainnet CashAddr. Never guess a legacy conversion."""
    addresses = item.get('addresses')
    if mode == 'blockchair' and addresses is None:
        recipient = item.get('recipient')
        if isinstance(recipient, str) and recipient:
            addresses = [recipient]
    if not isinstance(addresses, list) or not addresses or len(addresses) > 10:
        raise LiveEvidenceError('missing_addresses')
    normalized = []
    for address in addresses:
        try:
            normalized.append(normalize_mainnet_cashaddr(address))
        except CashAddrError as exc:
            raise LiveEvidenceError('unsupported_address_format') from exc
    if len(set(normalized)) != len(normalized):
        raise LiveEvidenceError('duplicate_addresses')
    return normalized

def _outputs(vout, mode):
    if not isinstance(vout, list) or not vout or len(vout) > 5000:
        raise LiveEvidenceError('invalid_outputs')
    results, indexes = [], set()
    for item in vout:
        if not isinstance(item, dict):
            raise LiveEvidenceError('invalid_output')
        idx = _integer(item.get('n') if mode == 'blockbook' else item.get('index'), 'vout')
        if idx in indexes:
            raise LiveEvidenceError('duplicate_vout')
        indexes.add(idx)
        sats = (_sats(item.get('value')) if mode == 'blockbook'
                else _integer(item.get('value'), 'satoshis'))
        results.append({'vout': idx, 'satoshis': sats,
                        'addresses': _addresses(item, mode)})
    if indexes != set(range(len(results))):
        raise LiveEvidenceError('non_contiguous_outputs')
    return sorted(results, key=lambda o: o['vout'])

def _blockbook(tx, txid, now):
    if not isinstance(tx.get('txid'), str) or tx['txid'].lower() != txid:
        raise LiveEvidenceError('primary_txid_mismatch')
    height = _integer(tx.get('blockHeight'), 'block_height', 1)
    conf = _integer(tx.get('confirmations'), 'confirmations', 1)
    block_hash = tx.get('blockHash')
    if not isinstance(block_hash, str) or not TX_RE.fullmatch(block_hash):
        raise LiveEvidenceError('missing_block_hash')
    return {'height': height, 'confirmations': conf, 'block_hash': block_hash.lower(),
            'outputs': _outputs(tx.get('vout'), 'blockbook')}

def _blockchair(payload, txid):
    data = payload.get('data')
    if not isinstance(data, dict) or not isinstance(data.get(txid), dict):
        raise LiveEvidenceError('secondary_missing_txid')
    record = data[txid]
    tx = record.get('transaction')
    if not isinstance(tx, dict) or not isinstance(tx.get('hash'), str) or tx['hash'].lower() != txid:
        raise LiveEvidenceError('secondary_txid_mismatch')
    height = _integer(tx.get('block_id'), 'block_height', 1)
    outputs = _outputs(record.get('outputs'), 'blockchair')
    # Blockchair dashboard transaction response does not reliably include block hash.
    # The caller must independently retrieve and verify the block hash via block dashboard.
    return {'height': height, 'outputs': outputs}

def _blockchair_block(payload, height):
    data = payload.get('data')
    record = data.get(str(height)) if isinstance(data, dict) else None
    block = record.get('block') if isinstance(record, dict) else None
    if not isinstance(block, dict) or block.get('id') != height:
        raise LiveEvidenceError('secondary_block_height_mismatch')
    value = block.get('hash')
    if not isinstance(value, str) or not TX_RE.fullmatch(value):
        raise LiveEvidenceError('secondary_block_hash_missing')
    return value.lower()

def collect(txid, *, opener=None, now=None):
    """Collect evidence. Output can NEVER establish provider ownership or authorize payment."""
    if os.getenv('BCHFLOW_V51B_ENABLE_LIVE') != '1':
        raise LiveEvidenceError('live_disabled')
    if not isinstance(txid, str) or not TX_RE.fullmatch(txid):
        raise LiveEvidenceError('invalid_txid')
    txid = txid.lower()
    key = os.getenv('BCHFLOW_V48_PRIMARY_KEY', '').strip()
    if not key or '\n' in key or '\r' in key:
        raise LiveEvidenceError('missing_or_invalid_nownodes_key')
    primary_url = _url(os.getenv('BCHFLOW_V51B_PRIMARY_URL', PRIMARY), 'bchbook.nownodes.io')
    secondary_url = _url(os.getenv('BCHFLOW_V51B_SECONDARY_URL', SECONDARY), 'api.blockchair.com')
    now = now or datetime.now(timezone.utc)
    def stage(name, func, *args):
        try:
            return func(*args)
        except (LiveEvidenceError, CorroborationError) as exc:
            raise _stage_error(name, exc) from exc
        except (TypeError, AttributeError, KeyError, IndexError) as exc:
            raise LiveEvidenceError(name + ':invalid_provider_structure') from exc

    primary_raw = stage('nownodes_tx_fetch', _fetch,
                        primary_url + '/api/v2/tx/' + txid,
                        {'api-key': key, 'Accept': 'application/json'}, opener)
    secondary_raw = stage('blockchair_tx_fetch', _fetch,
                          secondary_url + '/bitcoin-cash/dashboards/transaction/' + txid,
                          {'Accept': 'application/json'}, opener)
    p = stage('nownodes_tx_parse', _blockbook, primary_raw, txid, now)
    s = stage('blockchair_tx_parse', _blockchair, secondary_raw, txid)
    secondary_block = stage('blockchair_block_fetch', _fetch,
                            secondary_url + '/bitcoin-cash/dashboards/block/' + str(s['height']),
                            {'Accept': 'application/json'}, opener)
    s['block_hash'] = stage('blockchair_block_parse', _blockchair_block,
                            secondary_block, s['height'])
    # Both providers must have same height/hash and identical outputs. Do not derive
    # confirmations from untrusted Blockchair response; compare primary's count to
    # an independently reported tip in Blockchair context when available.
    context = secondary_raw.get('context')
    tip = context.get('state') if isinstance(context, dict) else None
    if type(tip) is not int or tip < s['height']:
        raise LiveEvidenceError('blockchair_tip_parse:secondary_tip_unavailable')
    s['confirmations'] = tip - s['height'] + 1
    def obs(provider, item, tip_height):
        return {'schema': 'bchflow.v49.real_transaction_diagnostic', 'network': 'mainnet',
                'provider': provider, 'provider_status': 'in_sync',
                'assessment': 'external_single_provider_observation_only',
                'invoice_attributed': False, 'payment_created': False, 'settlement_authorized': False,
                'txid': txid, 'block_hash': item['block_hash'], 'block_height': item['height'],
                'tip_height': tip_height, 'confirmations': item['confirmations'],
                'observed_at': now.isoformat(), 'outputs': item['outputs']}
    return obs('nownodes', p, p['height'] + p['confirmations'] - 1), obs('blockchair', s, tip)

def assess(txid, *, opener=None, now=None):
    try:
        primary, secondary = collect(txid, opener=opener, now=now)
        result = corroborate(primary, secondary, expected_txid=txid.lower(), now=now)
    except (LiveEvidenceError, CorroborationError) as exc:
        result = {'schema': 'bchflow.v51b.live_corroboration', 'txid': txid,
                  'comparison': 'blocked', 'reasons': [str(exc)]}
        if ':' in str(exc):
            result['reasons'].append(str(exc).split(':', 1)[1])
    result['independent_corroboration'] = False
    result['invoice_attributed'] = False
    result['payment_created'] = False
    result['settlement_authorized'] = False
    result['warning'] = 'Two external API operators; not consensus proof, no settlement.'
    return result
