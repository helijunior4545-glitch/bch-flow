"""BCH Flow B.8.1: bounded historical ASERT replay, read-only.

Input headers and anchor metadata are UNTRUSTED unless independently authenticated.
This module validates internal continuity, PoW and expected ASERT nBits;
it never asserts canonical chain or financial settlement.
"""
import hashlib
from .v51_asert_b8 import next_asert_bits, ASERTError
from .v51_electrum_b7 import compact_to_target, PowDiagnosticError

class HistoricalReplayError(ValueError):
    pass

def replay_asert_headers(*, first_height, headers_hex, anchor_height,
                         anchor_parent_time, anchor_bits, expected_first_hash=None):
    if type(first_height) is not int or type(anchor_height) is not int:
        raise HistoricalReplayError("invalid_height_type")
    if first_height <= anchor_height or first_height > 100_000_000:
        raise HistoricalReplayError("invalid_height_range")
    if not isinstance(headers_hex, str) or not headers_hex or len(headers_hex) % 160:
        raise HistoricalReplayError("invalid_header_window")
    count = len(headers_hex) // 160
    if not 2 <= count <= 144 or first_height + count - 1 > 100_000_000:
        raise HistoricalReplayError("invalid_header_count")
    if expected_first_hash is not None and (
        not isinstance(expected_first_hash, str) or len(expected_first_hash) != 64
        or any(c not in "0123456789abcdefABCDEF" for c in expected_first_hash)
    ):
        raise HistoricalReplayError("invalid_expected_first_hash")
    try:
        raw = bytes.fromhex(headers_hex)
    except ValueError as exc:
        raise HistoricalReplayError("invalid_header_hex") from exc
    previous = None
    total_work = 0
    hashes = []
    for index in range(count):
        header = raw[index*80:(index+1)*80]
        digest = hashlib.sha256(hashlib.sha256(header).digest()).digest()
        block_hash = digest[::-1].hex()
        bits = int.from_bytes(header[72:76], "little")
        try:
            target = compact_to_target(bits)
        except (ValueError, TypeError) as exc:
            raise HistoricalReplayError("invalid_target_at_%d" % index) from exc
        if int.from_bytes(digest, "little") > target:
            raise HistoricalReplayError("insufficient_pow_at_%d" % index)
        if index == 0:
            if expected_first_hash is not None and block_hash != expected_first_hash.lower():
                raise HistoricalReplayError("first_hash_mismatch")
        else:
            if header[4:36] != previous:
                raise HistoricalReplayError("broken_header_link_at_%d" % index)
            try:
                expected = next_asert_bits(
                    anchor_height=anchor_height, anchor_parent_time=anchor_parent_time,
                    anchor_bits=anchor_bits, evaluation_height=first_height+index-1,
                    evaluation_time=int.from_bytes(raw[(index-1)*80+68:(index-1)*80+72], "little"))
            except (ASERTError, ValueError, TypeError) as exc:
                raise HistoricalReplayError("asert_context_invalid") from exc
            if bits != expected:
                raise HistoricalReplayError("asert_mismatch_at_%d" % index)
        previous = digest
        hashes.append(block_hash)
        total_work += (1 << 256) // (target + 1)
    return {
        "schema": "bchflow.v51.b81.historical_replay",
        "headers_checked": count, "asert_transitions_checked": count-1,
        "first_hash": hashes[0], "last_hash": hashes[-1],
        "observed_work": str(total_work), "internal_pow_valid": True,
        "internal_links_valid": True, "asert_arithmetic_matches_headers": True,
        "anchor_authenticated": False, "historical_provenance_verified": False,
        "canonical_chain_verified": False, "bch_consensus_verified": False,
        "invoice_attributed": False, "payment_created": False,
        "settlement_authorized": False,
    }
