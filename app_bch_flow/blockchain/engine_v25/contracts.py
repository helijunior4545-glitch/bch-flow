"""Immutable, provider-neutral observation contracts. Never payment proof."""
from dataclasses import dataclass

@dataclass(frozen=True)
class Outpoint:
    txid: str
    vout: int
    satoshis: int
    confirmations: int

@dataclass(frozen=True)
class Snapshot:
    provider: str
    address: str
    network: str
    outpoints: tuple[Outpoint, ...]
    # These flags are intentionally always false in this observation layer.
    verified_payment: bool = False
    verified_balance: bool = False
    settlement_authorized: bool = False

@dataclass(frozen=True)
class Result:
    state: str  # OBSERVED, DEGRADED, CONFLICT, UNAVAILABLE, DISABLED
    address: str
    network: str
    snapshots: tuple[Snapshot, ...]
    errors: tuple[tuple[str, str], ...]
    matching_providers: tuple[str, ...]
    # Agreement is only provider consistency, NOT independent chain verification.
    provider_agreement: bool = False
    verified_payment: bool = False
    settlement_authorized: bool = False
