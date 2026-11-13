"""BCH Flow V5.1-B.6: bounded observed header continuity (diagnostic only).

No BCH difficulty-adjustment validation, cumulative-work comparison, independent
canonical-chain proof, invoice attribution, payment creation or settlement.
"""
import hashlib
import json
import os
import re
import socket
import ssl
from .v51_electrum import SERVERS
from .v51_electrum_b5 import assess_diagnostic

TXID_RE = re.compile(r"[0-9a-fA-F]{64}\Z")
MAX_HEADERS = 144
MAX_REPLY_BYTES = 1024 * 1024

class HeaderDiagnosticError(ValueError):
    pass

def hash256(b):
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()

def header_hash(header):
    if not isinstance(header, bytes) or len(header) != 80:
        raise HeaderDiagnosticError("invalid_header")
    return hash256(header)[::-1].hex()

def validate_headers(start_height, headers_hex, expected_anchor_hash, tip_height, tip_header_hex, *, max_headers=MAX_HEADERS):
    """Verify header hashes and previous-block pointers, not BCH consensus rules."""
    if type(start_height) is not int or start_height < 0 or type(tip_height) is not int or tip_height < start_height:
        raise HeaderDiagnosticError("invalid_heights")
    if type(max_headers) is not int or not 1 <= max_headers <= MAX_HEADERS:
        raise HeaderDiagnosticError("invalid_limit")
    count = tip_height - start_height + 1
    if count > max_headers:
        raise HeaderDiagnosticError("range_exceeds_limit")
    if not isinstance(headers_hex, str) or len(headers_hex) != count * 160:
        raise HeaderDiagnosticError("invalid_header_range")
    if not isinstance(expected_anchor_hash, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", expected_anchor_hash):
        raise HeaderDiagnosticError("invalid_anchor")
    if not isinstance(tip_header_hex, str) or len(tip_header_hex) != 160:
        raise HeaderDiagnosticError("invalid_tip_header")
    try:
        raw = bytes.fromhex(headers_hex)
        tip_header = bytes.fromhex(tip_header_hex)
    except ValueError as exc:
        raise HeaderDiagnosticError("invalid_header_hex") from exc
    headers = [raw[i:i+80] for i in range(0, len(raw), 80)]
    if header_hash(headers[0]) != expected_anchor_hash.lower():
        raise HeaderDiagnosticError("anchor_mismatch")
    for previous, current in zip(headers, headers[1:]):
        if current[4:36] != hash256(previous):
            raise HeaderDiagnosticError("broken_previous_hash_link")
    if headers[-1] != tip_header:
        raise HeaderDiagnosticError("tip_header_mismatch")
    return {"anchor_height": start_height, "tip_height": tip_height,
            "headers_verified": count, "tip_hash": header_hash(tip_header),
            "observed_header_continuity": True,
            "bch_consensus_verified": False, "canonical_chain_verified": False}

def _read_json_line(sock, limit=MAX_REPLY_BYTES):
    buf = bytearray()
    while len(buf) <= limit:
        chunk = sock.recv(min(4096, limit + 1 - len(buf)))
        if not chunk:
            raise HeaderDiagnosticError("electrum_connection_closed")
        buf.extend(chunk)
        if b"\n" in buf:
            line = bytes(buf).split(b"\n", 1)[0]
            try:
                return json.loads(line)
            except (ValueError, UnicodeDecodeError) as exc:
                raise HeaderDiagnosticError("invalid_electrum_json") from exc
    raise HeaderDiagnosticError("electrum_reply_too_large")

def fetch_electrum_headers(server, anchor_height, *, timeout=8, max_headers=MAX_HEADERS):
    """TLS-authenticated allowlisted Electrum; one request per connection."""
    if (server, 50002) not in SERVERS:
        raise HeaderDiagnosticError("server_not_allowlisted")
    if type(anchor_height) is not int or anchor_height < 0:
        raise HeaderDiagnosticError("invalid_anchor_height")
    if type(timeout) not in (int, float) or not 1 <= timeout <= 20:
        raise HeaderDiagnosticError("invalid_timeout")
    context = ssl.create_default_context()
    def rpc(method, params):
        with socket.create_connection((server, 50002), timeout=timeout) as tcp:
            with context.wrap_socket(tcp, server_hostname=server) as tls:
                tls.settimeout(timeout)
                payload = json.dumps({"id": 1, "method": method, "params": params}, separators=(",", ":")) + "\n"
                tls.sendall(payload.encode("ascii"))
                response = _read_json_line(tls)
        if not isinstance(response, dict) or response.get("id") != 1 or response.get("error") is not None:
            raise HeaderDiagnosticError("electrum_rpc_error")
        return response.get("result")
    tip = rpc("blockchain.headers.subscribe", [])
    if not isinstance(tip, dict) or type(tip.get("height")) is not int or not isinstance(tip.get("hex"), str):
        raise HeaderDiagnosticError("invalid_electrum_tip")
    tip_height = tip["height"]
    count = tip_height - anchor_height + 1
    if not 1 <= count <= max_headers:
        raise HeaderDiagnosticError("range_exceeds_limit_or_tip_behind")
    batch = rpc("blockchain.block.headers", [anchor_height, count])
    if not isinstance(batch, dict) or type(batch.get("count")) is not int or batch["count"] != count or not isinstance(batch.get("hex"), str):
        raise HeaderDiagnosticError("invalid_electrum_batch")
    return {"tip_height": tip_height, "tip_header_hex": tip["hex"], "headers_hex": batch["hex"]}

def assess_continuity(txid, *, server="cashnode.bch.ninja", b5_fetch=None, header_fetch=None, max_headers=MAX_HEADERS):
    """Opt-in, fail-closed; injected fetchers support isolated tests."""
    blocked = {"schema": "bchflow.v51.b6.readonly_diagnostic", "comparison": "blocked",
               "reasons": ["diagnostic_unavailable"], "observed_header_continuity": False,
               "canonical_chain_verified": False, "bch_consensus_verified": False,
               "provider_independence_verified": False, "independent_corroboration": False,
               "invoice_attributed": False, "payment_created": False, "settlement_authorized": False}
    try:
        if os.getenv("BCHFLOW_V51B6_ENABLE_LIVE") != "1":
            raise HeaderDiagnosticError("b6_live_disabled")
        if not isinstance(txid, str) or not TXID_RE.fullmatch(txid):
            raise HeaderDiagnosticError("invalid_txid")
        if (server, 50002) not in SERVERS:
            raise HeaderDiagnosticError("server_not_allowlisted")
        if type(max_headers) is not int or not 1 <= max_headers <= MAX_HEADERS:
            raise HeaderDiagnosticError("invalid_limit")
        prior = (b5_fetch or assess_diagnostic)(txid.lower(), server=server)
        if not isinstance(prior, dict) or prior.get("comparison") != "consistent_unverified_sources" or prior.get("merkle_verified") is not True:
            raise HeaderDiagnosticError("b5_not_consistent")
        height, anchor = prior.get("block_height"), prior.get("block_hash")
        if type(height) is not int or height < 0:
            raise HeaderDiagnosticError("missing_anchor_height")
        fetch = header_fetch or fetch_electrum_headers
        observed = fetch(server, height, max_headers=max_headers)
        checked = validate_headers(height, observed["headers_hex"], anchor,
                                   observed["tip_height"], observed["tip_header_hex"], max_headers=max_headers)
        return {"schema": "bchflow.v51.b6.readonly_diagnostic",
                "comparison": "observed_header_continuity_unverified_consensus", "reasons": [],
                "txid": txid.lower(), "block_hash": anchor, **checked,
                "provider_independence_verified": False, "independent_corroboration": False,
                "invoice_attributed": False, "payment_created": False, "settlement_authorized": False}
    except (HeaderDiagnosticError, OSError, ValueError, TypeError, KeyError, AttributeError, TimeoutError, ssl.SSLError):
        return blocked
