"""Explicit provider health check; does not query wallet addresses or write DB."""
import json
from django.core.management.base import BaseCommand
from app_bch_flow.blockchain.engine_v25.health_v29 import diagnose


class Command(BaseCommand):
    help = 'BCH Flow V2.9 provider health; --probe explicitly permits /api requests.'

    def add_arguments(self, parser):
        parser.add_argument('--probe', action='store_true', help='Make HTTPS GET /api requests to both configured providers')

    def handle(self, *args, **options):
        result = diagnose(probe=options['probe'])
        self.stdout.write(json.dumps(result, sort_keys=True, indent=2))
        if options['probe'] and result['overall'] != 'HEALTHY':
            self.stderr.write('BCH provider health is not HEALTHY; no payment or settlement action taken.')
