"""Explicit read-only provider probe with optional evidence-only PostgreSQL journal."""
import os
import uuid
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice
from app_bch_flow.blockchain.v34_blockbook import BlockbookReadOnlyProvider
from app_bch_flow.blockchain.v35_reconciliation import record_observation

class Command(BaseCommand):
    help = 'V3.5: probe BCH evidence; optionally journal UNVERIFIED observations. Never settle.'

    def add_arguments(self, parser):
        parser.add_argument('invoice_id', type=uuid.UUID)
        parser.add_argument('--min-confirmations', type=int, default=1)
        parser.add_argument('--write-observation', action='store_true')

    def handle(self, *args, **options):
        if options['write_observation'] and os.getenv('BCHFLOW_V35_ALLOW_JOURNAL') != '1':
            raise CommandError('Journal disabled; explicitly set BCHFLOW_V35_ALLOW_JOURNAL=1')
        invoice = BCHInvoice.objects.using('default').filter(pk=options['invoice_id']).first()
        if invoice is None:
            raise CommandError('Invoice not found')
        if invoice.network != 'mainnet':
            raise CommandError('V3.4 provider supports mainnet only')
        try:
            provider = BlockbookReadOnlyProvider(network=invoice.network)
            outputs = provider.outputs_for_address(network=invoice.network,
                                                   address=invoice.receiving_cashaddr)
            result = record_observation(invoice.pk, outputs=outputs,
                                        min_confirmations=options['min_confirmations'],
                                        write=options['write_observation'])
        except Exception as exc:
            raise CommandError('Reconciliation aborted: ' + str(exc)) from exc
        self.stdout.write('status=%s observed=%s confirmed=%s exclusive=%s' % (
            result.status, result.observed_satoshis, result.confirmed_satoshis, result.exclusive))
        self.stdout.write('evidence_digest=' + result.evidence_digest)
        self.stdout.write('journal_event_id=%s created=%s' % (result.event_id or '(dry-run)', result.created))
        self.stdout.write(self.style.WARNING('UNVERIFIED provider evidence; NO settlement or status update'))
