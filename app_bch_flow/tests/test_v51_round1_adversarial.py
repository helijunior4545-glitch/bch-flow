"""120 deterministic adversarial checks. Distinct cases; no network or database writes."""
import unittest
from app_bch_flow.blockchain.v51_asert_b8 import next_asert_bits, ASERTError
from app_bch_flow.blockchain.v51_electrum_b7 import compact_to_target
from app_bch_flow.blockchain.v51_round1_fork_diagnostic import ForkEvidenceError,branch_work,work_from_bits,compare_branches

A=dict(anchor_height=700000,anchor_parent_time=1600000000,anchor_bits=0x1c0fffff)
F=dict(common_height=700000,common_hash="a"*64,left_tip_height=700010,
       left_tip_hash="b"*64,left_work=100,right_tip_height=700012,
       right_tip_hash="c"*64,right_work=200)
class Round1Tests(unittest.TestCase):pass
def add(name,func):
    func.__name__="test_"+name
    setattr(Round1Tests,func.__name__,func)

for i in range(20):
    delta=(i-10)*4321
    def check(self,delta=delta):
        args=dict(A,evaluation_height=700040,evaluation_time=1600024600+delta)
        bits=next_asert_bits(**args)
        self.assertEqual(bits,next_asert_bits(**args))
        self.assertGreater(compact_to_target(bits),0)
        later=next_asert_bits(**dict(args,evaluation_time=args['evaluation_time']+3600))
        self.assertLessEqual(compact_to_target(bits),compact_to_target(later))
    add("asert_timing_%02d"%i,check)

bad=[('anchor_height',v) for v in (None,True,-1,0,1.5)]
bad += [('evaluation_height',v) for v in (None,False,-1,1.5,'700000')]
bad += [('anchor_parent_time',v) for v in (None,True,-1,1.5,'1600000000')]
bad += [('evaluation_time',v) for v in (None,False,-1,1.5,'1600000000')]
assert len(bad)==20
for i,(key,value) in enumerate(bad):
    def check(self,key=key,value=value):
        args=dict(A,evaluation_height=700040,evaluation_time=1600024600)
        args[key]=value
        with self.assertRaises(ASERTError):next_asert_bits(**args)
    add("asert_invalid_%02d"%i,check)

for i in range(20):
    bits=(0x1c<<24)|(0x010000+i*0x100)
    def check(self,bits=bits):
        target=compact_to_target(bits)
        self.assertEqual(work_from_bits(bits),(1<<256)//(target+1))
        self.assertEqual(branch_work([bits,bits]),2*work_from_bits(bits))
    add("pow_work_%02d"%i,check)

bad_branches=[None,True,0,'abc',{},[],(),[True],[None],[-1],[0],
              [0x1d00ffff,False],[0x1d00ffff,None],[0x1d00ffff,-1],
              [0x1d00ffff,0],[0x1d00ffff,'0x1d00ffff'],
              [0x1d00ffff,1.5],[0x1d00ffff,True],
              [0x1d00ffff,0x1d800001],[0x1d00ffff,0x1e00ffff]]
assert len(bad_branches)==20
for i,seq in enumerate(bad_branches):
    def check(self,seq=seq):
        with self.assertRaises(ForkEvidenceError):branch_work(seq)
    add("branch_rejection_%02d"%i,check)

for i in range(20):
    left=100+i*101
    right=left+1 if i%3==0 else (left-1 if i%3==1 else left)
    def check(self,left=left,right=right):
        result=compare_branches(**dict(F,left_work=left,right_work=right))
        expected=('equal_observed_work' if left==right else
                  'left_more_observed_work' if left>right else 'right_more_observed_work')
        self.assertEqual(result['comparison'],expected)
        self.assertEqual(result['observed_work_difference'],str(abs(left-right)))
        for key in ('canonical_chain_verified','chainwork_authenticated',
                    'provider_independence_verified','bch_consensus_verified',
                    'settlement_authorized','payment_created'):
            self.assertIs(result[key],False)
    add("fork_comparison_%02d"%i,check)

for i in range(20):
    left=700001+i
    right=700020-i
    def check(self,left=left,right=right):
        result=compare_branches(**dict(F,left_tip_height=left,right_tip_height=right))
        self.assertEqual(result['observed_reorg_depth_left'],left-700000)
        self.assertEqual(result['observed_reorg_depth_right'],right-700000)
        self.assertFalse(result['settlement_authorized'])
    add("reorg_depth_%02d"%i,check)
