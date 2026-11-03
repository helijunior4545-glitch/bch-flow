"""Explicit read-only live BCH diagnostic. No invoice or database writes."""
import json
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v38_live_diagnostics import diagnose, DiagnosticError

class Command(BaseCommand):
    help = 'Read-only live BCH mainnet diagnostics; requires both provider opt-in settings.'

    def add_arguments(self, parser):
        parser.add_argument('cashaddr', help='Real BCH mainnet CashAddr (not a private key)')
        parser.add_argument('--min-confirmations', type=int, default=2)

    def handle(self, *args, **options):
        try:
            result = diagnose(address=options['cashaddr'],
                              min_confirmations=options['min_confirmations'])
        except DiagnosticError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(json.dumps(result.as_dict(), sort_keys=True))
        self.stdout.write(self.style.WARNING('EXTERNAL CORROBORATION ONLY; NOT CONSENSUS OR PAYMENT SETTLEMENT.'))
