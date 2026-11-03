"""V4.1 conservative, read-only invoice attribution assessment.

Simulation-friendly: caller supplies V4.0 PaymentCandidate, never a settlement.
No blockchain claim, writes, payment transition, or automatic approval.
"""
from dataclasses import dataclass
from django.utils import timezone
from app_bch_flow.models import BCHInvoice

class AttributionError(ValueError):
    pass

@dataclass(frozen=True)
class AttributionAssessment:
    invoice_id: str
    txid: str
    decision: str
    reasons: tuple
    observed_satoshis: int
    confirmed_satoshis: int
    required_satoshis: int
    review_required: bool = True
    warning: str = "SIMULATED/EXTERNAL EVIDENCE ONLY; NOT A PAYMENT OR SETTLEMENT"

def assess_candidate(invoice_id, candidate, *, observed_at=None):
    """Fail closed on missing evidence; DB reads only.

    This is a pre-review policy, not a cryptographic transaction verification.
    It never approves payment: timestamps and address ownership require proof.
    """
    try:
        invoice = BCHInvoice.objects.using('default').get(pk=invoice_id)
    except (BCHInvoice.DoesNotExist, ValueError, TypeError) as exc:
        raise AttributionError("Invoice not found") from exc
    if str(candidate.invoice_id) != str(invoice.pk):
        raise AttributionError("Candidate belongs to another invoice")
    if not isinstance(candidate.txid, str) or len(candidate.txid) != 64 or any(c not in '0123456789abcdefABCDEF' for c in candidate.txid):
        raise AttributionError("Invalid TXID")
    reasons = []
    if invoice.network != 'mainnet':
        reasons.append('unsupported_network')
    if invoice.status not in ('created', 'pending', 'partial'):
        reasons.append('invoice_not_open')
    if invoice.expires_at is None or timezone.is_naive(invoice.expires_at):
        reasons.append('invalid_expiration')
    elif invoice.expires_at <= (observed_at or timezone.now()):
        reasons.append('invoice_expired_at_review')
    if not invoice.receiving_cashaddr:
        reasons.append('missing_receiving_address')
    else:
        if BCHInvoice.objects.using('default').filter(
            network=invoice.network, receiving_cashaddr=invoice.receiving_cashaddr
        ).exclude(pk=invoice.pk).exists():
            reasons.append('address_reused_across_invoices')
    required = invoice.amount_satoshis
    if type(required) is not int or required <= 0:
        reasons.append('invalid_invoice_amount')
    if type(candidate.observed_satoshis) is not int or candidate.observed_satoshis < 0:
        raise AttributionError('Invalid observed amount')
    if type(candidate.confirmed_satoshis) is not int or not 0 <= candidate.confirmed_satoshis <= candidate.observed_satoshis:
        raise AttributionError('Invalid confirmed amount')
    if candidate.required_satoshis != required:
        reasons.append('candidate_amount_mismatch')
    if candidate.status != 'unattributed':
        reasons.append('unexpected_candidate_status')
    if candidate.observed_satoshis < required:
        reasons.append('partial_or_missing_amount')
    if candidate.confirmed_satoshis < required:
        reasons.append('insufficient_confirmed_amount')
    if candidate.output_count < 1:
        reasons.append('no_matching_outputs')
    # V4.0 candidate contains no chain-verified output timestamps or ownership proof.
    reasons.extend(('tx_time_not_verified', 'address_ownership_not_verified', 'independent_chain_verification_missing'))
    decision = 'blocked' if any(r not in (
        'tx_time_not_verified', 'address_ownership_not_verified',
        'independent_chain_verification_missing'
    ) for r in reasons) else 'manual_review_only'
    return AttributionAssessment(
        str(invoice.pk), candidate.txid.lower(), decision, tuple(reasons),
        candidate.observed_satoshis, candidate.confirmed_satoshis, required
    )
