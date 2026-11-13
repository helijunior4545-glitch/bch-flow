"""BCH Flow V5.1-B.4: read-only Electrum inclusion evidence.

External block height/hash MUST come from a separately verified source.
This module does not certify provider independence or canonical BCH chain.
"""
import re
from .v51_electrum import (
    SERVERS, ElectrumEvidenceError, _rpc, collect_one, hash256, verify_merkle,
)
import socket
import ssl

HEX64 = re.compile(r"[0-9a-fA-F]{64}\Z")


def _require_int(value, label):
    if type(value) is not int or value < 1 or value > 100_000_000:
        raise ElectrumEvidenceError("invalid_" + label)
    return value


def verify_inclusion(txid, block_height, merkle_result, header_hex, *,
                     trusted_block_hash=None, trusted_tip_height=None):
    """Pure verification. Trusted inputs must be independently sourced by caller.

    A matching block hash is only as trustworthy as the caller's anchor.
    A confirmation count is an arithmetic observation, not chain finality.
    """
    if not isinstance(txid, str) or not HEX64.fullmatch(txid):
        raise ElectrumEvidenceError("invalid_txid")
    _require_int(block_height, "block_height")
    if not isinstance(merkle_result, dict):
        raise ElectrumEvidenceError("invalid_merkle_result")
    if merkle_result.get("block_height") != block_height:
        raise ElectrumEvidenceError("merkle_height_mismatch")
    branch = merkle_result.get("merkle")
    position = merkle_result.get("pos")
    block_hash = verify_merkle(txid.lower(), branch, position, header_hex)
    if trusted_block_hash is None:
        anchor_match = False
    else:
        if not isinstance(trusted_block_hash, str) or not HEX64.fullmatch(trusted_block_hash):
            raise ElectrumEvidenceError("invalid_trusted_block_hash")
        if block_hash != trusted_block_hash.lower():
            raise ElectrumEvidenceError("trusted_block_hash_mismatch")
        anchor_match = True
    confirmations = None
    if trusted_tip_height is not None:
        _require_int(trusted_tip_height, "trusted_tip_height")
        if trusted_tip_height < block_height:
            raise ElectrumEvidenceError("trusted_tip_behind_block")
        confirmations = trusted_tip_height - block_height + 1
    return {
        "txid": txid.lower(), "block_height": block_height,
        "block_hash": block_hash, "merkle_verified": True,
        "external_anchor_match": anchor_match,
        "confirmations_arithmetic": confirmations,
        "canonical_chain_verified": False,
        "independent_corroboration": False,
        "invoice_attributed": False, "payment_created": False,
        "settlement_authorized": False,
    }


def collect_inclusion(txid, host, *, block_height, trusted_block_hash=None,
                      trusted_tip_height=None, port=50002, timeout=7):
    """Query read-only inclusion proof; do not infer block height from raw TX.

    The block height and optional block hash/tip must be obtained independently.
    This function intentionally makes no payment or settlement decisions.
    """
    if (host, port) not in SERVERS:
        raise ElectrumEvidenceError("server_not_allowlisted")
    _require_int(block_height, "block_height")
    # Verify raw TX and output framing before requesting proof.
    raw_evidence = collect_one(txid, host, port, timeout=timeout)
    context = ssl.create_default_context()
    with socket.create_connection((host, port), timeout=timeout) as sock:
        with context.wrap_socket(sock, server_hostname=host) as tls:
            tls.settimeout(timeout)
            with tls.makefile("rwb") as stream:
                version = _rpc(stream, 1, "server.version", ["BCHFlow-ReadOnly/5.1-B.4", "1.4"])
                if not isinstance(version, list) or len(version) != 2 or version[1] != "1.4":
                    raise ElectrumEvidenceError("unsupported_protocol")
                proof = _rpc(stream, 2, "blockchain.transaction.get_merkle", [txid.lower(), block_height])
                header = _rpc(stream, 3, "blockchain.block.header", [block_height])
    if not isinstance(header, str) or len(header) != 160:
        raise ElectrumEvidenceError("invalid_header")
    result = verify_inclusion(txid, block_height, proof, header,
                              trusted_block_hash=trusted_block_hash,
                              trusted_tip_height=trusted_tip_height)
    result.update({"provider": "electrum_bch", "server": host,
                   "raw_txid_verified": raw_evidence["txid_verified"],
                   "outputs": raw_evidence["outputs"]})
    return result
