# Static contract checks for V5.3-D1, no DB required.
import unittest
from pathlib import Path


class V53DContractTests(unittest.TestCase):
    def test_api_is_fail_closed(self):
        content = (Path(__file__).resolve().parents[1] / 'views' /
                   'v53d_challenge.py').read_text(encoding='utf-8')
        self.assertIn("network != 'chipnet'", content)
        self.assertIn('select_for_update()', content)
        self.assertIn("record.consumed_at is not None", content)
        self.assertIn("'wallet_connected': False", content)
        self.assertIn("'settlement_enabled': False", content)

    def test_no_private_key_handling(self):
        content = (Path(__file__).resolve().parents[1] / 'views' /
                   'v53d_challenge.py').read_text(encoding='utf-8')
        self.assertNotIn('private_key =', content)
        self.assertNotIn('mnemonic =', content)
