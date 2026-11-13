"""Explicitly configured read-only evidence provider protocol.

No external HTTP calls are made implicitly. A real adapter must authenticate its
source, pin network, validate block inclusion and handle chain reorganizations.
"""
from typing import Protocol, Sequence
from .v33_engine import OutputEvidence, EvidenceError

class EvidenceProvider(Protocol):
    def outputs_for_address(self, *, network: str, address: str) -> Sequence[OutputEvidence]: ...

class ProviderUnavailable(RuntimeError):
    pass

class DisabledProvider:
    def outputs_for_address(self, *, network: str, address: str):
        raise ProviderUnavailable('No audited BCH evidence provider configured; fail closed')

class FixtureProvider:
    """Tests only. Do not use to assert production settlement."""
    def __init__(self, outputs):
        self._outputs = tuple(outputs)
        if not all(isinstance(item, OutputEvidence) for item in self._outputs):
            raise EvidenceError('invalid fixture')
    def outputs_for_address(self, *, network: str, address: str):
        return tuple(x for x in self._outputs if x.network == network and x.address == address)
