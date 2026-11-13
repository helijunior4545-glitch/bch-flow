"""Explicit read-only single Blockbook provider health check."""
import json
from django.core.management.base import BaseCommand
from app_bch_flow.blockchain.engine_v25.single_health_v291 import diagnose_one


class Command(BaseCommand):
    help = 'Check one configured BCH Blockbook provider; --probe explicitly permits GET /api.'

    def add_arguments(self, parser):
        parser.add_argument('--provider', choices=('A', 'B'), default='A')
        parser.add_argument('--probe', action='store_true')

    def handle(self, *args, **options):
        result = diagnose_one(options['provider'], probe=options['probe'])
        self.stdout.write(json.dumps(result, indent=2, sort_keys=True))
        if options['probe'] and result['state'] != 'HEALTHY':
            self.stderr.write('Provider is not HEALTHY; no financial action taken.')
