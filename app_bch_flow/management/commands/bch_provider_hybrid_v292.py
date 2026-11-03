"""Manual hybrid BCH Mainnet diagnostics; no address or payment queries."""
import json
from django.core.management.base import BaseCommand
from app_bch_flow.blockchain.engine_v25.hybrid_health_v292 import diagnose_hybrid


class Command(BaseCommand):
    help = 'Hybrid BCH provider health; --probe explicitly enables read-only network calls.'

    def add_arguments(self, parser):
        parser.add_argument('--probe', action='store_true')

    def handle(self, *args, **options):
        result = diagnose_hybrid(probe=options['probe'])
        self.stdout.write(json.dumps(result, indent=2, sort_keys=True))
        if options['probe'] and result['state'] != 'HEALTHY_DIAGNOSTICS_ONLY':
            self.stderr.write('Hybrid provider health incomplete; no financial action taken.')
