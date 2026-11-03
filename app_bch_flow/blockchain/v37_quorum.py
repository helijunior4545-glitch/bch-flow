"""V3.7: fail-closed comparison of TWO external BCH providers. Not consensus verification."""
import os
from dataclasses import dataclass
from urllib.parse import urlsplit
from .v34_blockbook import BlockbookReadOnlyProvider, NetworkReadError, _config
from .v33_engine import OutputEvidence

class QuorumError(ValueError):
    pass

@dataclass(frozen=True)
class QuorumReport:
    status: str
    outputs: tuple
    first_count: int
    second_count: int
    reason: str


def _secondary_url():
    if os.getenv('BCHFLOW_V37_ENABLE_SECONDARY') != '1':
        raise QuorumError('Secondary provider disabled')
    base = os.getenv('BCHFLOW_V37_SECONDARY_BLOCKBOOK_URL', '').strip().rstrip('/')
    allowed = {h.strip().lower() for h in os.getenv('BCHFLOW_V37_SECONDARY_ALLOWED_HOSTS', '').split(',') if h.strip()}
    parsed = urlsplit(base)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.hostname.lower() not in allowed
        or parsed.username or parsed.password or parsed.query or parsed.fragment
        or parsed.path not in ('', '/') or parsed.port not in (None, 443)):
        raise QuorumError('Secondary HTTPS endpoint or allowlist invalid')
    first = urlsplit(_config())
    if parsed.hostname.lower() == first.hostname.lower():
        raise QuorumError('Provider hostnames must differ')
    return base

class SecondaryBlockbookProvider(BlockbookReadOnlyProvider):
    def __init__(self, **kwargs):
        secondary = _secondary_url()
        super().__init__(**kwargs)
        self.base = secondary


def compare_evidence(first, second, *, min_confirmations=1):
    """Compare complete output sets; never return trusted settlement evidence.

    A mismatch, missing output, zero confirmations, or block disagreement fails closed.
    Confirmation heights can advance during reads; allow at most one difference.
    """
    if type(min_confirmations) is not int or not 1 <= min_confirmations <= 100:
        raise QuorumError('Invalid confirmation policy')
    def indexed(items):
        if not isinstance(items, (tuple, list)) or len(items) > 5000:
            raise QuorumError('Invalid evidence collection')
        result = {}
        for item in items:
            if not isinstance(item, OutputEvidence):
                raise QuorumError('Invalid output evidence')
            key = (item.network, item.txid, item.vout)
            if key in result:
                raise QuorumError('Duplicate outpoint')
            result[key] = item
        return result
    a, b = indexed(first), indexed(second)
    if not a or not b:
        return QuorumReport('inconclusive', (), len(a), len(b), 'No outputs on both providers')
    if a.keys() != b.keys():
        return QuorumReport('disagreement', (), len(a), len(b), 'Different outpoint sets')
    for key in a:
        x, y = a[key], b[key]
        if (x.address, x.satoshis, x.network) != (y.address, y.satoshis, y.network):
            return QuorumReport('disagreement', (), len(a), len(b), 'Different output values or addresses')
        if x.confirmations < min_confirmations or y.confirmations < min_confirmations:
            return QuorumReport('inconclusive', (), len(a), len(b), 'Insufficient confirmations')
        if not x.block_hash or x.block_hash != y.block_hash:
            return QuorumReport('disagreement', (), len(a), len(b), 'Different block hashes')
        if abs(x.confirmations-y.confirmations) > 1:
            return QuorumReport('disagreement', (), len(a), len(b), 'Confirmation counts diverge')
    return QuorumReport('corroborated_external', tuple(a[k] for k in sorted(a)), len(a), len(b),
                        'Two external APIs agree; NOT independent consensus verification or settlement')


def probe_two_providers(*, network, address, min_confirmations=1, primary=None, secondary=None):
    if network != 'mainnet':
        raise QuorumError('Only BCH mainnet supported')
    # Constructing providers verifies opt-in and explicit endpoint configuration.
    if primary is None:
        primary = BlockbookReadOnlyProvider(network=network)
    if secondary is None:
        secondary = SecondaryBlockbookProvider(network=network)
    if primary is secondary:
        raise QuorumError('Same provider instance prohibited')
    try:
        a = primary.outputs_for_address(network=network, address=address)
        b = secondary.outputs_for_address(network=network, address=address)
    except NetworkReadError as exc:
        raise QuorumError('Provider read failed; no evidence accepted') from exc
    return compare_evidence(a, b, min_confirmations=min_confirmations)
