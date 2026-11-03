"""One-shot scheduler-safe read-only monitor; use external cron/systemd timer."""
import json
import os
from pathlib import Path
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice
from app_bch_flow.blockchain.engine_v25.merchant_monitor_v297 import MAX_INVOICES
from app_bch_flow.blockchain.engine_v25.scheduled_monitor_v298 import observe, read_snapshot, save_snapshot


class Command(BaseCommand):
    help = 'One-shot read-only monitoring; optional local snapshot. Use flock + external scheduler.'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', required=True)
        parser.add_argument('--probe', action='store_true')
        parser.add_argument('--snapshot-file', default=None)

    def handle(self, *args, **options):
        try:
            org_id = str(UUID(options['org_id']))
        except (ValueError, TypeError, AttributeError) as exc:
            raise CommandError('Invalid organization UUID') from exc
        path = None
        if options['snapshot_file']:
            if not options['probe']:
                raise CommandError('--snapshot-file requires --probe')
            path = Path(options['snapshot_file']).expanduser().absolute()
            if path.is_symlink() or not path.parent.is_dir() or path.parent.is_symlink():
                raise CommandError('Snapshot directory must exist and cannot be a symlink')
        qs = BCHInvoice.objects.filter(organization_id=org_id, status='created').order_by('created_at', 'pk')
        invoices = list(qs[:MAX_INVOICES + 1])
        if len(invoices) > MAX_INVOICES:
            raise CommandError('More than 10 open invoices; narrow scope before monitoring')
        try:
            previous = read_snapshot(path, org_id) if path else {}
            current, changes = observe(invoices, probe=options['probe'], previous=previous)
            result = dict(current, organization_id=org_id, changes=changes,
                          snapshot_written=False, probed=bool(options['probe']))
            # Avoid replacing prior valid observation when any invoice failed.
            if path and current['state'] == 'OBSERVATION_COMPLETE_FOR_BOUNDED_BATCH':
                save_snapshot(path, org_id, current)
                result['snapshot_written'] = True
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            raise CommandError('Snapshot or observation failed: ' + type(exc).__name__) from exc
        self.stdout.write(json.dumps(result, sort_keys=True, indent=2))
        self.stderr.write('Read-only observation. Optional local snapshot only; no DB writes, verification or settlement.')
