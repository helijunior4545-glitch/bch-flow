"""V4.6 external-provider corroboration; never consensus proof or settlement.

All network reads are delegated to the existing opt-in V3.4/V3.7/V3.9 adapters.
The verification is ephemeral and read-only; no financial state transitions.
"""
from dataclasses import dataclass
import re
from urllib.parse import urlsplit
from app_bch_flow.models import BCHInvoice, BCHFinancialEvent
from .v33_engine import OutputEvidence
from .v37_quorum import compare_evidence, QuorumError
from .v34_blockbook import NetworkReadError
from .v45_settlement_policy import evaluate_settlement_policy

_HEX = re.compile(r"[0-9a-f]{64}\Z")

class ChainVerificationError(ValueError):
    pass

@dataclass(frozen=True)
class ChainVerification:
    invoice_id: str
    evidence_event_id: str
    decision: str
    reasons: tuple
    txid: str
    matched_outpoints: int
    corroborated_satoshis: int
    settlement_authorized: bool = False
    warning: str = 'EXTERNAL API CORROBORATION ONLY; NOT CONSENSUS PROOF OR SETTLEMENT'


def verify_invoice_chain(invoice_id, evidence_event_id, *, primary=None, secondary=None,
                         min_confirmations=2):
    """Compare complete address histories for V4.5-reviewed, reserved outpoints.

    Two different hostnames are not necessarily independent providers. Neither
    output timestamps nor reorg finality nor wallet ownership are established.
    """
    if type(min_confirmations) is not int or not 1 <= min_confirmations <= 100:
        raise ChainVerificationError('Invalid confirmation threshold')
    try:
        invoice = BCHInvoice.objects.using('default').get(pk=invoice_id)
    except (BCHInvoice.DoesNotExist, ValueError, TypeError) as exc:
        raise ChainVerificationError('Invoice not found') from exc
    policy = evaluate_settlement_policy(invoice.pk, evidence_event_id)
    if policy.decision != 'manual_review_ready':
        return ChainVerification(str(invoice.pk), str(evidence_event_id), 'blocked',
                                 ('v45_policy_blocked',) + tuple(policy.reasons), '', 0, 0)
    event = BCHFinancialEvent.objects.using('default').filter(
        pk=evidence_event_id, invoice=invoice, organization_id=invoice.organization_id,
        event_type='bch.v42.attribution_pre_review').first()
    if event is None or not isinstance(event.metadata, dict):
        return ChainVerification(str(invoice.pk), str(evidence_event_id), 'blocked',
                                 ('missing_v42_evidence',), '', 0, 0)
    txid = event.metadata.get('txid')
    outs = event.metadata.get('outpoints')
    if not isinstance(txid, str) or not _HEX.fullmatch(txid):
        raise ChainVerificationError('Invalid evidence TXID')
    if not isinstance(outs, list) or not outs or len(outs) > 5000:
        raise ChainVerificationError('Invalid evidence outpoints')
    expected = set()
    for item in outs:
        if (not isinstance(item, dict) or item.get('txid') != txid or
                type(item.get('vout')) is not int or not 0 <= item['vout'] <= 100000):
            raise ChainVerificationError('Malformed evidence outpoint')
        if item['vout'] in expected:
            raise ChainVerificationError('Duplicate evidence outpoint')
        expected.add(item['vout'])
    # Build providers only after policy gate. Their constructors enforce opt-in.
    if primary is None:
        from .v39_nownodes import NOWNodesBCHProvider
        primary = NOWNodesBCHProvider(network='mainnet', max_pages=10, page_size=100)
    if secondary is None:
        from .v37_quorum import SecondaryBlockbookProvider
        secondary = SecondaryBlockbookProvider(network='mainnet', max_pages=10, page_size=100)
    if primary is secondary:
        raise ChainVerificationError('Same provider instance rejected')
    a_host = urlsplit(getattr(primary, 'base', '')).hostname
    b_host = urlsplit(getattr(secondary, 'base', '')).hostname
    if a_host and b_host and a_host.lower() == b_host.lower():
        raise ChainVerificationError('Identical provider hostname rejected')
    try:
        a = tuple(primary.outputs_for_address(network='mainnet', address=invoice.receiving_cashaddr))
        b = tuple(secondary.outputs_for_address(network='mainnet', address=invoice.receiving_cashaddr))
    except (NetworkReadError, TimeoutError, OSError, ValueError, TypeError) as exc:
        raise ChainVerificationError('External provider read failed') from exc
    # The whole address history must agree, not only hand-picked matching outputs.
    try:
        report = compare_evidence(a, b, min_confirmations=min_confirmations)
    except (QuorumError, ValueError, TypeError) as exc:
        raise ChainVerificationError('Invalid provider evidence') from exc
    if report.status != 'corroborated_external':
        return ChainVerification(str(invoice.pk), str(event.pk), 'blocked',
                                 ('external_provider_' + report.status,), txid, 0, 0)
    matched = [x for x in report.outputs if x.txid == txid]
    indexes = {x.vout for x in matched}
    if indexes != expected or len(matched) != len(expected):
        return ChainVerification(str(invoice.pk), str(event.pk), 'blocked',
                                 ('outpoint_set_mismatch',), txid, len(matched), 0)
    if any(x.address != invoice.receiving_cashaddr or x.network != 'mainnet' for x in matched):
        return ChainVerification(str(invoice.pk), str(event.pk), 'blocked',
                                 ('address_or_network_mismatch',), txid, len(matched), 0)
    total = sum(x.satoshis for x in matched)
    if total != invoice.amount_satoshis or total != event.metadata.get('confirmed_satoshis'):
        return ChainVerification(str(invoice.pk), str(event.pk), 'blocked',
                                 ('amount_mismatch',), txid, len(matched), total)
    return ChainVerification(str(invoice.pk), str(event.pk), 'corroborated_external_only',
                             ('not_consensus_proof', 'provider_independence_unproven',
                              'address_ownership_unproven', 'reorg_finality_unproven',
                              'human_review_required'), txid, len(matched), total)
