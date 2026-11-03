"""V5.1-B.2 strict CashAddr tests: no external network or database."""
from django.test import SimpleTestCase
from app_bch_flow.blockchain.v51_cashaddr import normalize_mainnet_cashaddr, CashAddrError
from app_bch_flow.blockchain.v51_live import _outputs, LiveEvidenceError

ADDR = 'bitcoincash:qplrn4mdqrakml5yqels9q432nkdkjkd85u3zsmljn'

class V51CashAddrTests(SimpleTestCase):
    def test_real_prefixless_address(self):
        self.assertEqual(normalize_mainnet_cashaddr(ADDR.split(':')[1]), ADDR)
    def test_real_prefixed_address(self):
        self.assertEqual(normalize_mainnet_cashaddr(ADDR), ADDR)
    def test_uppercase_is_valid(self):
        self.assertEqual(normalize_mainnet_cashaddr(ADDR.upper()), ADDR)
    def test_mixed_case_rejected(self):
        with self.assertRaises(CashAddrError):
            normalize_mainnet_cashaddr('bitcoincash:' + ADDR.split(':')[1].upper())
    def test_wrong_network(self):
        with self.assertRaises(CashAddrError):
            normalize_mainnet_cashaddr('bchtest:' + ADDR.split(':')[1])
    def test_corrupt_checksum(self):
        with self.assertRaises(CashAddrError):
            normalize_mainnet_cashaddr(ADDR[:-1] + ('q' if ADDR[-1] != 'q' else 'p'))
    def test_legacy_rejected(self):
        with self.assertRaises(CashAddrError):
            normalize_mainnet_cashaddr('1LegacyBitcoinAddress')
    def test_blockchair_real_output(self):
        result = _outputs([{'index': 0, 'value': 312523172, 'recipient': ADDR.split(':')[1]}], 'blockchair')
        self.assertEqual(result[0]['addresses'], [ADDR])
        self.assertEqual(result[0]['satoshis'], 312523172)
    def test_blockbook_real_output(self):
        result = _outputs([{'n': 0, 'value': '312523172', 'addresses': [ADDR]}], 'blockbook')
        self.assertEqual(result[0]['addresses'], [ADDR])
    def test_invalid_address_blocks(self):
        with self.assertRaises(LiveEvidenceError):
            _outputs([{'index': 0, 'value': 1, 'recipient': 'q' + 'a' * 41}], 'blockchair')
    def test_duplicate_normalized_address_blocks(self):
        with self.assertRaises(LiveEvidenceError):
            _outputs([{'index': 0, 'value': 1, 'addresses': [ADDR, ADDR.split(':')[1]]}], 'blockchair')
