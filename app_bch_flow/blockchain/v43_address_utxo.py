"""V4.3: opt-in single-provider BCH UTXO observation. Not wallet balance proof."""
import json
import os
import re
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, build_opener, HTTPSHandler, HTTPRedirectHandler
from app_bch_flow.core.address_validation import validate_cashaddr

HOST = 'https://bchbook.nownodes.io'
HEX = re.compile(r'[0-9a-fA-F]{64}\Z')

class ObservationUnavailable(ValueError):
    pass

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise ObservationUnavailable('redirect_blocked')

@dataclass(frozen=True)
class UTXOObservation:
    address: str
    network: str
    utxos: tuple
    confirmed_satoshis: int
    unconfirmed_satoshis: int
    provider: str = 'nownodes_blockbook_single_provider'
    verified_balance: bool = False
    ownership_verified: bool = False
    settlement_authorized: bool = False

def _fetch(path, api_key):
    if not api_key or not isinstance(api_key, str):
        raise ObservationUnavailable('provider_key_missing')
    request = Request(HOST + path, headers={'api-key':api_key,'Accept':'application/json',
                       'User-Agent':'BCHFlow-V43-ReadOnly'}, method='GET')
    try:
        with build_opener(HTTPSHandler(), NoRedirect()).open(request, timeout=8) as response:
            if response.status != 200:
                raise ObservationUnavailable('provider_http_error')
            data = response.read(256001)
            if len(data) > 256000:
                raise ObservationUnavailable('provider_response_too_large')
        return json.loads(data)
    except (HTTPError, URLError, OSError, ValueError, UnicodeError) as exc:
        raise ObservationUnavailable('provider_unavailable') from exc

def observe_address(address, *, fetch=None):
    """Ephemeral external observation only. Never persist or authorize spending."""
    if os.getenv('BCHFLOW_V43_ENABLE_ADDRESS_READ') != '1':
        raise ObservationUnavailable('address_observation_disabled')
    address = validate_cashaddr(address, 'mainnet')
    api_key = os.getenv('BCHFLOW_V48_PRIMARY_KEY', '')
    if not api_key:
        raise ObservationUnavailable('provider_key_missing')
    get = fetch if fetch is not None else (lambda path: _fetch(path, api_key))
    status = get('/api')
    if not isinstance(status, dict) or not isinstance(status.get('blockbook'), dict) or not isinstance(status.get('backend'), dict):
        raise ObservationUnavailable('invalid_provider_status')
    book, backend = status['blockbook'], status['backend']
    if book.get('inSync') is not True or book.get('initialSync') is True or backend.get('chain') not in ('main','mainnet'):
        raise ObservationUnavailable('provider_not_synced_or_wrong_chain')
    if str(book.get('coin','')).lower() not in ('bcash','bitcoin cash','bitcoincash','bch'):
        raise ObservationUnavailable('wrong_coin')
    rows = get('/api/v2/utxo/' + quote(address, safe=':'))
    if not isinstance(rows, list) or len(rows) > 1000:
        raise ObservationUnavailable('invalid_or_oversized_utxo_set')
    clean=[]; seen=set(); confirmed=0; unconfirmed=0
    for item in rows:
        if not isinstance(item, dict):
            raise ObservationUnavailable('malformed_utxo')
        txid=item.get('txid'); vout=item.get('vout'); value=item.get('value'); conf=item.get('confirmations')
        if (not isinstance(txid,str) or not HEX.fullmatch(txid) or type(vout) is not int or not 0 <= vout <= 100000
            or not isinstance(value,str) or not value.isascii() or not value.isdecimal()
            or type(conf) is not int or conf < 0 or conf > 10000000):
            raise ObservationUnavailable('invalid_utxo_fields')
        sats=int(value)
        if not 0 < sats <= 21000000 * 100000000 or (txid.lower(),vout) in seen:
            raise ObservationUnavailable('invalid_or_duplicate_utxo')
        seen.add((txid.lower(),vout))
        clean.append({'txid':txid.lower(),'vout':vout,'satoshis':sats,'confirmations':conf})
        if conf: confirmed+=sats
        else: unconfirmed+=sats
    return UTXOObservation(address,'mainnet',tuple(clean),confirmed,unconfirmed)
