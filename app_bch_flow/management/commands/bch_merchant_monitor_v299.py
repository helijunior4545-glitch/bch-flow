"""One-shot read-only operational command, intended for external scheduling."""
import io
import json
import time
from pathlib import Path
from uuid import UUID

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from app_bch_flow.blockchain.engine_v25.monitor_operations_v299 import (
    audit_event, exclusive_lock, make_event,
)


class Command(BaseCommand):
    help = 'Run V298 with per-organization nonblocking lock and optional sanitized JSONL audit.'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', required=True)
        parser.add_argument('--probe', action='store_true')
        parser.add_argument('--snapshot-file')
        parser.add_argument('--lock-dir', required=True)
        parser.add_argument('--audit-file')

    def handle(self, *args, **options):
        try:
            org_id = str(UUID(options['org_id']))
        except (TypeError, ValueError, AttributeError) as exc:
            raise CommandError('Invalid organization UUID') from exc
        if not options['probe']:
            raise CommandError('V299 requires --probe for explicit network access')
        lock_dir = Path(options['lock_dir']).expanduser().absolute()
        if not lock_dir.is_dir() or lock_dir.is_symlink():
            raise CommandError('Lock directory must exist and cannot be a symlink')
        lock_file = lock_dir / ('bchflow-v299-' + org_id + '.lock')
        started = time.monotonic()
        try:
            with exclusive_lock(lock_file) as acquired:
                if not acquired:
                    event = make_event(org_id, 'SKIPPED_ALREADY_RUNNING', started)
                    audit_event(options['audit_file'], event)
                    self.stdout.write(json.dumps(event, sort_keys=True))
                    return
                output = io.StringIO()
                try:
                    call_command('bch_merchant_monitor_v298', org_id=org_id,
                                 probe=True, snapshot_file=options['snapshot_file'],
                                 stdout=output, stderr=io.StringIO())
                    result = json.loads(output.getvalue())
                    event = make_event(org_id, 'COMPLETED', started,
                                       invoice_count=result.get('invoice_count', 0),
                                       change_count=len(result.get('changes', [])),
                                       snapshot_written=bool(result.get('snapshot_written')),
                                       monitor_state=result.get('state', 'UNKNOWN'))
                except Exception as exc:
                    event = make_event(org_id, 'FAILED', started, error_type=type(exc).__name__)
                    audit_event(options['audit_file'], event)
                    self.stdout.write(json.dumps(event, sort_keys=True))
                    raise CommandError('Monitoring failed: ' + type(exc).__name__) from None
                audit_event(options['audit_file'], event)
                self.stdout.write(json.dumps(event, sort_keys=True))
        except (OSError, ValueError) as exc:
            raise CommandError('Operational file error: ' + type(exc).__name__) from None
