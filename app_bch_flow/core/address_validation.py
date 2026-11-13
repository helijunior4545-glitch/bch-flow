"""Validate Bitcoin Cash CashAddr encoding and network. No key material handled."""
from django.core.exceptions import ValidationError

_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
_GENERATORS = (0x98f2bc8e61, 0x79b76d99e2, 0xf33e5fb3c4, 0xae2eabe2a8, 0x1e4f43e470)

def _polymod(values):
    c = 1
    for value in values:
        top = c >> 35
        c = ((c & 0x07ffffffff) << 5) ^ value
        for i, generator in enumerate(_GENERATORS):
            if (top >> i) & 1:
                c ^= generator
    return c ^ 1

def validate_cashaddr(address, network='mainnet'):
    if network not in ('mainnet','chipnet'):
        raise ValidationError('Unsupported BCH network')
    if not isinstance(address, str) or not address or address.lower() != address and address.upper() != address:
        raise ValidationError('CashAddr must use consistent case')
    value = address.lower()
    if value.count(':') != 1:
        raise ValidationError('Explicit CashAddr network prefix required')
    prefix, payload = value.split(':', 1)
    expected = 'bitcoincash' if network == 'mainnet' else 'bchtest'
    if prefix != expected or len(payload) < 8:
        raise ValidationError('CashAddr network mismatch or invalid length')
    if any(ch not in _ALPHABET for ch in payload):
        raise ValidationError('Invalid CashAddr alphabet')
    numbers = [_ALPHABET.index(ch) for ch in payload]
    if _polymod([ord(ch) & 31 for ch in prefix] + [0] + numbers) != 0:
        raise ValidationError('CashAddr checksum mismatch')
    # CashAddr payload has version byte + hash, and 8 checksum characters.
    if len(payload) not in (42, 54, 74, 122):
        raise ValidationError('Unsupported CashAddr payload size')
    return value
