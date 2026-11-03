import unittest
from app_bch_flow.directory.aliases import normalize_alias

class AliasTests(unittest.TestCase):
    def test_normalize(self): self.assertEqual(normalize_alias(" @MinhaLoja "), "minhaloja")
    def test_confusable_rejected(self):
        with self.assertRaises(ValueError): normalize_alias("jоao")
