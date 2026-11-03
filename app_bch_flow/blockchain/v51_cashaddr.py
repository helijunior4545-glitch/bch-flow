"""Strict Bitcoin Cash mainnet CashAddr validator (no legacy address guessing)."""

ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
GENERATORS = (0x98F2BC8E61, 0x79B76D99E2, 0xF33E5FB3C4, 0xAE2EABE2A8, 0x1E4F43E470)
SIZES = (20, 24, 28, 32, 40, 48, 56, 64)

class CashAddrError(ValueError):
    pass

def _polymod(values):
    chk = 1
    for value in values:
        top = chk >> 35
        chk = ((chk & 0x07FFFFFFFF) << 5) ^ value
        for i, generator in enumerate(GENERATORS):
            if (top >> i) & 1:
                chk ^= generator
    return chk ^ 1

def normalize_mainnet_cashaddr(address):
    if not isinstance(address, str) or not address or len(address) > 120:
        raise CashAddrError('invalid_address')
    if address != address.lower() and address != address.upper():
        raise CashAddrError('mixed_case')
    address = address.lower()
    if address.count(':') > 1:
        raise CashAddrError('invalid_prefix')
    if ':' in address:
        prefix, payload = address.split(':', 1)
        if prefix != 'bitcoincash':
            raise CashAddrError('wrong_network')
    else:
        prefix, payload = 'bitcoincash', address
    if len(payload) < 10 or any(char not in ALPHABET for char in payload):
        raise CashAddrError('invalid_payload')
    values = [ALPHABET.index(char) for char in payload]
    if _polymod([ord(c) & 31 for c in prefix] + [0] + values) != 0:
        raise CashAddrError('invalid_checksum')
    # Convert 5-bit payload groups (excluding 8 checksum symbols) into bytes.
    data = values[:-8]
    acc = bits = 0
    decoded = bytearray()
    for value in data:
        acc = (acc << 5) | value
        bits += 5
        while bits >= 8:
            bits -= 8
            decoded.append((acc >> bits) & 255)
    if bits >= 5 or ((acc << (8 - bits)) & 255):
        raise CashAddrError('invalid_padding')
    if not decoded:
        raise CashAddrError('missing_version')
    version = decoded[0]
    if version & 0x80:
        raise CashAddrError('reserved_version_bit')
    kind = (version >> 3) & 0x0f
    if kind not in (0, 1):
        raise CashAddrError('unsupported_address_type')
    expected_size = SIZES[version & 7]
    if len(decoded) - 1 != expected_size:
        raise CashAddrError('invalid_hash_length')
    return 'bitcoincash:' + payload
