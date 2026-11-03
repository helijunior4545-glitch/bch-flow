"""V5.3-B public-key-to-CashAddr encoder. No secret handling or ownership proof.

Accepts SEC compressed public key (33 bytes). For wallet-controlled funds, the
caller must independently verify the key and prove control via a BCH-compatible
signature protocol. This module never authorizes real deposits.
"""
import hashlib

_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
_GENERATORS = (0x98f2bc8e61, 0x79b76d99e2, 0xf33e5fb3c4, 0xae2eabe2a8, 0x1e4f43e470)


def _convertbits(data, frombits, tobits, pad=True):
    acc = bits = 0
    result = []
    for value in data:
        if value < 0 or value >> frombits:
            raise ValueError("invalid input byte")
        acc = (acc << frombits) | value
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            result.append((acc >> bits) & ((1 << tobits) - 1))
    if pad and bits:
        result.append((acc << (tobits - bits)) & ((1 << tobits) - 1))
    elif not pad and (bits >= frombits or ((acc << (tobits - bits)) & ((1 << tobits) - 1))):
        raise ValueError("invalid padding")
    return result


def _polymod(values):
    checksum = 1
    for value in values:
        top = checksum >> 35
        checksum = ((checksum & 0x07ffffffff) << 5) ^ value
        for i, generator in enumerate(_GENERATORS):
            if (top >> i) & 1:
                checksum ^= generator
    return checksum ^ 1


def _prefix_expand(prefix):
    return [ord(c) & 31 for c in prefix] + [0]


def encode_p2pkh_hash160(hash160, *, network="mainnet"):
    """Encode a 20-byte HASH160 as BCH CashAddr P2PKH, without secret keys."""
    if not isinstance(hash160, bytes) or len(hash160) != 20:
        raise ValueError("hash160 must be exactly 20 bytes")
    if network not in ("mainnet", "chipnet"):
        raise ValueError("unsupported BCH network")
    prefix = "bitcoincash" if network == "mainnet" else "bchtest"
    # Version 0: P2PKH, 160-bit payload.
    payload = _convertbits(bytes([0]) + hash160, 8, 5)
    checksum = _polymod(_prefix_expand(prefix) + payload + [0] * 8)
    check = [(checksum >> (5 * (7 - i))) & 31 for i in range(8)]
    return prefix + ":" + "".join(_ALPHABET[v] for v in payload + check)


def compressed_pubkey_to_cashaddr(pubkey, *, network="mainnet"):
    """Encode SEC compressed public key to CashAddr; not proof of ownership.

    Checks encoding only. Full secp256k1 point validation and signing must be
    performed by an independently reviewed BCH-compatible cryptographic library.
    """
    if not isinstance(pubkey, bytes) or len(pubkey) != 33 or pubkey[0] not in (2, 3):
        raise ValueError("expected a 33-byte compressed SEC public key")
    try:
        ripemd = hashlib.new("ripemd160")
    except ValueError as exc:
        raise RuntimeError("RIPEMD160 unavailable in this Python/OpenSSL build") from exc
    ripemd.update(hashlib.sha256(pubkey).digest())
    return encode_p2pkh_hash160(ripemd.digest(), network=network)


def validate_cashaddr_checksum(address, *, network="mainnet"):
    """Verify syntax/checksum for 160-bit P2PKH only; no ownership validation."""
    if not isinstance(address, str) or not address or address.lower() != address:
        return False
    prefix = {"mainnet": "bitcoincash", "chipnet": "bchtest"}.get(network)
    if prefix is None or not address.startswith(prefix + ":"):
        return False
    data = address[len(prefix) + 1:]
    if len(data) != 42 or any(c not in _ALPHABET for c in data):
        return False
    values = [_ALPHABET.index(c) for c in data]
    if _polymod(_prefix_expand(prefix) + values) != 0:
        return False
    try:
        decoded = bytes(_convertbits(values[:-8], 5, 8, pad=False))
    except ValueError:
        return False
    return len(decoded) == 21 and decoded[0] == 0
