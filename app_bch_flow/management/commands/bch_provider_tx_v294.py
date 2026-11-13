"""Explicit opt-in read-only BCH transaction comparison."""
import json
from django.core.management.base import BaseCommand
from app_bch_flow.blockchain.engine_v25.transaction_validation_v294 import compare_tx

class Command(BaseCommand):
    help = 'Read-only cross-provider BCH transaction comparison; --probe enables network.'
    def add_arguments(self, parser):
        parser.add_argument('--txid', required=True)
        parser.add_argument('--probe', action='store_true')
    def handle(self, *args, **options):
        result = compare_tx(options['txid'], probe=options['probe'])
        self.stdout.write(json.dumps(result, sort_keys=True, indent=2))
        if options['probe'] and result['state'] != 'MATCHING_TRANSACTION':
            self.stderr.write('Transaction evidence incomplete or conflicting; no financial action taken.')
