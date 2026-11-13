"""V4.7: read-only temporal validity of V4.6 corroboration snapshots.

Snapshots are supplied by the caller; this module does not persist evidence, fetch
providers, assert chain consensus, or settle invoices. Fail closed on ambiguity.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import re

HEX64 = re.compile(r"[0-9a-fA-F]{64}\Z")


class FreshnessInputError(ValueError):
    pass


@dataclass(frozen=True)
class ChainSnapshot:
    txid: str
    network: str
    block_hash: str
    block_height: int
    tip_height: int
    confirmations: int
    observed_at: datetime
    provider_hosts: tuple[str, ...]
    corroborated: bool
    outpoints: tuple[tuple[int, int], ...]  # (vout, satoshis), complete invoice allocation


@dataclass(frozen=True)
class FreshnessAssessment:
    decision: str  # current_external_only / stale / reorg_suspected / blocked
    reasons: tuple[str, ...]
    age_seconds: int
    settlement_authorized: bool = False
    warning: str = 'EXTERNAL EVIDENCE ONLY; NO CONSENSUS PROOF OR SETTLEMENT'


def _utc(value):
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise FreshnessInputError('Timestamp must be timezone-aware')
    return value.astimezone(timezone.utc)


def _validate(s):
    if not isinstance(s, ChainSnapshot):
        raise FreshnessInputError('Expected ChainSnapshot')
    if not isinstance(s.txid, str) or not HEX64.fullmatch(s.txid):
        raise FreshnessInputError('Invalid TXID')
    if s.network != 'mainnet':
        raise FreshnessInputError('Mainnet required')
    if not isinstance(s.block_hash, str) or not HEX64.fullmatch(s.block_hash):
        raise FreshnessInputError('Invalid block hash')
    for name in ('block_height', 'tip_height', 'confirmations'):
        value = getattr(s, name)
        if type(value) is not int or value < 0:
            raise FreshnessInputError('Invalid ' + name)
    if s.block_height == 0 or s.tip_height < s.block_height:
        raise FreshnessInputError('Invalid block height or tip')
    if s.confirmations != s.tip_height - s.block_height + 1:
        raise FreshnessInputError('Inconsistent confirmation arithmetic')
    _utc(s.observed_at)
    if type(s.corroborated) is not bool:
        raise FreshnessInputError('Invalid corroboration flag')
    if not isinstance(s.provider_hosts, tuple) or len(s.provider_hosts) < 2:
        raise FreshnessInputError('Two provider hosts required')
    if any(not isinstance(h, str) or not h or h != h.strip() for h in s.provider_hosts):
        raise FreshnessInputError('Invalid provider hostname')
    if len({h.lower() for h in s.provider_hosts}) != len(s.provider_hosts):
        raise FreshnessInputError('Repeated provider hostname')
    if not isinstance(s.outpoints, tuple) or not s.outpoints or len(s.outpoints) > 5000:
        raise FreshnessInputError('Invalid outpoint set')
    seen = set()
    for pair in s.outpoints:
        if (not isinstance(pair, tuple) or len(pair) != 2 or
                type(pair[0]) is not int or not 0 <= pair[0] <= 100000 or
                type(pair[1]) is not int or pair[1] <= 0):
            raise FreshnessInputError('Invalid outpoint')
        if pair[0] in seen:
            raise FreshnessInputError('Duplicate outpoint')
        seen.add(pair[0])


def assess_chain_freshness(previous, current, *, now=None, max_age_seconds=120,
                           min_confirmations=2, max_future_skew_seconds=10):
    """Compare two independently obtained, corroborated V4.6-era snapshots.

    This cannot establish actual chain consensus or address ownership. A 'current'
    result is never reusable indefinitely and is never settlement authorization.
    """
    for key, value, minimum in (('max_age_seconds', max_age_seconds, 1),
                                ('min_confirmations', min_confirmations, 1),
                                ('max_future_skew_seconds', max_future_skew_seconds, 0)):
        if type(value) is not int or value < minimum or value > 86400:
            raise FreshnessInputError('Invalid ' + key)
    _validate(previous)
    _validate(current)
    instant = _utc(now if now is not None else datetime.now(timezone.utc))
    old_time = _utc(previous.observed_at)
    new_time = _utc(current.observed_at)
    age = (instant - new_time).total_seconds()
    reasons = []
    reorg = []
    if current.txid.lower() != previous.txid.lower() or current.network != previous.network:
        reasons.append('transaction_identity_changed')
    if current.outpoints != previous.outpoints:
        reasons.append('outpoint_allocation_changed')
    if not previous.corroborated or not current.corroborated:
        reasons.append('external_corroboration_missing')
    if new_time < old_time:
        reasons.append('observation_time_regressed')
    if new_time > instant + timedelta(seconds=max_future_skew_seconds):
        reasons.append('future_observation')
    if old_time > instant + timedelta(seconds=max_future_skew_seconds):
        reasons.append('previous_observation_in_future')
    if current.confirmations < min_confirmations:
        reasons.append('confirmations_below_threshold')
    if current.block_hash.lower() != previous.block_hash.lower():
        reorg.append('block_hash_changed')
    if current.block_height != previous.block_height:
        reorg.append('block_height_changed')
    if current.tip_height < previous.tip_height:
        reorg.append('tip_height_regressed')
    if current.confirmations < previous.confirmations:
        reorg.append('confirmations_regressed')
    if reorg:
        return FreshnessAssessment('reorg_suspected', tuple(reorg + reasons), max(0, int(age)))
    if reasons:
        return FreshnessAssessment('blocked', tuple(reasons), max(0, int(age)))
    if age > max_age_seconds:
        return FreshnessAssessment('stale', ('observation_expired',), int(age))
    return FreshnessAssessment('current_external_only', (), max(0, int(age)))
