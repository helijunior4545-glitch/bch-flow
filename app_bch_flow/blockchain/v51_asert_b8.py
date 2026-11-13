"""BCH Flow B.8: pure integer mainnet ASERT computation, read-only.

Reference: BCHN 2020-11-15 ASERT specification. Caller must authenticate
anchor and header provenance. This is NOT canonical chain verification.
"""
from .v51_electrum_b7 import compact_to_target, target_to_compact, POW_LIMIT

class ASERTError(ValueError):
    pass

MAX_HEIGHT = 100_000_000
MAX_TIMESTAMP = 0xffffffff


def _uint(value, label, limit):
    if type(value) is not int or not 0 <= value <= limit:
        raise ASERTError('invalid_' + label)
    return value


def _trunc_div(n, d):
    return n // d if n >= 0 else -((-n) // d)


def next_asert_bits(*, anchor_height, anchor_parent_time, anchor_bits,
                    evaluation_height, evaluation_time):
    """Expected nBits for evaluation_height+1, mainnet ASERT, explicit anchor.

    Does not select or authenticate anchor. Pre-ASERT and testnet excluded.
    """
    ah = _uint(anchor_height, 'anchor_height', MAX_HEIGHT)
    eh = _uint(evaluation_height, 'evaluation_height', MAX_HEIGHT)
    ap = _uint(anchor_parent_time, 'anchor_parent_time', MAX_TIMESTAMP)
    et = _uint(evaluation_time, 'evaluation_time', MAX_TIMESTAMP)
    if ah == 0 or eh < ah or eh == MAX_HEIGHT:
        raise ASERTError('invalid_height_order')
    try:
        target = compact_to_target(anchor_bits)
    except (ValueError, TypeError) as exc:
        raise ASERTError('invalid_anchor_bits') from exc
    exponent = _trunc_div(((et - ap) - 600 * (eh - ah + 1)) * 65536, 172800)
    shifts = exponent >> 16
    frac = exponent - shifts * 65536
    factor = ((195766423245049 * frac + 971821376 * frac * frac +
               5127 * frac * frac * frac + (1 << 47)) >> 48) + 65536
    adjusted = target * factor
    if shifts < 0:
        adjusted >>= -shifts
    else:
        adjusted <<= shifts
    adjusted >>= 16
    if adjusted == 0:
        return target_to_compact(1)
    if adjusted > POW_LIMIT:
        return 0x1d00ffff
    return target_to_compact(adjusted)


def check_asert_window(*, anchor_height, anchor_parent_time, anchor_bits,
                       first_height, headers_hex):
    """Compare nBits for every header with its PREDECESSOR's timestamp.

    Requires first_height >= anchor_height+2, as the predecessor must be
    present in this batch. First header is context, not validated. No PoW,
    links, MTP, provenance, or consensus is claimed by this function.
    """
    ah = _uint(anchor_height, 'anchor_height', MAX_HEIGHT)
    first = _uint(first_height, 'first_height', MAX_HEIGHT)
    if first < ah + 1 or type(headers_hex) is not str or not headers_hex or len(headers_hex) % 160:
        raise ASERTError('invalid_header_window')
    count = len(headers_hex) // 160
    if not 2 <= count <= 144 or first + count - 1 > MAX_HEIGHT:
        raise ASERTError('invalid_header_count')
    try:
        raw = bytes.fromhex(headers_hex)
    except ValueError as exc:
        raise ASERTError('invalid_header_hex') from exc
    if len(raw) != count * 80:
        raise ASERTError('invalid_header_length')
    checked = 0
    for i in range(1, count):
        prev = raw[(i-1)*80:i*80]
        curr = raw[i*80:(i+1)*80]
        expected = next_asert_bits(anchor_height=ah, anchor_parent_time=anchor_parent_time,
                                   anchor_bits=anchor_bits,
                                   evaluation_height=first+i-1,
                                   evaluation_time=int.from_bytes(prev[68:72], 'little'))
        actual = int.from_bytes(curr[72:76], 'little')
        if expected != actual:
            raise ASERTError('asert_bits_mismatch_at_height_%d' % (first+i))
        checked += 1
    return {'asert_bits_checked': checked, 'asert_arithmetic_verified': True,
            'anchor_authenticated': False, 'header_provenance_verified': False,
            'canonical_chain_verified': False, 'bch_consensus_verified': False,
            'settlement_authorized': False}
