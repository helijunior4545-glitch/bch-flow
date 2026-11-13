"""V3.5 evidence journal: non-custodial, non-settling, default database only.

An external explorer is not a consensus proof. No invoice/payment/transfer state is changed.
"""
import hashlib
import json
from dataclasses import dataclass
from django.db import connections, transaction
from django.core.exceptions import ValidationError
from app_bch_flow.models import BCHInvoice, BCHFinancialEvent
from .v33_engine import evaluate_invoice, OutputEvidence, EvidenceError

EVENT_TYPE = 'bch.v35.observation'

class ReconciliationError(ValueError):
    pass

@dataclass(frozen=True)
class JournalResult:
    event_id: str
    created: bool
    status: str
    observed_satoshis: int
    confirmed_satoshis: int
    exclusive: bool
    evidence_digest: str


def _snapshot(invoice, outputs, min_confirmations):
    if type(min_confirmations) is not int or not 1 <= min_confirmations <= 100:
        raise ReconciliationError('Invalid confirmation threshold')
    outputs = tuple(outputs)
    if len(outputs) > 5000:
        raise ReconciliationError('Too many outputs')
    # Validate all outputs and reject duplicate outpoints before writing anything.
    keys = set()
    for item in outputs:
        if not isinstance(item, OutputEvidence):
            raise ReconciliationError('Invalid evidence')
        key = (item.network, item.txid, item.vout)
        if key in keys:
            raise ReconciliationError('Duplicate output')
        keys.add(key)
    # Conservative: any other invoice sharing the address blocks attribution,
    # including historical invoices; even exclusive addresses are only reviewable.
    shared = BCHInvoice.objects.using('default').filter(
        network=invoice.network, receiving_cashaddr=invoice.receiving_cashaddr,
    ).exclude(pk=invoice.pk).exists()
    observation = evaluate_invoice(
        invoice_address=invoice.receiving_cashaddr,
        network=invoice.network, required_satoshis=invoice.amount_satoshis,
        outputs=outputs, min_confirmations=min_confirmations,
        address_exclusive=not shared,
    )
    matched = sorted((dict(txid=o.txid, vout=o.vout, satoshis=o.satoshis,
                           confirmations=o.confirmations, block_hash=o.block_hash)
                      for o in outputs if o.network == invoice.network and o.address == invoice.receiving_cashaddr),
                     key=lambda x: (x['txid'], x['vout']))
    evidence = dict(schema=1, invoice_id=str(invoice.pk), network=invoice.network,
                    address=invoice.receiving_cashaddr, required_satoshis=invoice.amount_satoshis,
                    min_confirmations=min_confirmations, shared_address=shared,
                    outputs=matched)
    digest = hashlib.sha256(json.dumps(evidence, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    return observation, shared, matched, digest


def record_observation(invoice_id, *, outputs, min_confirmations=1, write=False):
    """Write an idempotent evidence journal only with explicit write=True.

    Requires PostgreSQL; row lock serializes same-invoice attempts. Does not
    claim independent verification, alter financial status or attribute funds.
    """
    if type(write) is not bool:
        raise ReconciliationError('write must be boolean')
    if connections['default'].vendor != 'postgresql':
        raise ReconciliationError('PostgreSQL default database required')
    with transaction.atomic(using='default'):
        invoice = BCHInvoice.objects.using('default').select_for_update().get(pk=invoice_id)
        observation, shared, matched, digest = _snapshot(invoice, outputs, min_confirmations)
        metadata = dict(schema=1, evidence_digest=digest, source='external_unverified',
                        observation_status=observation.status, shared_address=shared,
                        observed_satoshis=observation.observed_satoshis,
                        confirmed_satoshis=observation.confirmed_satoshis,
                        required_satoshis=observation.required_satoshis,
                        min_confirmations=min_confirmations,
                        matched_outputs=matched,
                        warning='NOT settlement; explorer data unverified')
        previous = BCHFinancialEvent.objects.using('default').filter(
            invoice=invoice, event_type=EVENT_TYPE).order_by('-created_at')
        # No global uniqueness on JSON metadata; invoice row lock provides
        # per-invoice serialization for all writes through this service.
        for item in previous.iterator(chunk_size=100):
            if item.metadata.get('evidence_digest') == digest:
                return JournalResult(str(item.pk), False, observation.status,
                                     observation.observed_satoshis, observation.confirmed_satoshis,
                                     not shared, digest)
        if not write:
            return JournalResult('', False, observation.status,
                                 observation.observed_satoshis, observation.confirmed_satoshis,
                                 not shared, digest)
        event = BCHFinancialEvent.objects.using('default').create(
            organization=invoice.organization, invoice=invoice,
            event_type=EVENT_TYPE, previous_status=invoice.status,
            next_status=invoice.status, metadata=metadata)
        return JournalResult(str(event.pk), True, observation.status,
                             observation.observed_satoshis, observation.confirmed_satoshis,
                             not shared, digest)
