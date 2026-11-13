"""V4.9 read-only BCH mainnet transaction diagnostic; not a settlement oracle."""
from datetime import datetime, timezone
from urllib.request import Request, build_opener, HTTPSHandler, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
import json
import os
import re

HOST = "https://bchbook.nownodes.io"
HEX64 = re.compile(r"[a-fA-F0-9]{64}\Z")

class DiagnosticError(ValueError):
    pass

class DenyRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise DiagnosticError("redirect_not_allowed")

def fetch_json(path, *, api_key, timeout=10):
    if not api_key or not isinstance(api_key, str):
        raise DiagnosticError("missing_api_key")
    if not (path in ("/api", "/api/status") or
            re.fullmatch(r"/api/v2/(?:tx/[0-9a-fA-F]{64}|block-index/[0-9]+)", path)):
        raise DiagnosticError("path_not_allowlisted")
    request = Request(HOST + path, headers={"api-key": api_key, "Accept": "application/json", "User-Agent": "BCHFlow-V49-ReadOnly"}, method="GET")
    try:
        with build_opener(HTTPSHandler(), DenyRedirect()).open(request, timeout=timeout) as response:
            if response.status != 200:
                raise DiagnosticError("provider_http_error")
            data = response.read(512001)
            if len(data) > 512000:
                raise DiagnosticError("response_too_large")
            obj = json.loads(data)
            if not isinstance(obj, dict):
                raise DiagnosticError("invalid_json_object")
            return obj
    except (HTTPError, URLError, OSError, ValueError, UnicodeError) as exc:
        if isinstance(exc, DiagnosticError):
            raise
        raise DiagnosticError("provider_request_failed") from exc

def _number(value, label, minimum=0):
    if type(value) is not int or value < minimum:
        raise DiagnosticError("invalid_" + label)
    return value

def inspect_transaction(txid, *, api_key=None, fetch=None, clock=None):
    """Single-provider observation only. No database access or side effects."""
    if os.getenv("BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC") != "1":
        raise DiagnosticError("diagnostic_disabled")
    if not isinstance(txid, str) or not HEX64.fullmatch(txid):
        raise DiagnosticError("invalid_txid")
    key = api_key if api_key is not None else os.getenv("BCHFLOW_V48_PRIMARY_KEY", "")
    if not key:
        raise DiagnosticError("missing_api_key")
    get = fetch or (lambda path: fetch_json(path, api_key=key))
    status = get("/api")
    book = status.get("blockbook")
    backend = status.get("backend")
    if not isinstance(book, dict) or not isinstance(backend, dict):
        raise DiagnosticError("missing_status")
    if book.get("inSync") is not True or book.get("initialSync") is True:
        raise DiagnosticError("indexer_not_synced")
    if backend.get("chain") not in ("main", "mainnet"):
        raise DiagnosticError("wrong_chain")
    # NOWNodes documents 'Bcash'; other providers may use 'Bitcoin Cash'.
    if str(book.get("coin", "")).lower() not in ("bcash", "bitcoin cash", "bitcoincash", "bch"):
        raise DiagnosticError("wrong_coin")
    tip = _number(book.get("bestHeight"), "tip", 1)
    tx = get("/api/v2/tx/" + txid.lower())
    if not isinstance(tx, dict) or tx.get("txid", "").lower() != txid.lower():
        raise DiagnosticError("txid_mismatch")
    conf = _number(tx.get("confirmations"), "confirmations", 1)
    height = _number(tx.get("blockHeight"), "block_height", 1)
    if height > tip or conf != tip - height + 1:
        raise DiagnosticError("inconsistent_confirmations")
    block_hash = tx.get("blockHash")
    if not isinstance(block_hash, str) or not HEX64.fullmatch(block_hash):
        raise DiagnosticError("missing_block_hash")
    idx = get("/api/v2/block-index/" + str(height))
    idx_hash = idx.get("blockHash")
    if not isinstance(idx_hash, str) or idx_hash.lower() != block_hash.lower():
        raise DiagnosticError("block_index_disagreement")
    block_time = _number(tx.get("blockTime"), "block_time", 1)
    now = clock() if clock else datetime.now(timezone.utc)
    if now.tzinfo is None or block_time > int(now.timestamp()) + 7200:
        raise DiagnosticError("invalid_block_time")
    vouts = tx.get("vout")
    if not isinstance(vouts, list) or not vouts or len(vouts) > 5000:
        raise DiagnosticError("invalid_outputs")
    outputs = []
    seen = set()
    for item in vouts:
        if not isinstance(item, dict):
            raise DiagnosticError("invalid_output")
        index = _number(item.get("n"), "vout")
        value = item.get("value")
        if not isinstance(value, str) or not value.isascii() or not value.isdecimal():
            raise DiagnosticError("invalid_satoshis")
        if index in seen:
            raise DiagnosticError("duplicate_vout")
        seen.add(index)
        addresses = item.get("addresses", [])
        if not isinstance(addresses, list) or not all(isinstance(a, str) for a in addresses):
            raise DiagnosticError("invalid_addresses")
        outputs.append({"vout": index, "satoshis": int(value), "addresses": addresses})
    return {
        "schema": "bchflow.v49.real_transaction_diagnostic",
        "provider": "nownodes_bch_blockbook", "network": "mainnet", "txid": txid.lower(),
        "block_hash": block_hash.lower(), "block_height": height, "tip_height": tip,
        "confirmations": conf, "block_time": block_time,
        "observed_at": now.isoformat(), "outputs": sorted(outputs, key=lambda v: v["vout"]),
        "provider_status": "in_sync", "assessment": "external_single_provider_observation_only",
        "independent_corroboration": False, "invoice_attributed": False,
        "settlement_authorized": False, "payment_created": False,
        "warning": "External provider report only. Not independent proof of payment or finality."
    }
