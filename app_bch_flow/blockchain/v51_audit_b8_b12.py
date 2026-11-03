"""BCH Flow B8-B12 conservative audit gates; pure, offline, NO financial writes.

This is a safety foundation, NOT complete BCH DAA or chain consensus verification.
All results remain blocked for payment attribution/settlement.
"""
import hashlib
import re
from datetime import datetime, timezone
from .v51_cashaddr import normalize_mainnet_cashaddr, ALPHABET, SIZES
from .v51_electrum_b7 import compact_to_target

HEX64 = re.compile(r"[0-9a-f]{64}\Z")
MAX_HEADERS = 144

class AuditGateError(ValueError):
    pass

def _uint(value, label, minimum=0, maximum=2**63-1):
    if type(value) is not int or not minimum <= value <= maximum:
        raise AuditGateError("invalid_" + label)
    return value

def _hash(value, label):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", value):
        raise AuditGateError("invalid_" + label)
    return value.lower()

def _time(value, label):
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise AuditGateError("invalid_" + label)
    return value.astimezone(timezone.utc)

def _blocked(stage, reasons, **observations):
    return {"schema": "bchflow.v51."+stage+".audit_only", "decision": "blocked",
            "reasons": sorted(set(reasons)), **observations,
            "bch_daa_verified": False, "canonical_chain_verified": False,
            "provider_independence_verified": False, "invoice_attributed": False,
            "payment_created": False, "settlement_authorized": False}

def b8_daa_prerequisites(headers, *, start_height, checkpoint_height=None):
    """B8: validate header window and identify unavailable DAA history.

    BCH's DAA requires historical chain context and consensus-specific rules.
    This gate intentionally does NOT implement or assert DAA correctness.
    """
    _uint(start_height, "start_height")
    if not isinstance(headers, (list, tuple)) or not 1 <= len(headers) <= MAX_HEADERS:
        raise AuditGateError("invalid_header_window")
    if checkpoint_height is not None:
        _uint(checkpoint_height, "checkpoint_height")
    reasons = ["bch_daa_not_implemented", "trusted_checkpoint_not_established"]
    last = None
    work = 0
    for index, item in enumerate(headers):
        if not isinstance(item, dict):
            raise AuditGateError("invalid_header")
        height = _uint(item.get("height"), "height")
        if height != start_height + index:
            raise AuditGateError("noncontiguous_height")
        h = _hash(item.get("hash"), "header_hash")
        prev = _hash(item.get("previous_hash"), "previous_hash")
        bits = _uint(item.get("bits"), "bits", maximum=0xffffffff)
        try:
            target = compact_to_target(bits)
        except ValueError as exc:
            raise AuditGateError("invalid_pow_target") from exc
        if last is not None and prev != last:
            raise AuditGateError("broken_header_link")
        last = h
        work += (1 << 256) // (target + 1)
    return _blocked("b8", reasons, headers_observed=len(headers),
                    observed_work=str(work), observed_height=start_height+len(headers)-1)

def b9_compare_branches(left, right, *, trusted_common_ancestor=None):
    """B9: compare two *untrusted* branch observations, never select canonical chain."""
    def validate(branch):
        if not isinstance(branch, dict):
            raise AuditGateError("invalid_branch")
        ancestor = _hash(branch.get("ancestor_hash"), "ancestor")
        tip = _hash(branch.get("tip_hash"), "tip")
        height = _uint(branch.get("tip_height"), "tip_height")
        work = _uint(branch.get("observed_work"), "observed_work", minimum=1, maximum=2**256)
        return ancestor, tip, height, work
    a, b = validate(left), validate(right)
    if trusted_common_ancestor is not None:
        _hash(trusted_common_ancestor, "trusted_ancestor")
    reasons = ["consensus_not_verified", "canonical_branch_not_selected"]
    if a[0] != b[0]:
        reasons.append("different_claimed_ancestors")
    if trusted_common_ancestor is None or a[0] != trusted_common_ancestor.lower() or b[0] != trusted_common_ancestor.lower():
        reasons.append("trusted_common_ancestor_unavailable")
    if a[1] != b[1]:
        reasons.append("fork_or_tip_disagreement")
    return _blocked("b9", reasons, same_tip=a[1]==b[1],
                    observed_work_delta=abs(a[3]-b[3]))

def _cashaddr_payload(address):
    normalized = normalize_mainnet_cashaddr(address)
    values = [ALPHABET.index(ch) for ch in normalized.split(":", 1)[1][:-8]]
    acc = 0
    bits = 0
    result = bytearray()
    for value in values:
        acc = (acc << 5) | value
        bits += 5
        while bits >= 8:
            bits -= 8
            result.append((acc >> bits) & 255)
    version = result[0]
    kind = (version >> 3) & 0x0f
    return kind, bytes(result[1:])

