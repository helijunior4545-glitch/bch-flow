"""Read-only diagnostic; does not change financial state."""
import json
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice
from app_bch_flow.blockchain.v34_blockbook import BlockbookReadOnlyProvider, NetworkReadError
from app_bch_flow.blockchain.v33_engine import evaluate_invoice

class Command(BaseCommand):
    help = 'Read-only BCH network probe. Requires explicit provider opt-in.'
    def add_arguments(self, parser):
        parser.add_argument('invoice_id')
        parser.add_argument('--min-confirmations', type=int, default=1)
    def handle(self, *args, **options):
        try:
            invoice = BCHInvoice.objects.using('default').get(pk=options['invoice_id'])
        except (BCHInvoice.DoesNotExist, ValueError, TypeError) as exc:
            raise CommandError('Invoice not found') from exc
        try:
            provider = BlockbookReadOnlyProvider(network=invoice.network)
            evidence = provider.outputs_for_address(network=invoice.network, address=invoice.receiving_cashaddr)
            result = evaluate_invoice(invoice_address=invoice.receiving_cashaddr, network=invoice.network,
                required_satoshis=invoice.amount_satoshis, outputs=evidence,
                min_confirmations=options['min_confirmations'], address_exclusive=False)
        except (NetworkReadError, ValueError) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(json.dumps({'invoice_id':str(invoice.pk), 'network':invoice.network,
            'observed_satoshis':result.observed_satoshis,
            'confirmed_satoshis':result.confirmed_satoshis,
            'matched_outputs':result.matched_outputs, 'status':result.status,
            'warning':'UNVERIFIED THIRD-PARTY EVIDENCE; NO SETTLEMENT OR DATABASE WRITES'}, sort_keys=True))
