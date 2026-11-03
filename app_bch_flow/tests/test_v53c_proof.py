import unittest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils
from app_bch_flow.wallet.v53b_cashaddr import compressed_pubkey_to_cashaddr
from app_bch_flow.wallet.v53c_proof import new_challenge, challenge_digest, verify_proof

class V53CProofTests(unittest.TestCase):
    def setUp(self):
        # TEST-ONLY ephemeral key; no key generation or storage on production server.
        self.key = ec.generate_private_key(ec.SECP256K1())
        self.pub = self.key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.CompressedPoint)
        self.address = compressed_pubkey_to_cashaddr(self.pub, network='chipnet')
        self.challenge = new_challenge(organization_id='org-1', network='chipnet', address=self.address, now=1000)
        self.sig = self.key.sign(challenge_digest(self.challenge), ec.ECDSA(utils.Prehashed(hashes.SHA256()))).hex()

    def verify(self, **overrides):
        kw=dict(challenge=self.challenge, public_key_hex=self.pub.hex(), signature_der_hex=self.sig,
                expected_organization_id='org-1', expected_network='chipnet', expected_address=self.address, now=1001)
        kw.update(overrides)
        return verify_proof(**kw)

    def test_valid_signature(self): self.assertTrue(self.verify())
    def test_wrong_organization(self): self.assertFalse(self.verify(expected_organization_id='org-2'))
    def test_wrong_network(self): self.assertFalse(self.verify(expected_network='mainnet'))
    def test_wrong_address(self): self.assertFalse(self.verify(expected_address='bchtest:invalid'))
    def test_expired(self): self.assertFalse(self.verify(now=1301))
    def test_future(self): self.assertFalse(self.verify(now=900))
    def test_bad_signature(self): self.assertFalse(self.verify(signature_der_hex='00'))
    def test_other_public_key(self):
        other=ec.generate_private_key(ec.SECP256K1()).public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.CompressedPoint)
        self.assertFalse(self.verify(public_key_hex=other.hex()))
    def test_modified_challenge(self): self.assertFalse(self.verify(challenge=self.challenge.replace('org-1','org-2')))
    def test_malformed_hex(self): self.assertFalse(self.verify(public_key_hex='nothex'))

if __name__ == '__main__': unittest.main()
