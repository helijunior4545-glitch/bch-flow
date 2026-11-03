"""Explicit manual cross-provider comparison; no financial state changes."""
import json
from django.core.management.base import BaseCommand
from app_bch_flow.blockchain.engine_v25.cross_validation_v293 import compare


class Command(BaseCommand):
    help = 'Read-only BCH Mainnet common-height block hash comparison; --probe enables network.'

    def add_arguments(self, parser):
        parser.add_argument('--probe', action='store_true')

    def handle(self, *args, **options):
        result = compare(probe=options['probe'])
        self.stdout.write(json.dumps(result, sort_keys=True, indent=2))
        if options['probe'] and result['state'] != 'MATCHING_BLOCK':
            self.stderr.write('Cross-provider validation incomplete or divergent; no financial action taken.')
