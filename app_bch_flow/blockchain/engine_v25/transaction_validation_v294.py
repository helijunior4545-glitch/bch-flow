"""Manual, read-only BCH Mainnet transaction comparison. Never verifies a payment."""
import os
import re
from decimal import Decimal, InvalidOperation
from .blockbook_v26 import BlockbookProvider
from .health_v29 import inspect_status
from .quicknode_rpc_v292 import _endpoint, _rpc

TXID = re.compile(r"[0-9a-fA-F]{64}\Z")
SAT = Decimal('100000000')

def _hex(value):
    if not isinstance(value, str) or not TXID.fullmatch(value):
        raise ValueError('INVALID_HASH')
    return value.lower()

def _sats(value):
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise ValueError('INVALID_AMOUNT')
    try:
        number = Decimal(str(value)) * SAT
    except (InvalidOperation, ValueError):
        raise ValueError('INVALID_AMOUNT') from None
    if not number.is_finite() or number < 0 or number != number.to_integral_value() or number > 21000000 * SAT:
        raise ValueError('INVALID_AMOUNT')
    return int(number)

def _blockbook_sats(value):
    """Blockbook v2 vout.value is an integer number of satoshis, not BCH."""
    if isinstance(value, bool) or not isinstance(value, (str, int, Decimal)):
        raise ValueError('INVALID_AMOUNT')
    # Strict decimal integer: reject scientific notation, whitespace and fractions.
    if isinstance(value, str):
        if not re.fullmatch(r'[0-9]{1,17}', value):
            raise ValueError('INVALID_AMOUNT')
        amount = int(value)
    elif type(value) is int:
        amount = value
    elif isinstance(value, Decimal):
        if not value.is_finite() or value != value.to_integral_value():
            raise ValueError('INVALID_AMOUNT')
        amount = int(value)
    else:
        raise ValueError('INVALID_AMOUNT')
    if amount < 0 or amount > 21000000 * 100000000:
        raise ValueError('INVALID_AMOUNT')
    return amount

def _outputs(tx, *, source):
    vouts = tx.get('vout')
    if not isinstance(vouts, list) or not 1 <= len(vouts) <= 10000:
        raise ValueError('INVALID_OUTPUTS')
    result = {}
    for index, row in enumerate(vouts):
        if not isinstance(row, dict):
            raise ValueError('INVALID_OUTPUTS')
        n = row.get('n', index)
        if type(n) is not int or n < 0 or n >= 10000 or n in result:
            raise ValueError('INVALID_OUTPUTS')
        # Explicit source contract: Blockbook returns satoshis; RPC returns BCH.
        if source == 'blockbook':
            amount = _blockbook_sats(row.get('value'))
        elif source == 'rpc':
            amount = _sats(row.get('value'))
        else:
            raise ValueError('INVALID_SOURCE')
        # Blockbook v2 returns vout[].hex; Bitcoin Cash verbose RPC uses
        # vout[].scriptPubKey.hex. Accept both explicit Blockbook variants
        # for compatibility, but reject contradictory representations.
        if source == 'blockbook':
            script = row.get('scriptPubKey')
            direct = row.get('hex')
            if script is not None and not isinstance(script, dict):
                raise ValueError('INVALID_SCRIPT')
            nested = script.get('hex') if isinstance(script, dict) else None
            if direct is not None and nested is not None and (not isinstance(direct, str) or not isinstance(nested, str) or direct.lower() != nested.lower()):
                raise ValueError('CONFLICTING_SCRIPT_FIELDS')
            hex_script = direct if direct is not None else nested
        elif source == 'rpc':
            script = row.get('scriptPubKey')
            if not isinstance(script, dict):
                raise ValueError('INVALID_SCRIPT')
            hex_script = script.get('hex')
        else:
            raise ValueError('INVALID_SOURCE')
        if not isinstance(hex_script, str) or len(hex_script) > 20000 or len(hex_script) % 2 or not re.fullmatch('[0-9a-fA-F]*', hex_script):
            raise ValueError('INVALID_SCRIPT')
        result[n] = (amount, hex_script.lower())
    if set(result) != set(range(len(vouts))):
        raise ValueError('INVALID_OUTPUTS')
    return result

def compare_tx(txid, *, probe=False, book_factory=BlockbookProvider, rpc=_rpc):
    result = {'state': 'NOT_TESTED', 'probed': False, 'matching_transaction': False,
              'utxo_consensus': False, 'payment_verified': False, 'settlement_authorized': False}
    try:
        txid = _hex(txid)
    except ValueError:
        result['state'] = 'INVALID_TXID'
        return result
    endpoint = os.getenv('BCHFLOW_V26_PROVIDER_A_URL', '').strip()
    if not endpoint or not os.getenv('BCHFLOW_V292_QUICKNODE_RPC_URL', '').strip():
        result['state'] = 'NOT_CONFIGURED'
        return result
    try:
        book = book_factory('blockbook_a', endpoint, api_key=os.getenv('BCHFLOW_V26_PROVIDER_A_KEY', ''))
        rpc_url = _endpoint()
    except (ValueError, TypeError):
        result['state'] = 'INVALID_CONFIGURATION'
        return result
    if not probe:
        return result
    result['probed'] = True
    try:
        status = book._get('/api')
        if inspect_status(status) != 'HEALTHY':
            result['state'] = 'BLOCKBOOK_NOT_HEALTHY'
            return result
        info = rpc(rpc_url, 'getblockchaininfo')
        if not isinstance(info, dict) or info.get('chain') not in ('main', 'mainnet'):
            result['state'] = 'RPC_WRONG_NETWORK'
            return result
        if info.get('initialblockdownload') is True:
            result['state'] = 'RPC_NOT_SYNCED'
            return result
        blockbook_tx = book._get('/api/v2/tx/' + txid)
        if not isinstance(blockbook_tx, dict) or _hex(blockbook_tx.get('txid')) != txid:
            result['state'] = 'BLOCKBOOK_TX_INVALID'
            return result
        # A standard node may not have txindex: RPC unavailable is INSUFFICIENT EVIDENCE.
        try:
            rpc_tx = rpc(rpc_url, 'getrawtransaction', (txid, True))
        except Exception:
            result['state'] = 'RPC_TX_UNAVAILABLE'
            return result
        if not isinstance(rpc_tx, dict) or _hex(rpc_tx.get('txid')) != txid:
            result['state'] = 'RPC_TX_INVALID'
            return result
        a_block = blockbook_tx.get('blockHash') or blockbook_tx.get('blockhash')
        b_block = rpc_tx.get('blockhash')
        if not a_block or not b_block:
            result['state'] = 'INSUFFICIENT_BLOCK_EVIDENCE'
            return result
        a_block, b_block = _hex(a_block), _hex(b_block)
        if a_block != b_block:
            result['state'] = 'BLOCK_HASH_CONFLICT'
            return result
        a_out = _outputs(blockbook_tx, source='blockbook')
        b_out = _outputs(rpc_tx, source='rpc')
        result['output_count'] = len(a_out)
        if a_out != b_out:
            result['state'] = 'OUTPUT_CONFLICT'
            return result
        result['matching_transaction'] = True
        result['state'] = 'MATCHING_TRANSACTION'
    except Exception:
        # No URLs, credentials, HTTP bodies, or exception details in output.
        result['state'] = 'PROVIDER_UNAVAILABLE_OR_INVALID_RESPONSE'
    return result
