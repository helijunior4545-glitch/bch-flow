import unittest
from app_bch_flow.wallet.selfcustody.offline_bch_signer import (
    Transaction, TxInput, TxOutput, parse_tx, sign_unsigned_p2pkh, hash160,
    pubkey_for_private_key, p2pkh_script, SigningError, sighash, Reader,
)
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives import hashes

class OfflineSignerTests(unittest.TestCase):
    def setUp(self):
        self.key = (1).to_bytes(32, 'big')  # PUBLIC TEST VECTOR ONLY
        _, self.pub = pubkey_for_private_key(self.key)
        self.hash = hash160(self.pub)
        self.txid = '11'*32
        self.output = TxOutput(9000, p2pkh_script(self.hash))
        self.tx = Transaction(2, (TxInput(bytes.fromhex(self.txid)[::-1], 0, b'', 0xffffffff),), (self.output,), 0)
        self.kw = dict(unsigned_hex=self.tx.serialize().hex(),
                       prevouts=[dict(txid=self.txid, vout=0, amount_sats=10000, pubkey_hash=self.hash.hex())],
                       private_keys=[self.key],
                       expected_outputs=[dict(amount_sats=9000, script_pubkey=self.output.script.hex())],
                       max_fee_sats=1000)
    def test_sign_and_verify_cryptographically(self):
        signed = bytes.fromhex(sign_unsigned_p2pkh(**self.kw))
        r = Reader(signed)
        self.assertEqual(r.number(4), 2)
        self.assertEqual(r.vi(), 1)
        r.take(36)
        length = r.vi(); script = r.take(length)
        signature_length = script[0]
        signature = script[1:1+signature_length]
        self.assertEqual(signature[-1], 0x41)
        digest = sighash(self.tx, 0, p2pkh_script(self.hash), 10000)
        pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256K1(), self.pub)
        pub.verify(signature[:-1], digest, ec.ECDSA(utils.Prehashed(hashes.SHA256())))
    def test_wrong_key_rejected(self):
        self.kw['private_keys'] = [(2).to_bytes(32,'big')]
        with self.assertRaises(SigningError): sign_unsigned_p2pkh(**self.kw)
    def test_output_tamper_rejected(self):
        self.kw['expected_outputs'][0]['amount_sats'] = 8999
        with self.assertRaises(SigningError): sign_unsigned_p2pkh(**self.kw)
    def test_fee_limit_rejected(self):
        self.kw['max_fee_sats'] = 999
        with self.assertRaises(SigningError): sign_unsigned_p2pkh(**self.kw)
    def test_nonempty_input_script_rejected(self):
        signed = sign_unsigned_p2pkh(**self.kw)
        with self.assertRaises(SigningError): parse_tx(signed)
    def test_duplicate_input_rejected(self):
        tx = Transaction(2, (self.tx.inputs[0], self.tx.inputs[0]), self.tx.outputs, 0)
        with self.assertRaises(SigningError): parse_tx(tx.serialize().hex())
