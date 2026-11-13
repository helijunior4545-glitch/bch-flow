import fcntl
import json
import tempfile
import time
from pathlib import Path
from unittest import TestCase

from app_bch_flow.blockchain.engine_v25.monitor_operations_v299 import (
    audit_event, exclusive_lock, make_event, safe_file,
)


class OperationsV299Tests(TestCase):
    def test_lock_is_exclusive(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'lock'
            with exclusive_lock(path) as first:
                self.assertTrue(first)
                with exclusive_lock(path) as second:
                    self.assertFalse(second)
            with exclusive_lock(path) as third:
                self.assertTrue(third)

    def test_audit_whitelist(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'audit.jsonl'
            audit_event(path, {'outcome': 'COMPLETED', 'secret': 'DO_NOT_STORE'})
            content = path.read_text()
            self.assertNotIn('DO_NOT_STORE', content)
            self.assertEqual(json.loads(content)['outcome'], 'COMPLETED')
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_audit_append(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'audit.jsonl'
            audit_event(path, {'outcome': 'COMPLETED'})
            audit_event(path, {'outcome': 'FAILED'})
            self.assertEqual(len(path.read_text().splitlines()), 2)

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            target = Path(d) / 'real'
            target.write_text('')
            link = Path(d) / 'link'
            link.symlink_to(target)
            with self.assertRaises(ValueError):
                safe_file(link, create=True)

    def test_directory_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                safe_file(Path(d), create=True)

    def test_missing_parent_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                safe_file(Path(d) / 'missing' / 'file', create=True)

    def test_event_fields(self):
        event = make_event('org', 'COMPLETED', time.monotonic(), invoice_count=1)
        self.assertEqual(event['invoice_count'], 1)
        self.assertGreaterEqual(event['duration_ms'], 0)
