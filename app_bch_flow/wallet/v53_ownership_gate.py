"""BCH Flow V5.3-A: read-only wallet ownership policy.

This is a security gate, NOT a cryptographic signature verifier.  A database
verified_at value alone is insufficient proof of key ownership.  Until a
vetted BCH message-signature verifier and one-time challenge protocol are
integrated, authorization remains fail-closed.
"""
from dataclasses import dataclass
from enum import Enum

class WalletDecision(str, Enum):
    BLOCKED = "blocked"
    READY_FOR_PROOF = "ready_for_proof"

@dataclass(frozen=True)
class WalletAssessment:
    decision: WalletDecision
    reason: str
    can_receive_real_funds: bool = False
    can_sign: bool = False
    can_broadcast: bool = False
    can_settle: bool = False

def assess_wallet_connection(connection, *, expected_organization_id=None,
                             expected_network="mainnet") -> WalletAssessment:
    """Check metadata without reading keys or mutating DB; NEVER grants spending."""
    if connection is None:
        return WalletAssessment(WalletDecision.BLOCKED, "wallet_connection_missing")
    if getattr(connection, "revoked_at", None) is not None:
        return WalletAssessment(WalletDecision.BLOCKED, "wallet_connection_revoked")
    if getattr(connection, "network", None) != expected_network:
        return WalletAssessment(WalletDecision.BLOCKED, "wallet_network_mismatch")
    if expected_organization_id is not None and str(getattr(connection, "organization_id", "")) != str(expected_organization_id):
        return WalletAssessment(WalletDecision.BLOCKED, "wallet_organization_mismatch")
    if not getattr(connection, "public_address", None):
        return WalletAssessment(WalletDecision.BLOCKED, "wallet_address_missing")
    # A field named verified_at is not cryptographic proof.  Do not trust it.
    return WalletAssessment(WalletDecision.READY_FOR_PROOF, "cryptographic_ownership_proof_required")

def authorize_real_receive(*args, **kwargs):
    """Reserved entry point.  Fail closed until proof verification is deployed."""
    return WalletAssessment(WalletDecision.BLOCKED, "v53_cryptographic_proof_not_implemented")
