"""V5.1: read-only, fail-closed cross-provider BCH evidence comparator.

The caller must acquire evidence through independently authenticated transports.
Comparing reports does not prove provider ownership, chain consensus or payment.
"""
import re
from datetime import datetime, timezone

TXID = re.compile(r'[0-9a-fA-F]{64}\Z')

class CorroborationError(ValueError):
    pass

def _hex(value, label):
    if not isinstance(value, str) or not TXID.fullmatch(value):
        raise CorroborationError('invalid_' + label)
    return value.lower()

def _integer(value, label, minimum=0):
    if type(value) is not int or value < minimum:
        raise CorroborationError('invalid_' + label)
    return value

def _outputs(value):
    if not isinstance(value, list) or not value or len(value) > 5000:
        raise CorroborationError('invalid_outputs')
    result = []
    indexes = set()
    for item in value:
        if not isinstance(item, dict):
            raise CorroborationError('invalid_output')
        idx = _integer(item.get('vout'), 'vout')
        sats = _integer(item.get('satoshis'), 'satoshis')
        addresses = item.get('addresses')
        if (idx in indexes or not isinstance(addresses, list)
                or not addresses or len(addresses) > 10
                or any(not isinstance(a, str) or not a.startswith('bitcoincash:') for a in addresses)
                or len(set(a.lower() for a in addresses)) != len(addresses)):
            raise CorroborationError('invalid_output_addresses_or_index')
        indexes.add(idx)
        result.append((idx, sats, tuple(sorted(a.lower() for a in addresses))))
    return sorted(result)

def _timestamp(value, label, now, max_age):
    if not isinstance(value, str):
        raise CorroborationError('invalid_' + label)
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError as exc:
        raise CorroborationError('invalid_' + label) from exc
    if dt.tzinfo is None:
        raise CorroborationError('invalid_' + label)
    delta = (now - dt).total_seconds()
    if delta < -30 or delta > max_age:
        raise CorroborationError('stale_or_future_' + label)
    return dt

def corroborate(primary, secondary, *, expected_txid, now=None, max_age_seconds=120,
                minimum_confirmations=2):
    """Compare strict canonical v49-style observations. No I/O or DB writes.

    `independent_corroboration` is always False until operators and
    acquisition paths have been verified separately. Even agreement cannot
    authorize settlement or bypass V5.0's other requirements.
    """
    txid = _hex(expected_txid, 'expected_txid')
    if type(max_age_seconds) is not int or not 1 <= max_age_seconds <= 3600:
        raise CorroborationError('invalid_max_age')
    _integer(minimum_confirmations, 'minimum_confirmations', 1)
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise CorroborationError('naive_clock')
    reasons = []
    validated = []
    for label, obs in (('primary', primary), ('secondary', secondary)):
        if not isinstance(obs, dict):
            raise CorroborationError('invalid_' + label)
        if obs.get('schema') != 'bchflow.v49.real_transaction_diagnostic':
            reasons.append(label + '_unrecognized_schema')
        if obs.get('network') != 'mainnet' or obs.get('provider_status') != 'in_sync':
            reasons.append(label + '_network_or_sync_invalid')
        if obs.get('assessment') != 'external_single_provider_observation_only':
            reasons.append(label + '_unexpected_assessment')
        if obs.get('invoice_attributed') is not False or obs.get('payment_created') is not False or obs.get('settlement_authorized') is not False:
            reasons.append(label + '_unexpected_write_claim')
        if _hex(obs.get('txid'), label + '_txid') != txid:
            reasons.append(label + '_txid_mismatch')
        _timestamp(obs.get('observed_at'), label + '_observed_at', now, max_age_seconds)
        block_hash = _hex(obs.get('block_hash'), label + '_block_hash')
        height = _integer(obs.get('block_height'), label + '_block_height', 1)
        tip = _integer(obs.get('tip_height'), label + '_tip_height', 1)
        conf = _integer(obs.get('confirmations'), label + '_confirmations', 1)
        if tip < height or conf != tip - height + 1:
            reasons.append(label + '_inconsistent_chain_height')
        if conf < minimum_confirmations:
            reasons.append(label + '_insufficient_confirmations')
        outputs = _outputs(obs.get('outputs'))
        validated.append((block_hash, height, tip, conf, outputs))
    if primary.get('provider') == secondary.get('provider'):
        reasons.append('same_provider_label')
    if validated[0][0] != validated[1][0] or validated[0][1] != validated[1][1]:
        reasons.append('block_disagreement')
    if validated[0][4] != validated[1][4]:
        reasons.append('output_disagreement')
    if abs(validated[0][2] - validated[1][2]) > 2:
        reasons.append('tip_divergence')
    if abs(validated[0][3] - validated[1][3]) > 2:
        reasons.append('confirmation_divergence')
    # No caller-controlled flag may elevate this result to proof of independence.
    return {
        'schema': 'bchflow.v51.corroboration_comparison',
        'txid': txid,
        'comparison': 'consistent_unverified_sources' if not reasons else 'blocked',
        'reasons': sorted(set(reasons)),
        'independent_corroboration': False,
        'invoice_attributed': False,
        'payment_created': False,
        'settlement_authorized': False,
        'warning': 'Read-only comparison; operator independence, raw tx coinbase status and BCH consensus are NOT proven.'
    }
