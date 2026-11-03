"""Explicit, read-only BCH invoice discovery; no scheduled scans or writes."""
import json
from uuid import UUID
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice
from app_bch_flow.blockchain.engine_v25.invoice_discovery_v296 import discover

class Command(BaseCommand):
    help = 'Bounded invoice address discovery (read-only; never verifies payment).'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', required=True)
        parser.add_argument('--invoice-id', required=True)
        parser.add_argument('--probe', action='store_true')

    def handle(self, *args, **options):
        try:
            org_id = UUID(options['org_id'])
            invoice_id = UUID(options['invoice_id'])
        except (ValueError, TypeError, AttributeError):
            raise CommandError('Invalid organization or invoice UUID') from None
        invoice = BCHInvoice.objects.filter(pk=invoice_id, organization_id=org_id).first()
        if invoice is None:
            raise CommandError('Invoice not found for organization')
        report = discover(invoice, probe=options['probe'])
        report['organization_id'] = str(org_id)
        self.stdout.write(json.dumps(report, indent=2, sort_keys=True))
        if options['probe']:
            self.stderr.write('Read-only candidates only; no payment verification, settlement, or database changes.')
