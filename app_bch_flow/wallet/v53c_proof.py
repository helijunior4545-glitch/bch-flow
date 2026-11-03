"""BCH Flow V5.3-C: public-key ownership challenge verification only.

This is a BCH Flow application-level proof, NOT a BCH signed message or
transaction signature. Only a trusted client should hold the private key.
"""
import hashlib
import json
import secrets
import time
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.serialization import load_der_public_key
from app_bch_flow.wallet.v53b_cashaddr import compressed_pubkey_to_cashaddr

DOMAIN = b"BCH-FLOW-WALLET-OWNERSHIP-V53C\x00"
MAX_AGE_SECONDS = 300


def new_challenge(*, organization_id, network, address, now=None):
    """Issue an unsigned JSON challenge; persist digest and expiry server-side.

    Caller MUST bind the digest to authenticated identity, organization,
    network, address, expiry and single-use state in persistent storage.
    """
    if network not in ('mainnet', 'chipnet'):
        raise ValueError('invalid network')
    if not isinstance(organization_id, str) or not organization_id:
        raise ValueError('organization required')
    if not isinstance(address, str) or not address:
        raise ValueError('address required')
    timestamp = int(time.time() if now is None else now)
    body = {'domain': 'BCH-FLOW-WALLET-OWNERSHIP-V53C',
            'organization_id': organization_id, 'network': network,
            'address': address, 'nonce': secrets.token_hex(32),
            'issued_at': timestamp, 'expires_at': timestamp + MAX_AGE_SECONDS}
    return json.dumps(body, sort_keys=True, separators=(',', ':'))


def challenge_digest(challenge):
    if not isinstance(challenge, str):
        raise ValueError('invalid challenge')
    return hashlib.sha256(DOMAIN + challenge.encode('utf-8')).digest()


def verify_proof(*, challenge, public_key_hex, signature_der_hex,
                 expected_organization_id, expected_network, expected_address,
                 now=None):
    """Verify ECDSA/secp256k1 SHA256 signature and claimed BCH P2PKH address.

    Returns False on any invalid proof. This is NOT sufficient to activate
    receive: the DB challenge must also be unexpired, bound and consumed
    atomically under a lock, with authentication and authorization checks.
    """
    try:
        body = json.loads(challenge)
        if not isinstance(body, dict) or set(body) != {
            'domain', 'organization_id', 'network', 'address', 'nonce',
            'issued_at', 'expires_at'}:
            return False
        if body['domain'] != 'BCH-FLOW-WALLET-OWNERSHIP-V53C':
            return False
        if body['organization_id'] != expected_organization_id or body['network'] != expected_network or body['address'] != expected_address:
            return False
        if type(body['issued_at']) is not int or type(body['expires_at']) is not int:
            return False
        current = int(time.time() if now is None else now)
        if body['issued_at'] > current + 30 or body['expires_at'] < current or body['expires_at'] - body['issued_at'] != MAX_AGE_SECONDS:
            return False
        if not isinstance(body['nonce'], str) or len(body['nonce']) != 64:
            return False
        bytes.fromhex(body['nonce'])
        pub = bytes.fromhex(public_key_hex)
        if len(pub) != 33 or pub[0] not in (2, 3):
            return False
        if compressed_pubkey_to_cashaddr(pub, network=expected_network) != expected_address:
            return False
        key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256K1(), pub)
        signature = bytes.fromhex(signature_der_hex)
        if len(signature) > 72:
            return False
        # Reject malformed/noncanonical DER and out-of-range scalars via library.
        r, s = utils.decode_dss_signature(signature)
        if r <= 0 or s <= 0 or utils.encode_dss_signature(r, s) != signature:
            return False
        key.verify(signature, challenge_digest(challenge), ec.ECDSA(utils.Prehashed(hashes.SHA256())))
        return True
    except (ValueError, TypeError, KeyError, OverflowError, InvalidSignature):
        return False
