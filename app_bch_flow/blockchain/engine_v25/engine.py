"""Explicitly injected providers; no implicit network access or settlement."""
import re
from collections import Counter
from app_bch_flow.core.address_validation import validate_cashaddr
from .contracts import Outpoint, Snapshot, Result

_TXID = re.compile(r"[0-9a-fA-F]{64}\Z")
MAX_UTXOS = 1000
MAX_SATS = 21_000_000 * 100_000_000

class ProviderFailure(Exception):
    def __init__(self, code="provider_error"):
        self.code = code if code in {
            "provider_error", "provider_timeout", "provider_auth_error",
            "provider_invalid_response", "provider_wrong_network",
            "provider_not_synced", "provider_not_configured",
        } else "provider_error"
        super().__init__(self.code)

def validate_snapshot(snapshot, address):
    if not isinstance(snapshot, Snapshot) or snapshot.address != address or snapshot.network != "mainnet":
        raise ProviderFailure("provider_invalid_response")
    if not isinstance(snapshot.provider, str) or not snapshot.provider or len(snapshot.provider) > 64:
        raise ProviderFailure("provider_invalid_response")
    if type(snapshot.outpoints) is not tuple or len(snapshot.outpoints) > MAX_UTXOS:
        raise ProviderFailure("provider_invalid_response")
    if snapshot.verified_payment or snapshot.verified_balance or snapshot.settlement_authorized:
        raise ProviderFailure("provider_invalid_response")
    seen = set()
    for p in snapshot.outpoints:
        if (not isinstance(p, Outpoint) or not isinstance(p.txid, str) or not _TXID.fullmatch(p.txid)
            or type(p.vout) is not int or not 0 <= p.vout <= 100000
            or type(p.satoshis) is not int or not 0 < p.satoshis <= MAX_SATS
            or type(p.confirmations) is not int or not 0 <= p.confirmations <= 10000000):
            raise ProviderFailure("provider_invalid_response")
        key = (p.txid.lower(), p.vout)
        if key in seen:
            raise ProviderFailure("provider_invalid_response")
        seen.add(key)
    return snapshot

def _fingerprint(snapshot):
    return tuple(sorted((p.txid.lower(), p.vout, p.satoshis, p.confirmations) for p in snapshot.outpoints))

def observe(address, providers=(), *, minimum_agreement=2, enabled=False):
    """Manual, read-only observation. Providers are objects with .name and .observe(address).

    No implicit provider discovery, no DB writes, no automatic fallback from disagreement.
    Exact confirmation counts may differ by block height; disagreement is conservative.
    """
    address = validate_cashaddr(address, "mainnet")
    if type(minimum_agreement) is not int or minimum_agreement < 2:
        raise ValueError("minimum_agreement must be >= 2")
    if not enabled:
        return Result("DISABLED", address, "mainnet", (), (), ())
    snapshots, errors, names = [], [], set()
    for provider in providers:
        name = getattr(provider, "name", "")
        if not isinstance(name, str) or not name or len(name) > 64 or name in names:
            raise ValueError("Provider names must be unique and nonempty")
        names.add(name)
        try:
            snapshot = validate_snapshot(provider.observe(address), address)
            if snapshot.provider != name:
                raise ProviderFailure("provider_invalid_response")
            snapshots.append(snapshot)
        except ProviderFailure as exc:
            errors.append((name, exc.code))
        except Exception:
            # Do not leak provider exceptions, credentials or raw responses.
            errors.append((name, "provider_error"))
    if not snapshots:
        return Result("UNAVAILABLE", address, "mainnet", (), tuple(errors), ())
    groups = {}
    for snapshot in snapshots:
        groups.setdefault(_fingerprint(snapshot), []).append(snapshot.provider)
    matching = max(groups.values(), key=len)
    agreement = len(matching) >= minimum_agreement and len(matching) == len(snapshots) and not errors
    state = "OBSERVED" if agreement else ("CONFLICT" if len(groups) > 1 else "DEGRADED")
    return Result(state, address, "mainnet", tuple(snapshots), tuple(errors), tuple(matching), agreement)
