"""V4.5 read-only eligibility for MANUAL review, never settlement authorization."""
import re
from dataclasses import dataclass
from django.db import connections, transaction
from django.utils import timezone
from app_bch_flow.models import BCHInvoice, BCHFinancialEvent
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation

ASSESSMENT_TYPE = 'bch.v42.attribution_pre_review'
OBSERVATION_TYPE = 'bch.v35.observation'

@dataclass(frozen=True)
class SettlementPolicyAssessment:
    invoice_id: str
    decision: str
    reasons: tuple
    reserved_outpoints: int
    expected_outpoints: int
    settlement_authorized: bool = False
    warning: str = 'NOT A PAYMENT; chain verification, address ownership and finality unproven'


def evaluate_settlement_policy(invoice_id, evidence_event_id, *, observed_at=None):
    """Conservative, read-only policy. manual_review_ready != eligible for settlement.

    Do not treat historical event metadata as independently verified chain facts.
    No payment/invoice mutation, network calls, event creation or key handling.
    """
    if connections['default'].vendor != 'postgresql':
        raise ValueError('PostgreSQL required')
    now = timezone.now() if observed_at is None else observed_at
    if timezone.is_naive(now):
        raise ValueError('observed_at must be timezone-aware')
    with transaction.atomic(using='default'):
        try:
            inv = BCHInvoice.objects.using('default').get(pk=invoice_id)
        except (BCHInvoice.DoesNotExist, ValueError, TypeError) as exc:
            raise ValueError('Invoice not found') from exc
        reasons = []
        if not inv.organization.is_active:
            reasons.append('inactive_organization')
        if inv.network != 'mainnet':
            reasons.append('unsupported_network')
        if inv.status != 'created' or inv.paid_at is not None:
            reasons.append('invoice_not_open')
        if inv.expires_at and now >= inv.expires_at:
            reasons.append('invoice_expired')
        try:
            event = BCHFinancialEvent.objects.using('default').get(
                pk=evidence_event_id, invoice=inv, organization_id=inv.organization_id,
                event_type=ASSESSMENT_TYPE)
        except (BCHFinancialEvent.DoesNotExist, ValueError, TypeError):
            reasons.append('missing_matching_assessment')
            return SettlementPolicyAssessment(str(inv.pk), 'blocked', tuple(reasons), 0, 0)
        meta = event.metadata
        if not isinstance(meta, dict):
            reasons.append('malformed_assessment')
            return SettlementPolicyAssessment(str(inv.pk), 'blocked', tuple(reasons), 0, 0)
        txid = meta.get('txid')
        digest = meta.get('assessment_digest')
        if (meta.get('network') != inv.network or
            not isinstance(txid, str) or not re.fullmatch('[0-9a-f]{64}', txid) or
            not isinstance(digest, str) or not re.fullmatch('[0-9a-f]{64}', digest) or
            meta.get('decision') != 'manual_review_only' or
            meta.get('review_required') is not True or
            meta.get('source') != 'external_unverified'):
            reasons.append('invalid_assessment_provenance')
        if meta.get('observed_satoshis') != inv.amount_satoshis or meta.get('confirmed_satoshis') != inv.amount_satoshis:
            reasons.append('amount_not_exactly_matched')
        outpoints = meta.get('outpoints')
        keys = []
        if not isinstance(outpoints, list) or not outpoints:
            reasons.append('missing_outpoints')
        else:
            for out in outpoints:
                if (not isinstance(out, dict) or out.get('txid') != txid or
                    type(out.get('vout')) is not int or out['vout'] < 0):
                    reasons.append('malformed_outpoints')
                    break
                keys.append(out['vout'])
            if len(set(keys)) != len(keys):
                reasons.append('duplicate_outpoints')
        # Confirm provenance links to an existing observation; metadata alone cannot prove chain state.
        observation_id = meta.get('observation_id')
        observation_digest = meta.get('observation_digest')
        if (not isinstance(observation_digest, str) or
            not re.fullmatch('[0-9a-f]{64}', observation_digest)):
            reasons.append('missing_observation_digest')
        else:
            obs = BCHFinancialEvent.objects.using('default').filter(
                pk=observation_id, invoice=inv, organization_id=inv.organization_id,
                event_type=OBSERVATION_TYPE).first() if observation_id else None
            if (obs is None or not isinstance(obs.metadata, dict) or
                obs.metadata.get('evidence_digest') != observation_digest or
                obs.metadata.get('source') != 'external_unverified'):
                reasons.append('observation_link_not_verified')
        # Reused invoice addresses remain ambiguous even with reserved outpoints.
        if BCHInvoice.objects.using('default').filter(
            network=inv.network, receiving_cashaddr=inv.receiving_cashaddr
        ).exclude(pk=inv.pk).exists():
            reasons.append('receiving_address_reused')
        reserved = 0
        if keys and not any(r in reasons for r in ('malformed_outpoints', 'duplicate_outpoints')):
            claims = list(BCHOutpointReservation.objects.using('default').filter(
                network=inv.network, txid=txid, output_index__in=keys))
            reserved = sum(1 for claim in claims if claim.invoice_id == inv.pk and
                           claim.organization_id == inv.organization_id and
                           claim.evidence_event_id == event.pk)
            if len(claims) != len(keys) or reserved != len(keys):
                reasons.append('outpoints_not_exclusively_reserved')
        if reasons:
            return SettlementPolicyAssessment(str(inv.pk), 'blocked', tuple(dict.fromkeys(reasons)), reserved, len(keys))
        # Manual review readiness only. No independently validated chain facts or ownership proof.
        return SettlementPolicyAssessment(
            str(inv.pk), 'manual_review_ready',
            ('independent_chain_verification_required',
             'receiving_address_ownership_unproven',
             'reorg_and_finality_policy_not_established',
             'human_authorization_required'),
            reserved, len(keys))
