"""Read-only NOWNodes BCH status and optional address evidence diagnostic."""
import json
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v34_blockbook import NetworkReadError
from app_bch_flow.blockchain.v39_nownodes import NOWNodesBCHProvider

class Command(BaseCommand):
    help = 'V3.9: read-only authenticated NOWNodes BCH mainnet diagnostic; no settlement.'

    def add_arguments(self, parser):
        parser.add_argument('--address', default=None, help='Optional public BCH CashAddr')
        parser.add_argument('--max-pages', type=int, default=3)
        parser.add_argument('--page-size', type=int, default=50)

    def handle(self, *args, **opts):
        try:
            provider = NOWNodesBCHProvider(network='mainnet', max_pages=opts['max_pages'], page_size=opts['page_size'])
            status = provider.status()
            if opts['address']:
                outputs = provider.outputs_for_address(network='mainnet', address=opts['address'])
                status['evidence_output_count'] = len(outputs)
                status['evidence_status'] = 'external_unverified'
            self.stdout.write(json.dumps(status, sort_keys=True))
            self.stdout.write(self.style.WARNING('READ ONLY: external provider data, NOT payment settlement or consensus verification.'))
        except NetworkReadError as exc:
            raise CommandError('V3.9 diagnostic failed: ' + str(exc)) from exc
