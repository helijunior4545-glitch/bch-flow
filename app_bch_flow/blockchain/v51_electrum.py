"""BCH Flow V5.1-B.3: read-only Electrum BCH evidence, never settlement authority."""
import hashlib
import json
import re
import socket
import ssl
from dataclasses import dataclass

SERVERS = (
    ("cashnode.bch.ninja", 50002),
    ("fulcrum.aglauck.com", 50002),
    ("fulcrum.jettscythe.xyz", 50002),
)
TXID_RE = re.compile(r"[0-9a-fA-F]{64}\Z")
MAX_RAW_HEX = 2_000_000
MAX_LINE = 2_100_000


class ElectrumEvidenceError(ValueError):
    pass


def hash256(data):
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def read_varint(raw, pos):
    if pos >= len(raw):
        raise ElectrumEvidenceError("truncated_varint")
    prefix = raw[pos]
    pos += 1
    width = {253: 2, 254: 4, 255: 8}.get(prefix)
    if width is None:
        return prefix, pos
    if pos + width > len(raw):
        raise ElectrumEvidenceError("truncated_varint")
    value = int.from_bytes(raw[pos:pos + width], "little")
    if value < (253 if width == 2 else 65536 if width == 4 else 4294967296):
        raise ElectrumEvidenceError("noncanonical_varint")
    return value, pos + width


def parse_outputs(raw):
    """Strict non-SegWit BCH transaction framing; returns script bytes, not guessed addresses."""
    if len(raw) < 10 or len(raw) > MAX_RAW_HEX // 2:
        raise ElectrumEvidenceError("invalid_tx_size")
    pos = 4
    inputs, pos = read_varint(raw, pos)
    if not 1 <= inputs <= 100000:
        raise ElectrumEvidenceError("invalid_input_count")
    for _ in range(inputs):
        if pos + 36 > len(raw):
            raise ElectrumEvidenceError("truncated_input")
        pos += 36
        n, pos = read_varint(raw, pos)
        if n > 100000 or pos + n + 4 > len(raw):
            raise ElectrumEvidenceError("invalid_input_script")
        pos += n + 4
    count, pos = read_varint(raw, pos)
    if not 1 <= count <= 10000:
        raise ElectrumEvidenceError("invalid_output_count")
    outputs = []
    for index in range(count):
        if pos + 8 > len(raw):
            raise ElectrumEvidenceError("truncated_output")
        sats = int.from_bytes(raw[pos:pos + 8], "little")
        pos += 8
        if sats > 21_000_000 * 100_000_000:
            raise ElectrumEvidenceError("invalid_output_value")
        n, pos = read_varint(raw, pos)
        if n > 100000 or pos + n > len(raw):
            raise ElectrumEvidenceError("invalid_output_script")
        script = raw[pos:pos + n]
        pos += n
        outputs.append({"vout": index, "satoshis": sats, "script_pubkey_hex": script.hex()})
    if pos + 4 != len(raw):
        raise ElectrumEvidenceError("invalid_tx_trailing_bytes")
    return outputs


def verify_merkle(txid, branch, position, header_hex):
    if not isinstance(branch, list) or len(branch) > 32 or type(position) is not int or position < 0:
        raise ElectrumEvidenceError("invalid_merkle_proof")
    if not isinstance(header_hex, str) or len(header_hex) != 160:
        raise ElectrumEvidenceError("invalid_header")
    try:
        header = bytes.fromhex(header_hex)
        node = bytes.fromhex(txid)[::-1]
        for sibling in branch:
            if not isinstance(sibling, str) or not TXID_RE.fullmatch(sibling):
                raise ElectrumEvidenceError("invalid_merkle_branch")
            other = bytes.fromhex(sibling)[::-1]
            node = hash256(other + node) if position & 1 else hash256(node + other)
            position >>= 1
        if position != 0 or node != header[36:68]:
            raise ElectrumEvidenceError("merkle_root_mismatch")
    except ValueError as exc:
        raise ElectrumEvidenceError("invalid_merkle_hex") from exc
    return hash256(header)[::-1].hex()


def _rpc(stream, request_id, method, params):
    payload = json.dumps({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})
    stream.write((payload + "\n").encode("ascii"))
    stream.flush()
    for _ in range(10):
        line = stream.readline(MAX_LINE + 1)
        if not line or len(line) > MAX_LINE:
            raise ElectrumEvidenceError("invalid_rpc_frame")
        try:
            response = json.loads(line)
        except (ValueError, UnicodeDecodeError) as exc:
            raise ElectrumEvidenceError("invalid_rpc_json") from exc
        if not isinstance(response, dict):
            raise ElectrumEvidenceError("invalid_rpc_object")
        if response.get("id") != request_id:
            continue
        if response.get("error") is not None:
            raise ElectrumEvidenceError("rpc_error")
        return response.get("result")
    raise ElectrumEvidenceError("rpc_id_mismatch")


def collect_one(txid, host, port=50002, *, timeout=7, context=None):
    """Collect verified TLS evidence. Caller must use an explicit trusted host allowlist."""
    if not isinstance(txid, str) or not TXID_RE.fullmatch(txid):
        raise ElectrumEvidenceError("invalid_txid")
    if (host, port) not in SERVERS:
        raise ElectrumEvidenceError("server_not_allowlisted")
    txid = txid.lower()
    context = context or ssl.create_default_context()
    with socket.create_connection((host, port), timeout=timeout) as sock:
        with context.wrap_socket(sock, server_hostname=host) as tls:
            tls.settimeout(timeout)
            with tls.makefile("rwb") as stream:
                version = _rpc(stream, 1, "server.version", ["BCHFlow-ReadOnly/5.1-B.3", "1.4"])
                if not isinstance(version, list) or len(version) != 2 or version[1] != "1.4":
                    raise ElectrumEvidenceError("unsupported_protocol")
                raw_hex = _rpc(stream, 2, "blockchain.transaction.get", [txid, False])
                if not isinstance(raw_hex, str) or len(raw_hex) > MAX_RAW_HEX or len(raw_hex) % 2:
                    raise ElectrumEvidenceError("invalid_raw_transaction")
                try:
                    raw = bytes.fromhex(raw_hex)
                except ValueError as exc:
                    raise ElectrumEvidenceError("invalid_raw_hex") from exc
                if hash256(raw)[::-1].hex() != txid:
                    raise ElectrumEvidenceError("txid_mismatch")
                outputs = parse_outputs(raw)
                # No trusted block height yet: never claim merkle inclusion.
                return {"provider": "electrum_bch", "server": host, "txid": txid,
                        "raw_bytes": len(raw), "outputs": outputs,
                        "txid_verified": True, "merkle_verified": False,
                        "chain_verified": False, "independent_corroboration": False,
                        "invoice_attributed": False, "payment_created": False,
                        "settlement_authorized": False}
