"""B.8.2 read-only historical mainnet anchor context and provenance gate.

Height 661647 is the known mainnet pre-ASERT anchor; height alone is NOT authentication.
This module NEVER permits settlement or canonical-chain claims.
"""
from .v51_asert_b8 import next_asert_bits, ASERTError

MAINNET_ANCHOR_HEIGHT = 661647
MAINNET_FIRST_ASERT_HEIGHT = 661648

class MainnetAnchorError(ValueError):
    pass

def historical_asert_diagnostic(*, anchor_height, anchor_parent_time, anchor_bits,
                                evaluation_height, evaluation_time, observed_next_bits,
                                anchor_hash, anchor_parent_hash,
                                independent_anchor_hash=None):
    if type(anchor_height) is not int or anchor_height != MAINNET_ANCHOR_HEIGHT:
        raise MainnetAnchorError('wrong_mainnet_anchor_height')
    if type(evaluation_height) is not int or evaluation_height < MAINNET_ANCHOR_HEIGHT:
        raise MainnetAnchorError('invalid_evaluation_height')
    if type(observed_next_bits) is not int:
        raise MainnetAnchorError('invalid_observed_bits')
    for label, value in (('anchor_hash',anchor_hash),('anchor_parent_hash',anchor_parent_hash)):
        if type(value) is not str or len(value) != 64 or any(c not in '0123456789abcdefABCDEF' for c in value):
            raise MainnetAnchorError('invalid_'+label)
    if independent_anchor_hash is not None and (
        type(independent_anchor_hash) is not str or len(independent_anchor_hash) != 64
        or any(c not in '0123456789abcdefABCDEF' for c in independent_anchor_hash)
    ):
        raise MainnetAnchorError('invalid_independent_anchor_hash')
    if independent_anchor_hash is not None and independent_anchor_hash.lower() != anchor_hash.lower():
        raise MainnetAnchorError('independent_anchor_disagreement')
    try:
        expected = next_asert_bits(anchor_height=anchor_height,
            anchor_parent_time=anchor_parent_time, anchor_bits=anchor_bits,
            evaluation_height=evaluation_height, evaluation_time=evaluation_time)
    except (ASERTError, TypeError, ValueError) as exc:
        raise MainnetAnchorError('invalid_asert_context') from exc
    match = expected == observed_next_bits
    return {'schema':'bchflow.v51.b82.mainnet_anchor_diagnostic',
        'anchor_height':MAINNET_ANCHOR_HEIGHT,
        'first_asert_height':MAINNET_FIRST_ASERT_HEIGHT,
        'expected_next_bits':hex(expected), 'observed_next_bits':hex(observed_next_bits),
        'asert_bits_match':match,
        'claimed_anchor_hash':anchor_hash.lower(),
        'claimed_anchor_parent_hash':anchor_parent_hash.lower(),
        'two_supplied_anchor_hashes_agree':independent_anchor_hash is not None,
        'source_independence_verified':False, 'anchor_authenticated':False,
        'historical_provenance_verified':False, 'canonical_chain_verified':False,
        'bch_consensus_verified':False, 'invoice_attributed':False,
        'payment_created':False, 'settlement_authorized':False}
