"""Offline BCH P2PKH SIGHASH_ALL|FORKID transaction signer.

Only for an isolated, trusted client. NEVER send private keys to Django.
Not a wallet, seed manager, or Mainnet approval. No network operations.
Requires cryptography. Inputs MUST be independently verified by the signer.
"""
import hashlib
import struct
from dataclasses import dataclass
from decimal import Decimal

SIGHASH_ALL_FORKID = 0x41
MAX_TX_BYTES = 100000
MAX_INPUTS = 100
MAX_OUTPUTS = 100

class SigningError(ValueError):
    pass

def h256(data):
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()

def varint(n):
    if n < 0 or n > 0xffffffffffffffff:
        raise SigningError('Invalid length')
    if n < 253: return bytes([n])
    if n <= 65535: return b'\xfd' + struct.pack('<H', n)
    if n <= 0xffffffff: return b'\xfe' + struct.pack('<I', n)
    return b'\xff' + struct.pack('<Q', n)

class Reader:
    def __init__(self, data): self.data, self.pos = data, 0
    def take(self, n):
        if n < 0 or self.pos + n > len(self.data): raise SigningError('Truncated transaction')
        b = self.data[self.pos:self.pos+n]; self.pos += n; return b
    def number(self, n): return int.from_bytes(self.take(n), 'little')
    def vi(self):
        x = self.number(1)
        if x < 253: return x
        if x == 253:
            n = self.number(2)
            if n < 253: raise SigningError('Noncanonical varint')
            return n
        if x == 254:
            n = self.number(4)
            if n <= 65535: raise SigningError('Noncanonical varint')
            return n
        n = self.number(8)
        if n <= 0xffffffff: raise SigningError('Noncanonical varint')
        return n

@dataclass(frozen=True)
class TxInput:
    prev_hash: bytes
    index: int
    script: bytes
    sequence: int
    def serialize(self):
        return self.prev_hash + struct.pack('<I', self.index) + varint(len(self.script)) + self.script + struct.pack('<I', self.sequence)

@dataclass(frozen=True)
class TxOutput:
    value: int
    script: bytes
    def serialize(self): return struct.pack('<Q', self.value) + varint(len(self.script)) + self.script

@dataclass(frozen=True)
class Transaction:
    version: int
    inputs: tuple
    outputs: tuple
    locktime: int
    def serialize(self):
        return (struct.pack('<I', self.version) + varint(len(self.inputs)) + b''.join(x.serialize() for x in self.inputs)
                + varint(len(self.outputs)) + b''.join(x.serialize() for x in self.outputs) + struct.pack('<I', self.locktime))

def parse_tx(raw):
    if not isinstance(raw, str) or len(raw) % 2 or len(raw) > MAX_TX_BYTES * 2:
        raise SigningError('Invalid transaction hex')
    try: data = bytes.fromhex(raw)
    except ValueError as e: raise SigningError('Invalid transaction hex') from e
    r = Reader(data)
    version = r.number(4)
    count = r.vi()
    if not 1 <= count <= MAX_INPUTS: raise SigningError('Input count outside limits')
    inputs = []
    for _ in range(count):
        prev = r.take(32); idx = r.number(4)
        length = r.vi()
        if length > 10000: raise SigningError('Oversized input script')
        script = r.take(length)
        seq = r.number(4)
        if script: raise SigningError('Only unsigned transactions accepted')
        inputs.append(TxInput(prev, idx, script, seq))
    if len({(i.prev_hash, i.index) for i in inputs}) != len(inputs):
        raise SigningError('Duplicate inputs')
    nout = r.vi()
    if not 1 <= nout <= MAX_OUTPUTS: raise SigningError('Output count outside limits')
    outputs = []
    for _ in range(nout):
        value = r.number(8)
        length = r.vi()
        if length > 10000: raise SigningError('Oversized output script')
        outputs.append(TxOutput(value, r.take(length)))
    locktime = r.number(4)
    if r.pos != len(data): raise SigningError('Trailing bytes')
    if version not in (1, 2): raise SigningError('Unsupported version')
    return Transaction(version, tuple(inputs), tuple(outputs), locktime)

def p2pkh_script(pubkey_hash):
    if not isinstance(pubkey_hash, bytes) or len(pubkey_hash) != 20:
        raise SigningError('Invalid P2PKH hash')
    return b'\x76\xa9\x14' + pubkey_hash + b'\x88\xac'

def hash160(data):
    return hashlib.new('ripemd160', hashlib.sha256(data).digest()).digest()

