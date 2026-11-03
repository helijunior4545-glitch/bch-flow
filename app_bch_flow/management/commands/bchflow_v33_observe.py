"""Fail-closed V3.3 observation diagnostic. Never writes financial status."""
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v33_monitor import observe_invoice
from app_bch_flow.blockchain.v33_provider import ProviderUnavailable

class Command(BaseCommand):
    help = 'Read-only BCH observation; fails closed without an audited provider.'
    def add_arguments(self, parser):
        parser.add_argument('invoice_id')
    def handle(self, *args, **options):
        try:
            result = observe_invoice(options['invoice_id'])
        except ProviderUnavailable as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(f'{result.status}: {result.reason}')
