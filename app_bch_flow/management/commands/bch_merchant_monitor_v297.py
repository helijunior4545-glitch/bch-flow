"""Manual bounded read-only monitoring. No scheduler, database writes, or settlement."""
import json
from uuid import UUID
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice
from app_bch_flow.blockchain.engine_v25.merchant_monitor_v297 import monitor, MAX_INVOICES

class Command(BaseCommand):
    help = 'Manually inspect up to 10 created BCH invoices for one organization (read-only).'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', required=True)
        parser.add_argument('--probe', action='store_true')

    def handle(self, *args, **options):
        try:
            org_id = UUID(options['org_id'])
        except (ValueError, TypeError, AttributeError):
            raise CommandError('Invalid organization UUID') from None
        qs = BCHInvoice.objects.filter(organization_id=org_id, status='created').order_by('created_at', 'pk')
        invoices = list(qs[:MAX_INVOICES + 1])
        if len(invoices) > MAX_INVOICES:
            raise CommandError('More than 10 open invoices; narrow scope before probing')
        report = monitor(invoices, probe=options['probe'])
        report['organization_id'] = str(org_id)
        self.stdout.write(json.dumps(report, indent=2, sort_keys=True))
        self.stderr.write('Manual read-only observation; no payment verification, scheduler, settlement, or database changes.')
