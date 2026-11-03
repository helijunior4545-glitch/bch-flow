"""V3.8 operational read-only diagnostics. External API agreement is not consensus."""
from dataclasses import dataclass, asdict
from urllib.parse import urlsplit
from .v34_blockbook import BlockbookReadOnlyProvider, NetworkReadError
from .v37_quorum import SecondaryBlockbookProvider, compare_evidence, QuorumError

class DiagnosticError(RuntimeError):
    pass

@dataclass(frozen=True)
class DiagnosticResult:
    status: str
    primary_host: str
    secondary_host: str
    primary_chain: str
    secondary_chain: str
    output_count: int
    reason: str

    def as_dict(self):
        return asdict(self)

def _chain_info(provider):
    data = provider._get('/api/v2', {})
    if not isinstance(data, dict):
        raise DiagnosticError('Invalid status schema')
    coin = data.get('coin')
    if not isinstance(coin, str) or coin.strip().lower() not in ('bitcoin cash', 'bitcoincash', 'bch'):
        raise DiagnosticError('Provider does not explicitly identify Bitcoin Cash')
    # Do not interpret provider claims as independently verified consensus.
    return coin

def diagnose(*, address, min_confirmations=2, primary=None, secondary=None):
    if not isinstance(address, str) or not address.strip():
        raise DiagnosticError('A real BCH CashAddr is required')
    if type(min_confirmations) is not int or not 1 <= min_confirmations <= 100:
        raise DiagnosticError('Invalid confirmation threshold')
    try:
        a = primary if primary is not None else BlockbookReadOnlyProvider(network='mainnet')
        b = secondary if secondary is not None else SecondaryBlockbookProvider(network='mainnet')
        if a is b:
            raise DiagnosticError('Provider instances must differ')
        ahost = urlsplit(getattr(a, 'base', '')).hostname or 'injected-primary'
        bhost = urlsplit(getattr(b, 'base', '')).hostname or 'injected-secondary'
        if ahost == bhost and ahost not in ('injected-primary', 'injected-secondary'):
            raise DiagnosticError('Provider hostnames must differ')
        chain_a = _chain_info(a)
        chain_b = _chain_info(b)
        first = a.outputs_for_address(network='mainnet', address=address)
        second = b.outputs_for_address(network='mainnet', address=address)
        report = compare_evidence(first, second, min_confirmations=min_confirmations)
        return DiagnosticResult(report.status, ahost, bhost, chain_a, chain_b,
                                len(report.outputs), report.reason)
    except (NetworkReadError, QuorumError, ValueError) as exc:
        raise DiagnosticError('Read-only provider diagnostics failed: '+str(exc)) from exc
