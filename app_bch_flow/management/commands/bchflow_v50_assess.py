"""Read-only CLI for a real transaction against an existing BCH invoice."""
import json
import os
from datetime import datetime, timezone
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v49_real_transaction import inspect_transaction, fetch_json, DiagnosticError
from app_bch_flow.blockchain.v50_attribution import assess_payment, AttributionError


class Command(BaseCommand):
    help = 'Read-only mainnet invoice attribution assessment; no payment or settlement.'

    def add_arguments(self, parser):
        parser.add_argument('invoice_uuid')
        parser.add_argument('txid')
        parser.add_argument('--min-confirmations', type=int, default=2)

    def handle(self, *args, **options):
        if os.environ.get('BCHFLOW_V50_ENABLE_ASSESSMENT') != '1':
            raise CommandError('v50_assessment_disabled')
        try:
            from app_bch_flow.models import BCHInvoice, BCHOutpointReservation
            invoice = BCHInvoice.objects.get(pk=options['invoice_uuid'])
            # Do not use model-level save, update, get_or_create, or ledger writes.
            expected = {
                'id': str(invoice.pk), 'network': invoice.network,
                'status': invoice.status,
                'amount_satoshis': invoice.amount_satoshis,
                'receiving_cashaddr': invoice.receiving_cashaddr,
                'expires_at': invoice.expires_at,
            }
            if expected['network'] != 'mainnet':
                raise CommandError('invoice_not_mainnet')
            report = inspect_transaction(options['txid'])
            raw = fetch_json('/api/v2/tx/' + report['txid'], api_key=os.environ.get('BCHFLOW_V48_PRIMARY_KEY', ''))
            vin = raw.get('vin')
            if not isinstance(vin, list) or not vin:
                coinbase = None
            else:
                coinbase = any('coinbase' in item for item in vin if isinstance(item, dict))
                if any(not isinstance(item, dict) for item in vin):
                    coinbase = None
            # Require a known reservation schema; otherwise fail closed.
            fields = {f.name for f in BCHOutpointReservation._meta.fields}
            if not {'network', 'txid', 'output_index'} <= fields:
                raise CommandError('unknown_reservation_schema')
            reserved = list(BCHOutpointReservation.objects.filter(network='mainnet', txid=report['txid']).values_list('txid', 'output_index'))
            result = assess_payment(
                observation=report, invoice=expected, reserved_outpoints=reserved,
                now=datetime.now(timezone.utc), min_confirmations=options['min_confirmations'],
                require_independent_corroboration=True, coinbase=coinbase,
            )
            self.stdout.write(json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False))
        except (BCHInvoice.DoesNotExist, ValueError, DiagnosticError, AttributionError) as exc:
            raise CommandError(str(exc)) from exc