def b10_compare_script_address(script_hex, address):
    """B10: exact P2PKH/P2SH locking-script equivalence for mainnet CashAddr.

    No token-aware script parsing, transaction ownership proof, or chain validation.
    """
    if not isinstance(script_hex, str) or len(script_hex) > 10000 or len(script_hex) % 2:
        raise AuditGateError("invalid_script_hex")
    try:
        script = bytes.fromhex(script_hex)
        kind, payload = _cashaddr_payload(address)
    except (ValueError, IndexError, TypeError) as exc:
        raise AuditGateError("invalid_script_or_address") from exc
    if len(payload) != 20:
        return _blocked("b10", ["unsupported_hash_size"])
    expected = (b"\x76\xa9\x14"+payload+b"\x88\xac") if kind == 0 else (b"\xa9\x14"+payload+b"\x87")
    match = script == expected
    return _blocked("b10", ["financial_evidence_not_authenticated"] if match else ["script_address_mismatch"],
                    script_address_equivalence_verified=match)

def b11_invoice_candidate(invoice, output, *, now, reserved_outpoints=()):
    """B11: deterministic invoice/output risk screening; never attribute funds."""
    now = _time(now, "now")
    if not isinstance(invoice, dict) or not isinstance(output, dict):
        raise AuditGateError("invalid_candidate")
    txid = _hash(output.get("txid"), "txid")
    vout = _uint(output.get("vout"), "vout", maximum=100000)
    sats = _uint(output.get("satoshis"), "satoshis", minimum=1)
    amount = _uint(invoice.get("amount_satoshis"), "invoice_amount", minimum=1)
    try:
        addr = normalize_mainnet_cashaddr(invoice.get("receiving_cashaddr"))
        output_addr = normalize_mainnet_cashaddr(output.get("address"))
    except (ValueError, TypeError) as exc:
        raise AuditGateError("invalid_candidate_address") from exc
    reasons = ["independent_chain_consensus_unverified", "exclusive_invoice_attribution_unverified"]
    if invoice.get("network") != "mainnet" or output.get("network") != "mainnet":
        reasons.append("network_mismatch")
    if invoice.get("status") != "created":
        reasons.append("invoice_not_open")
    if sats != amount:
        reasons.append("amount_mismatch")
    if addr != output_addr:
        reasons.append("address_mismatch")
    expiry = invoice.get("expires_at")
    if expiry is not None and now >= _time(expiry, "expiry"):
        reasons.append("invoice_expired")
    if not isinstance(reserved_outpoints, (tuple, list, set, frozenset)) or len(reserved_outpoints) > 5000:
        raise AuditGateError("invalid_reservations")
    for item in reserved_outpoints:
        if not isinstance(item, (tuple, list)) or len(item) != 2:
            raise AuditGateError("invalid_reservation")
        if _hash(item[0], "reserved_txid") == txid and _uint(item[1], "reserved_vout") == vout:
            reasons.append("outpoint_reserved")
    return _blocked("b11", reasons, candidate_outpoint=f"{txid}:{vout}",
                    amounts_equal=sats==amount, addresses_equal=addr==output_addr)

def b12_supervised_gate(candidate, *, actor_role, review_reason, reviewer_is_submitter,
                        approvals=(), current_invoice_status="created"):
    """B12: offline review policy preview, no DB writes or settlement path."""
    if not isinstance(candidate, dict) or not isinstance(approvals, (tuple, list)):
        raise AuditGateError("invalid_review_input")
    if type(reviewer_is_submitter) is not bool:
        raise AuditGateError("invalid_separation_flag")
    reasons = ["manual_review_is_not_settlement", "consensus_not_verified"]
    if candidate.get("decision") != "blocked" or candidate.get("settlement_authorized") is not False:
        reasons.append("untrusted_candidate_state")
    if actor_role not in ("owner", "admin"):
        reasons.append("reviewer_not_authorized")
    if not isinstance(review_reason, str) or not 12 <= len(review_reason.strip()) <= 1000:
        reasons.append("review_reason_invalid")
    if reviewer_is_submitter:
        reasons.append("separation_of_duties_missing")
    if current_invoice_status != "created":
        reasons.append("invoice_not_open")
    if len(approvals) != len(set(map(str, approvals))):
        reasons.append("duplicate_approvals")
    return _blocked("b12", reasons, review_possible_only=True)
