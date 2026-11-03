"""V3.3 deterministic, fail-closed BCH observation engine. No network access or DB writes.

Evidence must come from a separately audited, authenticated blockchain provider.
An address alone cannot uniquely attribute simultaneous invoices sharing it.
"""
from dataclasses import dataclass
import re
from typing import Iterable

TXID = re.compile(r"^[a-f0-9]{64}$")
HASH = re.compile(r"^[a-f0-9]{64}$")
NETWORKS = frozenset(("mainnet", "chipnet"))

class EvidenceError(ValueError):
    pass

@dataclass(frozen=True)
class OutputEvidence:
    txid: str
    vout: int
    address: str
    satoshis: int
    network: str
    confirmations: int
    block_hash: str = ""

    def __post_init__(self):
        if not isinstance(self.txid, str) or not TXID.fullmatch(self.txid):
            raise EvidenceError("invalid txid")
        if type(self.vout) is not int or not 0 <= self.vout <= 100000:
            raise EvidenceError("invalid output index")
        if not isinstance(self.address, str) or not self.address:
            raise EvidenceError("invalid output address")
        if type(self.satoshis) is not int or not 0 < self.satoshis <= 2100000000000000:
            raise EvidenceError("invalid satoshi value")
        if self.network not in NETWORKS:
            raise EvidenceError("invalid network")
        if type(self.confirmations) is not int or not 0 <= self.confirmations <= 10000000:
            raise EvidenceError("invalid confirmation count")
        if self.block_hash and (not isinstance(self.block_hash, str) or not HASH.fullmatch(self.block_hash)):
            raise EvidenceError("invalid block hash")
        if self.confirmations > 0 and not self.block_hash:
            raise EvidenceError("confirmed output requires block hash")
        if self.confirmations == 0 and self.block_hash:
            raise EvidenceError("unconfirmed output must not claim a block hash")

@dataclass(frozen=True)
class Observation:
    status: str
    observed_satoshis: int
    confirmed_satoshis: int
    required_satoshis: int
    matched_outputs: int
    reason: str

def evaluate_invoice(*, invoice_address: str, network: str, required_satoshis: int,
                     outputs: Iterable[OutputEvidence], min_confirmations: int = 1,
                     address_exclusive: bool = False) -> Observation:
    """Evaluate trusted output evidence. Never updates invoices or returns 'paid'.

    address_exclusive must be proven by the caller using a unique allocation policy.
    When false, evidence is only informational, even if the amounts match.
    """
    if network not in NETWORKS or not isinstance(invoice_address, str) or not invoice_address:
        raise EvidenceError("invalid invoice network/address")
    if type(required_satoshis) is not int or required_satoshis <= 0:
        raise EvidenceError("invalid invoice amount")
    if type(min_confirmations) is not int or not 1 <= min_confirmations <= 100:
        raise EvidenceError("invalid confirmation policy")
    seen = set()
    observed = confirmed = count = 0
    for item in outputs:
        if not isinstance(item, OutputEvidence):
            raise EvidenceError("untrusted evidence shape")
        key = (item.network, item.txid, item.vout)
        if key in seen:
            raise EvidenceError("duplicate transaction output")
        seen.add(key)
        if item.network != network or item.address != invoice_address:
            continue
        count += 1
        observed += item.satoshis
        if item.confirmations >= min_confirmations:
            confirmed += item.satoshis
    if not address_exclusive:
        return Observation('unattributed', observed, confirmed, required_satoshis, count,
                           'Address exclusivity not established; cannot attribute payment to invoice')
    if confirmed >= required_satoshis:
        status, reason = 'eligible_for_review', 'Confirmed amount meets threshold; independent provider verification required'
    elif observed >= required_satoshis:
        status, reason = 'confirming', 'Amount observed; insufficient confirmations'
    elif observed:
        status, reason = 'partial', 'Observed amount below requested amount'
    else:
        status, reason = 'not_seen', 'No matching outputs in supplied evidence'
    return Observation(status, observed, confirmed, required_satoshis, count, reason)
