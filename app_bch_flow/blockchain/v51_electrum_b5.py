"""BCH Flow V5.1-B.5: NOWNodes -> Electrum cross-check, diagnostic only.

Two server observations do not establish independent operators or canonical chain.
No invoices, payments, models, migrations, or settlement are touched.
"""
import os
import re
from datetime import datetime, timezone
from .v51_live import _fetch, _url, _blockbook, LiveEvidenceError, PRIMARY
from .v51_electrum_b4 import collect_inclusion
from .v51_electrum import SERVERS, ElectrumEvidenceError

TXID_RE = re.compile(r"[a-fA-F0-9]{64}\Z")


def validate_pair(primary, electrum, txid, *, max_tip_delta=2):
    """Pure fail-closed comparison. Output script/address equality NOT asserted."""
    reasons = []
    if not isinstance(primary, dict) or not isinstance(electrum, dict):
        raise ValueError("invalid_evidence")
    if electrum.get("txid") != txid:
        reasons.append("electrum_txid_mismatch")
    if primary.get("height") != electrum.get("block_height"):
        reasons.append("height_mismatch")
    if primary.get("block_hash") != electrum.get("block_hash"):
        reasons.append("block_hash_mismatch")
    if electrum.get("merkle_verified") is not True:
        reasons.append("merkle_not_verified")
    if electrum.get("external_anchor_match") is not True:
        reasons.append("anchor_not_verified")
    if electrum.get("raw_txid_verified") is not True:
        reasons.append("raw_txid_not_verified")
    primary_outputs = primary.get("outputs")
    electrum_outputs = electrum.get("outputs")
    if not isinstance(primary_outputs, list) or not isinstance(electrum_outputs, list):
        reasons.append("outputs_unavailable")
    else:
        p = [(x.get("vout"), x.get("satoshis")) for x in primary_outputs if isinstance(x, dict)]
        e = [(x.get("vout"), x.get("satoshis")) for x in electrum_outputs if isinstance(x, dict)]
        if len(p) != len(primary_outputs) or len(e) != len(electrum_outputs) or p != e:
            reasons.append("output_amounts_mismatch")
    conf = primary.get("confirmations")
    ec = electrum.get("confirmations_arithmetic")
    if type(conf) is not int or conf < 1 or type(ec) is not int or ec < 1:
        reasons.append("confirmations_unavailable")
    elif abs(conf - ec) > max_tip_delta:
        reasons.append("confirmations_disagree")
    return {
        "schema": "bchflow.v51.b5.readonly_diagnostic",
        "comparison": "consistent_unverified_sources" if not reasons else "blocked",
        "reasons": reasons,
        "txid": txid,
        "block_height": primary.get("height") if not reasons else None,
        "block_hash": primary.get("block_hash") if not reasons else None,
        "merkle_verified": not reasons and electrum.get("merkle_verified") is True,
        "canonical_chain_verified": False,
        "script_address_equivalence_verified": False,
        "provider_independence_verified": False,
        "independent_corroboration": False,
        "invoice_attributed": False,
        "payment_created": False,
        "settlement_authorized": False,
    }


def collect_diagnostic(txid, *, server="cashnode.bch.ninja", opener=None, now=None,
                       primary_fetch=None, electrum_fetch=None):
    """Explicit opt-in read-only live diagnostic, no automatic fallback.

    Primary height/hash/conf are fetched from NOWNodes; Electrum B4 verifies
    Merkle against its header and compares header hash to NOWNodes anchor.
    Primary provider alone supplies tip; this is NOT independent finality.
    """
    if os.getenv("BCHFLOW_V51B5_ENABLE_LIVE") != "1":
        raise LiveEvidenceError("b5_live_disabled")
    if not isinstance(txid, str) or not TXID_RE.fullmatch(txid):
        raise LiveEvidenceError("invalid_txid")
    if (server, 50002) not in SERVERS:
        raise LiveEvidenceError("server_not_allowlisted")
    txid = txid.lower()
    key = os.getenv("BCHFLOW_V48_PRIMARY_KEY", "").strip()
    if not key or "\n" in key or "\r" in key:
        raise LiveEvidenceError("missing_or_invalid_nownodes_key")
    base = _url(os.getenv("BCHFLOW_V51B_PRIMARY_URL", PRIMARY), "bchbook.nownodes.io")
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise LiveEvidenceError("naive_timestamp")
    fetch = primary_fetch or _fetch
    raw = fetch(base + "/api/v2/tx/" + txid,
                {"api-key": key, "Accept": "application/json"}, opener)
    primary = _blockbook(raw, txid, now)
    tip = primary["height"] + primary["confirmations"] - 1
    if tip < primary["height"]:
        raise LiveEvidenceError("invalid_primary_tip")
    electrum = (electrum_fetch or collect_inclusion)(
        txid, server, block_height=primary["height"],
        trusted_block_hash=primary["block_hash"], trusted_tip_height=tip)
    return validate_pair(primary, electrum, txid)


def assess_diagnostic(txid, **kwargs):
    """Safe public wrapper; never leaks API keys, endpoints or raw provider bodies."""
    try:
        return collect_diagnostic(txid, **kwargs)
    except (LiveEvidenceError, ElectrumEvidenceError, OSError, ValueError, TypeError,
            KeyError, AttributeError, TimeoutError) as exc:
        # Provider error details are intentionally not included in the response.
        return {"schema": "bchflow.v51.b5.readonly_diagnostic", "comparison": "blocked",
                "reasons": ["diagnostic_unavailable"], "canonical_chain_verified": False,
                "independent_corroboration": False, "invoice_attributed": False,
                "payment_created": False, "settlement_authorized": False}
