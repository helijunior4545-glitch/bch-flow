"""V4.4 opt-in, read-only BCH invoice address polling. No settlement or DB writes."""
import json
import os
import time
from datetime import datetime, timezone
from uuid import UUID
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.models import BCHInvoice, BCHMembership
from app_bch_flow.blockchain.v43_address_utxo import observe_address, ObservationUnavailable

MAX_ADDRESSES = 50

def snapshot(org_id, observer=observe_address):
    # Organization is explicit, active and has at least one active member.
    if not BCHMembership.objects.filter(organization_id=org_id, is_active=True,
                                        organization__is_active=True).exists():
        raise ValueError('organization_not_active_or_no_members')
    addresses = list(BCHInvoice.objects.filter(organization_id=org_id, network='mainnet')
                     .exclude(receiving_cashaddr__isnull=True)
                     .exclude(receiving_cashaddr='')
                     .values_list('receiving_cashaddr', flat=True).distinct()[:MAX_ADDRESSES+1])
    if len(addresses) > MAX_ADDRESSES:
        raise ValueError('address_limit_exceeded')
    result = {'version':'V4.4', 'organization_id':str(org_id),
              'observed_at':datetime.now(timezone.utc).isoformat(),
              'status':'external_single_provider_unverified', 'ownership_verified':False,
              'balance_verified':False, 'settlement_authorized':False,
              'addresses':[], 'errors':[]}
    for address in addresses:
        try:
            observation = observer(address)
            rows = [{'txid':u['txid'],'vout':u['vout'], 'satoshis':u['satoshis'],
                     'confirmations':u['confirmations']} for u in observation.utxos]
            result['addresses'].append({'address':address,
                'confirmed_satoshis':observation.confirmed_satoshis,
                'unconfirmed_satoshis':observation.unconfirmed_satoshis,
                'utxos':rows})
        except (ObservationUnavailable, ValueError, TypeError):
            # No partial failure can authorize settlement.
            result['errors'].append({'address':address, 'error':'observation_unavailable'})
    return result

def compare(previous, current):
    """Changes in UTXO snapshots are NOT payment events or confirmations of payment."""
    def index(report):
        return {(entry['address'], row['txid'], row['vout']):row
                for entry in report['addresses'] for row in entry['utxos']}
    before, after = index(previous), index(current)
    return {'new_outpoints':[{'address':a,'txid':tx,'vout':v} for a,tx,v in sorted(after.keys()-before.keys())],
            'missing_outpoints':[{'address':a,'txid':tx,'vout':v} for a,tx,v in sorted(before.keys()-after.keys())],
            'confirmation_changes':[{'address':a,'txid':tx,'vout':v,
              'before':before[(a,tx,v)]['confirmations'], 'after':after[(a,tx,v)]['confirmations']}
              for a,tx,v in sorted(before.keys() & after.keys())
              if before[(a,tx,v)]['confirmations'] != after[(a,tx,v)]['confirmations']]}

class Command(BaseCommand):
    help = 'Observe invoice receiving-address UTXOs (read-only, no settlement).'
    def add_arguments(self, parser):
        parser.add_argument('--organization', required=True)
        parser.add_argument('--loop', action='store_true', help='Repeat until stopped; no DB writes')
        parser.add_argument('--interval', type=int, default=120, help='Seconds between cycles, minimum 60')
    def handle(self, *args, **opts):
        if os.getenv('BCHFLOW_V44_ENABLE_WATCHER') != '1':
            raise CommandError('V4.4 disabled; set BCHFLOW_V44_ENABLE_WATCHER=1')
        if os.getenv('BCHFLOW_V43_ENABLE_ADDRESS_READ') != '1':
            raise CommandError('V4.3 address observation is disabled')
        if opts['interval'] < 60 or opts['interval'] > 86400:
            raise CommandError('interval must be 60..86400 seconds')
        try:
            org_id=UUID(opts['organization'])
        except (TypeError, ValueError):
            raise CommandError('invalid organization UUID')
        previous = None
        while True:
            try:
                current = snapshot(org_id)
            except ValueError as exc:
                raise CommandError(str(exc)) from exc
            # Only compare fully successful cycles; a provider outage resets baseline.
            if previous is not None and not previous['errors'] and not current['errors']:
                current['changes_since_last_cycle'] = compare(previous, current)
            self.stdout.write(json.dumps(current, sort_keys=True))
            previous = current if not current['errors'] else None
            if not opts['loop']:
                break
            time.sleep(opts['interval'])
