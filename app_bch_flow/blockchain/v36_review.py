"""V3.6 supervised review of UNVERIFIED evidence. Never settles invoices."""
import hashlib
import json
from dataclasses import dataclass
from django.db import transaction, connections
from app_bch_flow.models import BCHInvoice, BCHMembership, BCHFinancialEvent
from app_bch_flow.blockchain.v35_reconciliation import EVENT_TYPE as OBSERVATION_TYPE

REVIEW_TYPE = 'bch.v36.supervised_review'
class ReviewError(ValueError):
    pass

@dataclass(frozen=True)
class ReviewResult:
    event_id: str
    created: bool
    decision: str
    observation_id: str


def review_observation(invoice_id, observation_id, actor_id, *, decision, reason, write=False):
    """Record a human review decision, NOT a consensus proof or a payment settlement.

    Approvals are explicitly non-binding and cannot transition invoice/payment status.
    """
    if decision not in ('accept_for_investigation', 'reject_evidence'):
        raise ReviewError('Invalid decision')
    if type(write) is not bool:
        raise ReviewError('write must be boolean')
    if not isinstance(reason, str) or not 12 <= len(reason.strip()) <= 1000:
        raise ReviewError('Reason must be 12..1000 characters')
    if connections['default'].vendor != 'postgresql':
        raise ReviewError('PostgreSQL default required')
    with transaction.atomic(using='default'):
        try:
            invoice = BCHInvoice.objects.using('default').select_for_update().get(pk=invoice_id)
        except (BCHInvoice.DoesNotExist, ValueError, TypeError) as exc:
            raise ReviewError('Invoice not found') from exc
        if not invoice.organization.is_active:
            raise ReviewError('Organization inactive')
        if not BCHMembership.objects.using('default').filter(
            organization_id=invoice.organization_id, identity_id=actor_id,
            role__in=('owner', 'admin'), is_active=True,
        ).exists():
            raise ReviewError('Active owner/admin membership required')
        try:
            observation = BCHFinancialEvent.objects.using('default').get(
                pk=observation_id, invoice=invoice, organization_id=invoice.organization_id,
                event_type=OBSERVATION_TYPE,
            )
        except (BCHFinancialEvent.DoesNotExist, ValueError, TypeError) as exc:
            raise ReviewError('Observation not found for invoice') from exc
        meta = observation.metadata
        if not isinstance(meta, dict) or meta.get('source') != 'external_unverified':
            raise ReviewError('Only explicitly unverified V3.5 observations are reviewable')
        if not isinstance(meta.get('evidence_digest'), str) or len(meta['evidence_digest']) != 64:
            raise ReviewError('Invalid evidence digest')
        # Exact same actor/decision/observation/reason is idempotent within the locked invoice.
        normalized_reason = reason.strip()
        key_data = dict(schema=1, observation_id=str(observation.pk), actor_id=str(actor_id),
                        decision=decision, reason=normalized_reason)
        digest = hashlib.sha256(json.dumps(key_data, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        for event in BCHFinancialEvent.objects.using('default').filter(
                invoice=invoice, event_type=REVIEW_TYPE).only('id', 'metadata').iterator():
            if event.metadata.get('review_digest') == digest:
                return ReviewResult(str(event.pk), False, decision, str(observation.pk))
        if not write:
            return ReviewResult('', False, decision, str(observation.pk))
        event = BCHFinancialEvent.objects.using('default').create(
            organization_id=invoice.organization_id, invoice=invoice, event_type=REVIEW_TYPE,
            previous_status=invoice.status, next_status=invoice.status,
            metadata=dict(schema=1, review_digest=digest, observation_id=str(observation.pk),
                          evidence_digest=meta['evidence_digest'], actor_id=str(actor_id),
                          decision=decision, reason=normalized_reason,
                          warning='HUMAN REVIEW ONLY: NOT CONSENSUS VERIFIED; NOT SETTLEMENT'),
        )
        return ReviewResult(str(event.pk), True, decision, str(observation.pk))
