"""Chipnet read-only wallet observation. No signing, no broadcast, no keys."""
import hashlib
import json
import os
import socket
import ssl
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.http import require_GET
from app_bch_flow.models import BCHMembership
from app_bch_flow.views.authentication import current_identity
from app_bch_flow.wallet.v53b_cashaddr import validate_cashaddr_checksum

ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
HOST = "chipnet.imaginary.cash"


def _hash160_from_cashaddr(address):
    payload = address.split(":", 1)[1][:-8]
    acc = bits = 0
    result = bytearray()
    for c in payload:
        acc = (acc << 5) | ALPHABET.index(c)
        bits += 5
        while bits >= 8:
            bits -= 8
            result.append((acc >> bits) & 255)
    if bits and (acc & ((1 << bits) - 1)):
        raise ValueError("bad_padding")
    if len(result) != 21 or result[0] != 0:
        raise ValueError("invalid_payload")
    return bytes(result[1:])


def _rpc(method, params):
    request = json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}) + "\n"
    with socket.create_connection((HOST, 50002), timeout=5) as sock:
        with ssl.create_default_context().wrap_socket(sock, server_hostname=HOST) as conn:
            conn.settimeout(8)
            conn.sendall(request.encode("utf-8"))
            data = bytearray()
            while b"\n" not in data:
                chunk = conn.recv(8192)
                if not chunk or len(data) + len(chunk) > 262144:
                    raise ValueError("invalid_provider_response")
                data.extend(chunk)
    response = json.loads(bytes(data).split(b"\n",1)[0])
    if not isinstance(response,dict) or response.get("id") != 1 or response.get("error") is not None:
        raise ValueError("invalid_provider_response")
    return response.get("result")


@require_GET
def chipnet_observe(request, org_id):
    identity = current_identity(request)
    if identity is None:
        return redirect("bch_flow:login")
    get_object_or_404(BCHMembership, identity=identity, organization_id=org_id,
                      is_active=True, organization__is_active=True,
                      role__in=("owner","admin","operator","viewer"))
    address = os.getenv("BCHFLOW_CHIPNET_WATCH_ADDRESS", "").strip()
    if not validate_cashaddr_checksum(address, network="chipnet"):
        return JsonResponse({"status":"NOT_CONFIGURED", "network":"chipnet", "spending_enabled":False},status=503)
    pubkey_hash = _hash160_from_cashaddr(address)
    script = bytes.fromhex("76a914") + pubkey_hash + bytes.fromhex("88ac")
    scripthash = hashlib.sha256(script).digest()[::-1].hex()
    try:
        height = _rpc("blockchain.headers.subscribe", [])
        rows = _rpc("blockchain.scripthash.listunspent", [scripthash])
        if not isinstance(height,dict) or type(height.get("height")) is not int or not isinstance(rows,list) or len(rows)>1000:
            raise ValueError("invalid_provider_response")
        tip = height["height"]
        seen = set()
        utxos = []
        for row in rows:
            if not isinstance(row,dict):
                raise ValueError("invalid_provider_response")
            txid, vout, value, block = (row.get(k) for k in ("tx_hash","tx_pos","value","height"))
            if (not isinstance(txid,str) or len(txid)!=64 or any(c not in "0123456789abcdefABCDEF" for c in txid)
                    or type(vout) is not int or not 0<=vout<=100000 or type(value) is not int
                    or not 0<value<=2100000000000000 or type(block) is not int or block < 0 or block > tip):
                raise ValueError("invalid_provider_response")
            key=(txid.lower(),vout)
            if key in seen:
                raise ValueError("duplicate_utxo")
            seen.add(key)
            utxos.append({"txid":txid.lower(),"vout":vout,"satoshis":value,
                          "confirmations":tip-block+1 if block else 0})
    except (OSError,TimeoutError,ssl.SSLError,ValueError,TypeError,KeyError,UnicodeError,json.JSONDecodeError):
        return JsonResponse({"status":"UNAVAILABLE", "network":"chipnet", "spending_enabled":False},status=503)
    response = JsonResponse({"status":"OBSERVED_UNVERIFIED_SINGLE_PROVIDER", "network":"chipnet",
          "address":address,"tip_height":tip,"utxos":utxos,
          "observed_satoshis":sum(u["satoshis"] for u in utxos),
          "spending_enabled":False,"settlement_verified":False,
          "note":"Single-provider observation only; not proof of ownership or settlement."})
    response["Cache-Control"] = "no-store"
    return response
