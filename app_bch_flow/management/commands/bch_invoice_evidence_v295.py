"""Read-only manual merchant invoice evidence command; no database mutations."""
import json
from uuid import UUID
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice
from app_bch_flow.blockchain.engine_v25.invoice_evidence_v295 import evaluate

class Command(BaseCommand):
    help = 'Read-only invoice/transaction observation; never verifies payment or settlement.'

    def add_arguments(self, parser):
        parser.add_argument('--org-id', required=True)
        parser.add_argument('--invoice-id', required=True)
        parser.add_argument('--txid', required=True)
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
        report = evaluate(invoice, options['txid'], probe=options['probe'])
        report['invoice_id'] = str(invoice.id)
        report['organization_id'] = str(org_id)
        self.stdout.write(json.dumps(report, sort_keys=True, indent=2))
        if report['state'] not in ('ADDRESS_OUTPUT_OBSERVED', 'NOT_TESTED'):
            self.stderr.write('Evidence incomplete or no address output; no financial action taken.')
