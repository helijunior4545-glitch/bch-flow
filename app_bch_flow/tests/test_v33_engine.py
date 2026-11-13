from django.test import SimpleTestCase
from app_bch_flow.blockchain.v33_engine import OutputEvidence, EvidenceError, evaluate_invoice
from app_bch_flow.blockchain.v33_provider import DisabledProvider, ProviderUnavailable, FixtureProvider

ADDR = 'bitcoincash:qqexample'
TX = 'a' * 64
BLOCK = 'b' * 64

def output(**kwargs):
    data = dict(txid=TX, vout=0, address=ADDR, satoshis=1200, network='mainnet', confirmations=2, block_hash=BLOCK)
    data.update(kwargs)
    return OutputEvidence(**data)

class EngineTests(SimpleTestCase):
    def review(self, outputs, **kwargs):
        return evaluate_invoice(invoice_address=ADDR, network='mainnet', required_satoshis=1000,
                                outputs=outputs, address_exclusive=True, **kwargs)
    def test_valid_confirmed_requires_independent_review(self):
        self.assertEqual(self.review([output()]).status, 'eligible_for_review')
    def test_insufficient_amount(self):
        self.assertEqual(self.review([output(satoshis=500)]).status, 'partial')
    def test_unconfirmed(self):
        self.assertEqual(self.review([output(confirmations=0, block_hash='')]).status, 'confirming')
    def test_wrong_address(self):
        self.assertEqual(self.review([output(address='bitcoincash:qqother')]).status, 'not_seen')
    def test_wrong_network(self):
        self.assertEqual(self.review([output(network='chipnet')]).status, 'not_seen')
    def test_duplicate_output_rejected(self):
        with self.assertRaises(EvidenceError): self.review([output(), output()])
    def test_bad_txid_rejected(self):
        with self.assertRaises(EvidenceError): output(txid='bad')
    def test_confirmed_without_block_hash_rejected(self):
        with self.assertRaises(EvidenceError): output(block_hash='')
    def test_reorg_to_unconfirmed(self):
        self.assertEqual(self.review([output(confirmations=0, block_hash='')]).status, 'confirming')
    def test_shared_address_never_attributed(self):
        result = evaluate_invoice(invoice_address=ADDR, network='mainnet', required_satoshis=1000,
                                  outputs=[output()], address_exclusive=False)
        self.assertEqual(result.status, 'unattributed')
    def test_provider_disabled(self):
        with self.assertRaises(ProviderUnavailable): DisabledProvider().outputs_for_address(network='mainnet', address=ADDR)
    def test_fixture_provider_filter(self):
        provider = FixtureProvider([output(), output(vout=1, network='chipnet')])
        self.assertEqual(len(provider.outputs_for_address(network='mainnet', address=ADDR)), 1)
    def test_policy_invalid(self):
        with self.assertRaises(EvidenceError): self.review([output()], min_confirmations=0)
