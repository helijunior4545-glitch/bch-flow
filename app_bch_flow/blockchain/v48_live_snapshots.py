"""BCH Flow V4.8: opt-in, read-only Blockbook v2 live snapshot adapter.

External API agreement is not consensus proof. No invoice writes or settlement.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPHandler, HTTPSHandler, HTTPRedirectHandler
import json
import os
import re

from .v47_reorg_freshness import ChainSnapshot, assess_chain_freshness

HEX = re.compile(r"[0-9a-fA-F]{64}\Z")
HOST = re.compile(r"[a-z0-9.-]+\Z")

class SnapshotError(ValueError):
    pass

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SnapshotError("Redirect prohibited")

@dataclass(frozen=True)
class SnapshotResult:
    previous: ChainSnapshot
    current: ChainSnapshot
    assessment: object
    settlement_authorized: bool = False
    warning: str = "EXTERNAL API DATA ONLY; NO CONSENSUS PROOF OR SETTLEMENT"

def _integer(value, label, *, minimum=0):
    if type(value) is not int or value < minimum:
        raise SnapshotError("Invalid " + label)
    return value

def _endpoint(base):
    if not isinstance(base, str):
        raise SnapshotError("Invalid endpoint")
    p = urlsplit(base)
    if (p.scheme != "https" or not p.hostname or p.username or p.password or
        p.query or p.fragment or p.path not in ("", "/") or
        p.port not in (None, 443) or not HOST.fullmatch(p.hostname)):
        raise SnapshotError("HTTPS host-only endpoint required")
    return p.hostname.lower(), "https://" + p.hostname.lower()

def _allowlisted(host):
    hosts = {h.strip().lower() for h in os.getenv("BCHFLOW_V48_ALLOWED_HOSTS", "").split(",") if h.strip()}
    if host not in hosts:
        raise SnapshotError("Provider not allowlisted")

def _fetch(url, headers, *, timeout=8):
    opener = build_opener(HTTPHandler(), HTTPSHandler(), NoRedirect())
    request = Request(url, headers=headers, method="GET")
    with opener.open(request, timeout=timeout) as response:
        if response.status != 200:
            raise SnapshotError("Provider HTTP error")
        data = response.read(512001)
        if len(data) > 512000:
            raise SnapshotError("Provider response too large")
    return json.loads(data)

def _read(base, txid, *, api_key="", fetch=None):
    host, origin = _endpoint(base)
    _allowlisted(host)
    if not HEX.fullmatch(txid):
        raise SnapshotError("Invalid TXID")
    headers = {"Accept": "application/json", "User-Agent": "BCHFlow-V48-ReadOnly"}
    if api_key:
        headers["api-key"] = api_key
    transport = fetch or _fetch
    try:
        tx = transport(origin + "/api/v2/tx/" + txid, headers)
        status = transport(origin + "/api/v2", headers)
    except (OSError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        raise SnapshotError("Provider read failed") from exc
    if not isinstance(tx, dict) or not isinstance(status, dict):
        raise SnapshotError("Malformed provider response")
    return host, tx, status

def _normalize(host, tx, status, *, txid, address, expected):
    if tx.get("txid", "").lower() != txid.lower():
        raise SnapshotError("Transaction ID mismatch")
    if not isinstance(status.get("blockbook"), dict) or not isinstance(status.get("backend"), dict):
        raise SnapshotError("Missing chain status")
    book, backend = status["blockbook"], status["backend"]
    if book.get("inSync") is not True or book.get("initialSync") is True:
        raise SnapshotError("Provider out of sync")
    chain = backend.get("chain")
    if chain not in ("main", "mainnet"):
        raise SnapshotError("Provider is not BCH mainnet")
    coin = book.get("coin", "")
    if not isinstance(coin, str) or coin.lower() not in ("bitcoin cash", "bitcoincash", "bch"):
        raise SnapshotError("Provider coin identity not BCH")
    height = _integer(tx.get("blockHeight"), "block height", minimum=1)
    confirmations = _integer(tx.get("confirmations"), "confirmations", minimum=1)
    tip = _integer(book.get("bestHeight"), "tip height", minimum=1)
    if tip < height or confirmations != tip - height + 1:
        raise SnapshotError("Inconsistent chain height/confirmations")
    block_hash = tx.get("blockHash")
    if not isinstance(block_hash, str) or not HEX.fullmatch(block_hash):
        raise SnapshotError("Missing block hash")
    block_time = _integer(tx.get("blockTime"), "block time", minimum=1)
    if block_time > int(datetime.now(timezone.utc).timestamp()) + 7200:
        raise SnapshotError("Future block time")
    outputs = tx.get("vout")
    if not isinstance(outputs, list) or len(outputs) > 5000:
        raise SnapshotError("Malformed outputs")
    matched = {}
    for out in outputs:
        if not isinstance(out, dict):
            raise SnapshotError("Malformed output")
        n = _integer(out.get("n"), "output index")
        value = out.get("value")
        if not isinstance(value, str) or not value.isascii() or not value.isdecimal():
            raise SnapshotError("Output value must be integer satoshi string")
        sat = int(value)
        addresses = out.get("addresses", [])
        if not isinstance(addresses, list) or not all(isinstance(a, str) for a in addresses):
            raise SnapshotError("Invalid output addresses")
        if address in addresses:
            if n in matched:
                raise SnapshotError("Duplicate output index")
            matched[n] = sat
    if matched != expected:
        raise SnapshotError("Invoice output allocation mismatch")
    return height, tip, confirmations, block_hash.lower(), tuple(sorted(matched.items()))

def _single(base_a, base_b, *, txid, address, expected, key_a, key_b, fetch, observed_at):
    host_a, _ = _endpoint(base_a)
    host_b, _ = _endpoint(base_b)
    if host_a == host_b:
        raise SnapshotError("Same provider host")
    _allowlisted(host_a)
    _allowlisted(host_b)
    a = _read(base_a, txid, api_key=key_a, fetch=fetch)
    b = _read(base_b, txid, api_key=key_b, fetch=fetch)
    na = _normalize(*a, txid=txid, address=address, expected=expected)
    nb = _normalize(*b, txid=txid, address=address, expected=expected)
    # Different tip heights are possible; do not infer agreement in that case.
    if na != nb:
        raise SnapshotError("Provider disagreement")
    height, tip, confirmations, block_hash, outpoints = na
    return ChainSnapshot(txid.lower(), "mainnet", block_hash, height, tip,
                         confirmations, observed_at, (host_a, host_b), True, outpoints)

def collect_live_snapshots(txid, receiving_cashaddr, expected_outpoints, *,
                           primary_url, secondary_url, primary_key="", secondary_key="",
                           fetch=None, clock=None, min_confirmations=2, max_age_seconds=120):
    """Fetch two successive pairs of live provider snapshots, then assess V4.7.

    Opt-in via BCHFLOW_V48_ENABLE_LIVE=1; network reads only. No persistence.
    expected_outpoints: dict[vout] = satoshis, explicitly supplied by caller.
    """
    if os.getenv("BCHFLOW_V48_ENABLE_LIVE") != "1":
        raise SnapshotError("Live observation disabled")
    if not isinstance(txid, str) or not HEX.fullmatch(txid):
        raise SnapshotError("Invalid TXID")
    if not isinstance(receiving_cashaddr, str) or not receiving_cashaddr.startswith("bitcoincash:"):
        raise SnapshotError("Explicit BCH CashAddr required")
    if (not isinstance(expected_outpoints, dict) or not expected_outpoints or
        len(expected_outpoints) > 5000):
        raise SnapshotError("Expected outpoints required")
    expected = {}
    for n, sat in expected_outpoints.items():
        _integer(n, "expected vout")
        _integer(sat, "expected satoshis", minimum=1)
        expected[n] = sat
    now = clock or (lambda: datetime.now(timezone.utc))
    previous = _single(primary_url, secondary_url, txid=txid, address=receiving_cashaddr,
                       expected=expected, key_a=primary_key, key_b=secondary_key,
                       fetch=fetch, observed_at=now())
    current = _single(primary_url, secondary_url, txid=txid, address=receiving_cashaddr,
                      expected=expected, key_a=primary_key, key_b=secondary_key,
                      fetch=fetch, observed_at=now())
    result = assess_chain_freshness(previous, current, now=now(),
                                    min_confirmations=min_confirmations,
                                    max_age_seconds=max_age_seconds)
    return SnapshotResult(previous, current, result)
