"""Manual BCH Mainnet common-height block-hash comparison. Diagnostic evidence only.

No wallet/address/UTXO access, no invoice mutations, no financial authorization.
"""
import os
import re
from .blockbook_v26 import BlockbookProvider
from .health_v29 import inspect_status
from .quicknode_rpc_v292 import _endpoint, _rpc

HASH = re.compile(r'^[0-9a-fA-F]{64}$')


def _height(value):
    if type(value) is int and value >= 0:
        return value
    if isinstance(value, str) and value.isdecimal() and len(value) <= 12:
        return int(value)
    raise ValueError('INVALID_HEIGHT')


def _hash(value):
    if not isinstance(value, str) or not HASH.fullmatch(value):
        raise ValueError('INVALID_HASH')
    return value.lower()


def compare(*, probe=False, book_factory=BlockbookProvider, rpc=_rpc):
    result = {'state': 'NOT_TESTED', 'probed': False, 'matching_block': False,
              'utxo_consensus': False, 'payment_verified': False,
              'settlement_authorized': False}
    endpoint = os.getenv('BCHFLOW_V26_PROVIDER_A_URL', '').strip()
    key = os.getenv('BCHFLOW_V26_PROVIDER_A_KEY', '')
    if not endpoint or not os.getenv('BCHFLOW_V292_QUICKNODE_RPC_URL', '').strip():
        result['state'] = 'NOT_CONFIGURED'
        return result
    try:
        book = book_factory('blockbook_a', endpoint, api_key=key)
        rpc_url = _endpoint()
    except (ValueError, TypeError):
        result['state'] = 'INVALID_CONFIGURATION'
        return result
    if not probe:
        return result
    result['probed'] = True
    try:
        status = book._get('/api')
        state = inspect_status(status)
        if state != 'HEALTHY':
            result['state'] = 'BLOCKBOOK_' + state
            return result
        info = rpc(rpc_url, 'getblockchaininfo')
        if not isinstance(info, dict) or info.get('chain') not in ('main', 'mainnet'):
            result['state'] = 'RPC_WRONG_NETWORK'
            return result
        if info.get('initialblockdownload') is True:
            result['state'] = 'RPC_NOT_SYNCED'
            return result
        rpc_height = _height(info.get('blocks'))
        rpc_headers = _height(info.get('headers'))
        if rpc_headers < rpc_height or rpc_headers - rpc_height > 6:
            result['state'] = 'RPC_NOT_SYNCED'
            return result
        backend = status.get('backend', {})
        book_height = _height(backend.get('blocks'))
        if abs(book_height - rpc_height) > 12:
            result['state'] = 'HEIGHT_DIVERGENCE'
            result['height_difference'] = abs(book_height - rpc_height)
            return result
        common = min(book_height, rpc_height) - 6
        if common < 0:
            result['state'] = 'INSUFFICIENT_HEIGHT'
            return result
        # Blockbook /api/v2/block-index/{height} returns {"blockHash": "..."}.
        block = book._get('/api/v2/block-index/' + str(common))
        if not isinstance(block, dict):
            raise ValueError('INVALID_RESPONSE')
        book_hash = _hash(block.get('blockHash'))
        rpc_hash = _hash(rpc(rpc_url, 'getblockhash', (common,)))
        result['compared_height'] = common
        result['height_difference'] = abs(book_height - rpc_height)
        result['matching_block'] = book_hash == rpc_hash
        result['state'] = 'MATCHING_BLOCK' if book_hash == rpc_hash else 'BLOCK_HASH_CONFLICT'
    except Exception:
        # Never leak URL, key, HTTP body or exception details.
        result['state'] = 'PROVIDER_UNAVAILABLE_OR_INVALID_RESPONSE'
    return result
