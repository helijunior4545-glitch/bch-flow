"""Opt-in, read-only V5.1-B live comparison of BCH mainnet evidence."""
import json
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v51_live import assess

class Command(BaseCommand):
    help = 'Compare NOWNodes and Blockchair BCH mainnet evidence; never settle.'

    def add_arguments(self, parser):
        parser.add_argument('txid')

    def handle(self, *args, **options):
        result = assess(options['txid'])
        self.stdout.write(json.dumps(result, indent=2, sort_keys=True))
