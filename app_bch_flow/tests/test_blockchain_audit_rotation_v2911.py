import tempfile
from pathlib import Path
from unittest import TestCase
from app_bch_flow.blockchain.engine_v25.audit_rotation_v2911 import rotate

class RotationV2911Tests(TestCase):
    def test_missing(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            self.assertEqual(rotate(p/'audit.jsonl',p/'lock',1024,2)['outcome'],'SKIPPED_NO_AUDIT')
    def test_small(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'audit.jsonl').write_text('{}\n')
            self.assertEqual(rotate(p/'audit.jsonl',p/'lock',1024,2)['outcome'],'SKIPPED_BELOW_THRESHOLD')
    def test_rotate(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d); data=b'{}\n'*400;(p/'audit.jsonl').write_bytes(data)
            self.assertEqual(rotate(p/'audit.jsonl',p/'lock',1024,2)['outcome'],'ROTATED')
            self.assertEqual((p/'audit.jsonl').read_bytes(),b'')
            self.assertEqual(len(list(p.glob('audit.jsonl.*'))),1)
            self.assertEqual(next(p.glob('audit.jsonl.*')).read_bytes(),data)
    def test_symlink(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d); (p/'real').write_text('{}\n'*400);(p/'audit.jsonl').symlink_to(p/'real')
            with self.assertRaises(ValueError):rotate(p/'audit.jsonl',p/'lock',1024,2)
    def test_incomplete(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'audit.jsonl').write_bytes(b'x'*1200)
            self.assertEqual(rotate(p/'audit.jsonl',p/'lock',1024,2)['outcome'],'SKIPPED_INCOMPLETE_LINE')
