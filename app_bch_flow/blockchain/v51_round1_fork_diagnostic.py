"""Observed fork work diagnostics. NOT a canonical-chain proof; read-only."""
from .v51_electrum_b7 import compact_to_target

class ForkEvidenceError(ValueError): pass

def _num(value, label, limit):
    if type(value) is not int or not 0 <= value <= limit:
        raise ForkEvidenceError('invalid_'+label)
    return value

def _hash(value, label):
    if type(value) is not str or len(value)!=64 or any(c not in '0123456789abcdefABCDEF' for c in value):
        raise ForkEvidenceError('invalid_'+label)
    return value.lower()

def work_from_bits(bits):
    if type(bits) is not int: raise ForkEvidenceError('invalid_bits')
    try: target=compact_to_target(bits)
    except (ValueError,TypeError,OverflowError) as exc:
        raise ForkEvidenceError('invalid_bits') from exc
    if not 0 < target < (1<<256): raise ForkEvidenceError('invalid_target')
    return (1<<256)//(target+1)

def branch_work(bits):
    if type(bits) not in (tuple,list) or not 1 <= len(bits) <= 144:
        raise ForkEvidenceError('invalid_branch_length')
    return sum(work_from_bits(x) for x in bits)

def compare_branches(*,common_height,common_hash,left_tip_height,left_tip_hash,
                     left_work,right_tip_height,right_tip_hash,right_work):
    ch=_num(common_height,'common_height',100_000_000)
    lh=_num(left_tip_height,'left_tip_height',100_000_000)
    rh=_num(right_tip_height,'right_tip_height',100_000_000)
    cw=_hash(common_hash,'common_hash')
    a=_hash(left_tip_hash,'left_tip_hash')
    b=_hash(right_tip_hash,'right_tip_hash')
    lw=_num(left_work,'left_work',(1<<320)-1)
    rw=_num(right_work,'right_work',(1<<320)-1)
    if lh<=ch or rh<=ch:raise ForkEvidenceError('tip_not_above_common')
    if cw in (a,b):raise ForkEvidenceError('tip_equals_common')
    if lw==0 or rw==0:raise ForkEvidenceError('zero_work')
    if a==b and (lh!=rh or lw!=rw):raise ForkEvidenceError('contradictory_same_tip')
    result='equal_observed_work' if lw==rw else ('left_more_observed_work' if lw>rw else 'right_more_observed_work')
    return {'schema':'bchflow.v51.r1.fork','comparison':result,
            'observed_reorg_depth_left':lh-ch,'observed_reorg_depth_right':rh-ch,
            'observed_work_difference':str(abs(lw-rw)),
            'canonical_chain_verified':False,'provider_independence_verified':False,
            'chainwork_authenticated':False,'bch_consensus_verified':False,
            'settlement_authorized':False,'payment_created':False}
