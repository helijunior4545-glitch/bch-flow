"""Read-only two-provider comparison. No database writes or settlement."""
import uuid
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice
from app_bch_flow.blockchain.v37_quorum import probe_two_providers, QuorumError

class Command(BaseCommand):
    help = 'Compare two BCH Blockbook providers without settlement or DB writes.'
    def add_arguments(self, parser):
        parser.add_argument('invoice_id', type=uuid.UUID)
        parser.add_argument('--min-confirmations', type=int, default=1)
    def handle(self, *args, **opts):
        try:
            invoice = BCHInvoice.objects.using('default').get(pk=opts['invoice_id'])
            report = probe_two_providers(network=invoice.network, address=invoice.receiving_cashaddr,
                                         min_confirmations=opts['min_confirmations'])
        except BCHInvoice.DoesNotExist as exc:
            raise CommandError('Invoice not found') from exc
        except (QuorumError, ValueError) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write('status=%s outputs=%d primary=%d secondary=%d' % (
            report.status, len(report.outputs), report.first_count, report.second_count))
        self.stdout.write(report.reason)
        self.stdout.write(self.style.WARNING('NOT consensus verification. NO payment settlement or DB writes.'))
