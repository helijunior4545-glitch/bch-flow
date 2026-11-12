"""Read-only Chipnet UTXO snapshot for the financial UI.

Single-provider observation is NOT settlement, ownership proof, or an accounting credit.
"""
import hashlib
import os
from decimal import Decimal
from app_bch_flow.views.chipnet_watch_v1 import _rpc, _hash160_from_cashaddr
from app_bch_flow.wallet.v53b_cashaddr import validate_cashaddr_checksum


def observe_chipnet_balance():
    address = os.environ.get("BCHFLOW_CHIPNET_WATCH_ADDRESS", "").strip()
    if not validate_cashaddr_checksum(address, network="chipnet"):
        return None
    try:
        script = bytes.fromhex("76a914") + _hash160_from_cashaddr(address) + bytes.fromhex("88ac")
        script_hash = hashlib.sha256(script).digest()[::-1].hex()
        tip = _rpc("blockchain.headers.subscribe", [])
        rows = _rpc("blockchain.scripthash.listunspent", [script_hash])
        if not isinstance(tip, dict) or type(tip.get("height")) is not int:
            return None
        if not isinstance(rows, list) or len(rows) > 1000:
            return None
        seen = set()
        total = 0
        for item in rows:
            if not isinstance(item, dict):
                return None
            txid, vout, value, height = (item.get(k) for k in ("tx_hash", "tx_pos", "value", "height"))
            if (not isinstance(txid, str) or len(txid) != 64 or
                any(c not in "0123456789abcdefABCDEF" for c in txid) or
                type(vout) is not int or not 0 <= vout <= 100000 or
                type(value) is not int or not 0 < value <= 2100000000000000 or
                type(height) is not int or not 0 <= height <= tip["height"]):
                return None
            outpoint = (txid.lower(), vout)
            if outpoint in seen:
                return None
            seen.add(outpoint)
            total += value
            if total > 2100000000000000:
                return None
        return {"address": address, "balance": f"{Decimal(total)/Decimal(100000000):.8f}", "utxo_count": len(seen)}
    except (OSError, TimeoutError, ValueError, TypeError, KeyError, UnicodeError):
        return None
