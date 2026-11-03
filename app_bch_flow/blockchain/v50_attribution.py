"""V5.0: conservative read-only BCH invoice/outpoint assessment.

Only evaluates external observations; never settles or writes to database.
"""
import re
from datetime import datetime, timezone

HEX64 = re.compile(r'^[0-9a-fA-F]{64}$')

class AttributionError(ValueError):
    pass


def _integer(value, name, minimum=0):
    if type(value) is not int or value < minimum:
        raise AttributionError('invalid_' + name)
    return value


def _address(value):
    if not isinstance(value, str) or not value.startswith('bitcoincash:'):
        raise AttributionError('invalid_cashaddr')
    if not re.fullmatch(r'bitcoincash:[qp][a-z0-9]{41}', value):
        raise AttributionError('invalid_cashaddr')
    return value.lower()


def assess_payment(*, observation, invoice, reserved_outpoints=(), now=None,
                   min_confirmations=2, max_observation_age_seconds=120,
                   require_independent_corroboration=True, coinbase=None):
    """Fail-closed candidate assessment. Caller must source invoice/reservations authoritatively.

    `coinbase` must be supplied by an independently validated raw transaction
    inspection; None is unknown and blocks. An external provider is not consensus.
    """
    if not isinstance(observation, dict) or not isinstance(invoice, dict):
        raise AttributionError('invalid_input')
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise AttributionError('naive_clock')
    _integer(min_confirmations, 'minimum_confirmations', 1)
    _integer(max_observation_age_seconds, 'max_age', 1)
    reasons = []
    txid = observation.get('txid')
    if not isinstance(txid, str) or not HEX64.fullmatch(txid):
        raise AttributionError('invalid_txid')
    txid = txid.lower()
    if observation.get('schema') != 'bchflow.v49.real_transaction_diagnostic':
        reasons.append('untrusted_observation_schema')
    if observation.get('network') != 'mainnet' or invoice.get('network') != 'mainnet':
        reasons.append('network_mismatch')
    if observation.get('provider_status') != 'in_sync':
        reasons.append('provider_not_synced')
    if observation.get('assessment') != 'external_single_provider_observation_only':
        reasons.append('unexpected_observation_state')
    if observation.get('payment_created') is not False or observation.get('settlement_authorized') is not False:
        reasons.append('unexpected_side_effects')
    if coinbase is not False:
        reasons.append('coinbase_or_unverified_transaction_type')
    if require_independent_corroboration and observation.get('independent_corroboration') is not True:
        reasons.append('no_independent_corroboration')
    confirmations = _integer(observation.get('confirmations'), 'confirmations')
    if confirmations < min_confirmations:
        reasons.append('insufficient_confirmations')
    height = _integer(observation.get('block_height'), 'block_height', 1)
    tip = _integer(observation.get('tip_height'), 'tip_height', 1)
    if tip < height or confirmations != tip - height + 1:
        reasons.append('inconsistent_chain_height')
    timestamp = observation.get('observed_at')
    try:
        seen_at = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        if seen_at.tzinfo is None:
            raise ValueError()
    except (AttributeError, ValueError) as exc:
        raise AttributionError('invalid_observed_at') from exc
    age = (now - seen_at).total_seconds()
    if age < -30 or age > max_observation_age_seconds:
        reasons.append('stale_or_future_observation')
    if invoice.get('status') not in ('created', 'pending', 'awaiting_payment'):
        reasons.append('invoice_not_payable')
    expected = _integer(invoice.get('amount_satoshis'), 'invoice_amount', 1)
    cashaddr = _address(invoice.get('receiving_cashaddr'))
    expires_at = invoice.get('expires_at')
    if expires_at is not None:
        if isinstance(expires_at, str):
            try:
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except ValueError as exc:
                raise AttributionError('invalid_expiry') from exc
        if not isinstance(expires_at, datetime) or expires_at.tzinfo is None:
            raise AttributionError('invalid_expiry')
        if now >= expires_at:
            reasons.append('invoice_expired')
    outputs = observation.get('outputs')
    if not isinstance(outputs, list) or not outputs or len(outputs) > 5000:
        raise AttributionError('invalid_outputs')
    seen_vouts = set()
    matching = []
    for output in outputs:
        if not isinstance(output, dict):
            raise AttributionError('invalid_output')
        vout = _integer(output.get('vout'), 'vout')
        sats = _integer(output.get('satoshis'), 'satoshis')
        addresses = output.get('addresses')
        if vout in seen_vouts or not isinstance(addresses, list) or not all(isinstance(a, str) for a in addresses):
            raise AttributionError('invalid_or_duplicate_output')
        seen_vouts.add(vout)
        if cashaddr in [a.lower() for a in addresses]:
            matching.append({'txid': txid, 'vout': vout, 'satoshis': sats})
    if not matching:
        reasons.append('address_not_found')
    if len(matching) != 1:
        reasons.append('ambiguous_multiple_outputs')
    if sum(item['satoshis'] for item in matching) != expected:
        reasons.append('amount_mismatch')
    reserved = set()
    for item in reserved_outpoints:
        if not isinstance(item, (list, tuple)) or len(item) != 2 or not isinstance(item[0], str):
            raise AttributionError('invalid_reserved_outpoints')
        reserved.add((item[0].lower(), _integer(item[1], 'reserved_vout')))
    if any((txid, item['vout']) in reserved for item in matching):
        reasons.append('outpoint_already_reserved')
    return {
        'schema': 'bchflow.v50.payment_attribution_assessment',
        'txid': txid,
        'invoice_id': str(invoice.get('id', '')),
        'matched_outpoints': matching,
        'reasons': sorted(set(reasons)),
        'assessment': 'eligible_for_manual_review_only' if not reasons else 'blocked',
        'invoice_attributed': False,
        'payment_created': False,
        'settlement_authorized': False,
        'warning': 'Read-only candidate assessment. No on-chain consensus proof, attribution or settlement.',
    }
