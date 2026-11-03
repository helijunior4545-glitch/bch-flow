"""Offline static contract tests; no systemd invocation."""
from pathlib import Path
from unittest import TestCase

BASE = Path(__file__).resolve().parents[1] / 'deploy' / 'systemd'

class SystemdV2910Tests(TestCase):
    def test_service_watch_only(self):
        content = (BASE / 'bchflow-finance-monitor.service').read_text()
        self.assertIn('bch_merchant_monitor_v299', content)
        self.assertIn('--probe', content)
        self.assertIn('EnvironmentFile=%h/.config/bch-flow/provider.env', content)
        self.assertIn('Type=oneshot', content)
        self.assertIn('TimeoutStartSec=180', content)
        self.assertNotIn('sudo ', content)
        self.assertNotIn('ExecStartPre=', content)
    def test_timer_not_overlapping(self):
        content = (BASE / 'bchflow-finance-monitor.timer').read_text()
        self.assertIn('OnCalendar=*:0/5', content)
        self.assertIn('Unit=bchflow-finance-monitor.service', content)
        self.assertIn('Persistent=false', content)
