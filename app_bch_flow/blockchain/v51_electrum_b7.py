"""BCH Flow V5.1-B.7: bounded, read-only header proof-of-work observations.

Checks per-header compact target and hash <= target, and sums observed work.
Does NOT validate BCH DAA, consensus, canonicality, or authorize payments.
"""
import os
import re
from .v51_electrum_b6 import (MAX_HEADERS, HeaderDiagnosticError,
    validate_headers, fetch_electrum_headers)
from .v51_electrum_b5 import assess_diagnostic

POW_LIMIT = int("00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 16)
HEX64 = re.compile(r"[0-9a-fA-F]{64}\Z")

class PowDiagnosticError(ValueError):
    pass

def compact_to_target(bits):
    """Decode Bitcoin-style unsigned nBits with canonical encoding and pow limit."""
    if type(bits) is not int or not 0 <= bits <= 0xffffffff:
        raise PowDiagnosticError("invalid_compact_type_or_range")
    exponent = bits >> 24
    mantissa = bits & 0x007fffff
    if bits & 0x00800000 or mantissa == 0:
        raise PowDiagnosticError("negative_or_zero_target")
    if exponent <= 3:
        target = mantissa >> (8 * (3 - exponent))
    else:
        target = mantissa << (8 * (exponent - 3))
    if not 0 < target <= POW_LIMIT or target.bit_length() > 256:
        raise PowDiagnosticError("target_out_of_range")
    if target_to_compact(target) != bits:
        raise PowDiagnosticError("noncanonical_compact")
    return target

def target_to_compact(target):
    if type(target) is not int or target <= 0 or target.bit_length() > 256:
        raise PowDiagnosticError("invalid_target")
    size = (target.bit_length() + 7) // 8
    compact = (target >> (8 * (size - 3))) if size > 3 else (target << (8 * (3 - size)))
    if compact & 0x00800000:
        compact >>= 8
        size += 1
    return (size << 24) | compact

def inspect_pow(headers_hex, *, max_headers=MAX_HEADERS):
    """Validate individual PoW of a bounded contiguous byte sequence (not its links)."""
    if type(max_headers) is not int or not 1 <= max_headers <= MAX_HEADERS:
        raise PowDiagnosticError("invalid_limit")
    if not isinstance(headers_hex, str) or not headers_hex or len(headers_hex) % 160:
        raise PowDiagnosticError("invalid_header_batch")
    count = len(headers_hex) // 160
    if not 1 <= count <= max_headers:
        raise PowDiagnosticError("header_count_exceeds_limit")
    try:
        raw = bytes.fromhex(headers_hex)
    except ValueError as exc:
        raise PowDiagnosticError("invalid_header_hex") from exc
    import hashlib
    total_work = 0
    for index in range(count):
        header = raw[index * 80:(index + 1) * 80]
        bits = int.from_bytes(header[72:76], "little")
        target = compact_to_target(bits)
        hash_integer = int.from_bytes(hashlib.sha256(hashlib.sha256(header).digest()).digest(), "little")
        if hash_integer > target:
            raise PowDiagnosticError("insufficient_pow_at_index_%d" % index)
        total_work += (1 << 256) // (target + 1)
    return {"headers_pow_checked": count, "observed_work": str(total_work),
            "per_header_pow_valid": True, "bch_daa_verified": False,
            "bch_consensus_verified": False, "canonical_chain_verified": False}

def validate_pow_continuity(anchor_height, headers_hex, anchor_hash, tip_height,
                            tip_header_hex, *, max_headers=MAX_HEADERS):
    """Require B.6 continuity first, then verify every observed header's PoW."""
    try:
        continuity = validate_headers(anchor_height, headers_hex, anchor_hash,
                                      tip_height, tip_header_hex, max_headers=max_headers)
    except HeaderDiagnosticError as exc:
        raise PowDiagnosticError("continuity_failed") from exc
    pow_result = inspect_pow(headers_hex, max_headers=max_headers)
    return {**continuity, **pow_result,
            "observed_pow_continuity": True, "settlement_authorized": False}

def assess_pow(txid, *, server="cashnode.bch.ninja", b5_fetch=None,
               header_fetch=None, max_headers=MAX_HEADERS):
    """Opt-in live observation, fail-closed; no database or payment mutations."""
    blocked = {"schema": "bchflow.v51.b7.readonly_diagnostic", "comparison": "blocked",
               "reasons": ["diagnostic_unavailable"], "observed_pow_continuity": False,
               "bch_daa_verified": False, "bch_consensus_verified": False,
               "canonical_chain_verified": False, "provider_independence_verified": False,
               "independent_corroboration": False, "invoice_attributed": False,
               "payment_created": False, "settlement_authorized": False}
    try:
        if os.getenv("BCHFLOW_V51B7_ENABLE_LIVE") != "1":
            raise PowDiagnosticError("b7_live_disabled")
        if not isinstance(txid, str) or not HEX64.fullmatch(txid):
            raise PowDiagnosticError("invalid_txid")
        if type(max_headers) is not int or not 1 <= max_headers <= MAX_HEADERS:
            raise PowDiagnosticError("invalid_limit")
        prior = (b5_fetch or assess_diagnostic)(txid, server=server)
        if not isinstance(prior, dict) or prior.get("comparison") != "consistent_unverified_sources" or prior.get("merkle_verified") is not True:
            raise PowDiagnosticError("b5_blocked")
        height, anchor = prior["block_height"], prior["block_hash"]
        if type(height) is not int or height < 0 or not isinstance(anchor, str) or not HEX64.fullmatch(anchor):
            raise PowDiagnosticError("invalid_anchor")
        fetch = header_fetch or fetch_electrum_headers
        observed = fetch(server, height, max_headers=max_headers)
        checked = validate_pow_continuity(height, observed["headers_hex"], anchor,
                                          observed["tip_height"], observed["tip_header_hex"],
                                          max_headers=max_headers)
        return {"schema": "bchflow.v51.b7.readonly_diagnostic",
                "comparison": "observed_pow_continuity_unverified_consensus",
                "reasons": [], "txid": txid.lower(), "block_hash": anchor,
                **checked, "provider_independence_verified": False,
                "independent_corroboration": False, "invoice_attributed": False,
                "payment_created": False, "settlement_authorized": False}
    except (PowDiagnosticError, HeaderDiagnosticError, OSError, ValueError, TypeError,
            KeyError, AttributeError, TimeoutError) :
        return blocked