def sighash(tx, index, script_code, amount):
    if not 0 <= index < len(tx.inputs) or not 0 < amount <= 2100000000000000:
        raise SigningError('Invalid input index or amount')
    prevouts = h256(b''.join(i.prev_hash + struct.pack('<I', i.index) for i in tx.inputs))
    sequences = h256(b''.join(struct.pack('<I', i.sequence) for i in tx.inputs))
    outputs = h256(b''.join(o.serialize() for o in tx.outputs))
    inp = tx.inputs[index]
    preimage = (struct.pack('<I', tx.version) + prevouts + sequences + inp.prev_hash
                + struct.pack('<I', inp.index) + varint(len(script_code)) + script_code
                + struct.pack('<Q', amount) + struct.pack('<I', inp.sequence) + outputs
                + struct.pack('<I', tx.locktime) + struct.pack('<I', SIGHASH_ALL_FORKID))
    return h256(preimage)

def push(data):
    if len(data) > 75: raise SigningError('Push too long')
    return bytes([len(data)]) + data

def pubkey_for_private_key(key):
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
    if not isinstance(key, bytes) or len(key) != 32: raise SigningError('Invalid private key')
    scalar = int.from_bytes(key, 'big')
    if not 1 <= scalar < 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141:
        raise SigningError('Invalid secp256k1 scalar')
    private = ec.derive_private_key(scalar, ec.SECP256K1())
    return private, private.public_key().public_bytes(Encoding.X962, PublicFormat.CompressedPoint)

def sign_unsigned_p2pkh(*, unsigned_hex, prevouts, private_keys, expected_outputs, max_fee_sats):
    """Sign on trusted OFFLINE client only.

    prevouts: list of {'txid': hex in display order, 'vout': int,
                       'amount_sats': int, 'pubkey_hash': 20-byte hex}.
    private_keys: list of 32-byte bytes, one per input. NEVER serialize/send.
    expected_outputs: list of {'amount_sats': int, 'script_pubkey': hex},
                      exact order. Must be approved from an independent source.
    Returns signed raw transaction hex. Never broadcasts.
    """
    from cryptography.hazmat.primitives.asymmetric import ec, utils
    from cryptography.hazmat.primitives import hashes
    if not isinstance(max_fee_sats, int) or not 0 <= max_fee_sats <= 10000000:
        raise SigningError('Invalid fee limit')
    tx = parse_tx(unsigned_hex)
    if not (len(prevouts) == len(private_keys) == len(tx.inputs)):
        raise SigningError('Input metadata/key count mismatch')
    if not isinstance(expected_outputs, list) or len(expected_outputs) != len(tx.outputs):
        raise SigningError('Expected outputs missing')
    total_in = 0
    for i, (inp, prev, key) in enumerate(zip(tx.inputs, prevouts, private_keys)):
        if (prev.get('txid') != inp.prev_hash[::-1].hex() or prev.get('vout') != inp.index):
            raise SigningError('Prevout mismatch')
        amount = prev.get('amount_sats')
        if not isinstance(amount, int) or not 0 < amount <= 2100000000000000:
            raise SigningError('Invalid prevout amount')
        try: expected_hash = bytes.fromhex(prev['pubkey_hash'])
        except (ValueError, KeyError, TypeError) as e: raise SigningError('Invalid pubkey hash') from e
        _, pub = pubkey_for_private_key(key)
        if hash160(pub) != expected_hash: raise SigningError('Key does not own prevout')
        total_in += amount
    for out, expected in zip(tx.outputs, expected_outputs):
        try: script = bytes.fromhex(expected['script_pubkey'])
        except (ValueError, KeyError, TypeError) as e: raise SigningError('Invalid expected output') from e
        if out.value != expected.get('amount_sats') or out.script != script:
            raise SigningError('Output differs from independently approved payment')
        if not (out.script.startswith(b'\x76\xa9\x14') and len(out.script) == 25 and out.script.endswith(b'\x88\xac')):
            raise SigningError('Only standard P2PKH outputs supported')
    fee = total_in - sum(o.value for o in tx.outputs)
    if not 0 <= fee <= max_fee_sats: raise SigningError('Fee outside authorization')
    signed = []
    order = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
    for idx, (inp, prev, key) in enumerate(zip(tx.inputs, prevouts, private_keys)):
        priv, pub = pubkey_for_private_key(key)
        script = p2pkh_script(hash160(pub))
        digest = sighash(tx, idx, script, prev['amount_sats'])
        der = priv.sign(digest, ec.ECDSA(utils.Prehashed(hashes.SHA256())))
        r, s = utils.decode_dss_signature(der)
        if s > order // 2: s = order - s
        der = utils.encode_dss_signature(r, s)
        script_sig = push(der + bytes([SIGHASH_ALL_FORKID])) + push(pub)
        signed.append(TxInput(inp.prev_hash, inp.index, script_sig, inp.sequence))
    return Transaction(tx.version, tuple(signed), tx.outputs, tx.locktime).serialize().hex()
