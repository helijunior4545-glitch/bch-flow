"""Read-only explicit TXID candidate observation. No financial state mutation."""
import json
from dataclasses import asdict
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v40_payment_observer import observe_invoice_txid, ObservationError
from app_bch_flow.blockchain.v34_blockbook import NetworkReadError

class Command(BaseCommand):
    help = 'V4.0 observe an explicit invoice/TXID pair; READ ONLY; never settlement'

    def add_arguments(self, parser):
        parser.add_argument('invoice_id')
        parser.add_argument('txid')
        parser.add_argument('--min-confirmations', type=int, default=2)

    def handle(self, *args, **options):
        try:
            result = observe_invoice_txid(options['invoice_id'], options['txid'],
                min_confirmations=options['min_confirmations'])
        except (ObservationError, NetworkReadError, ValueError) as exc:
            raise CommandError('V4.0 observation aborted: ' + str(exc)) from exc
        self.stdout.write(json.dumps(asdict(result), sort_keys=True))
        self.stdout.write('READ ONLY: candidate evidence, NOT attribution, consensus verification or settlement.')
