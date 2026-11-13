"""127 distinct financial-state and evidence-boundary regression scenarios.

This is a non-settling regression suite; it does not simulate database concurrency,
transaction rollback, crash recovery, or live provider independence.
"""
import unittest
from app_bch_flow.payments.state_machine import ALLOWED, transition
from app_bch_flow.blockchain.v33_engine import OutputEvidence, evaluate_invoice

ADDRESS="bitcoincash:qround3fixture"
TX="a"*64
BLOCK="b"*64

class Round3FinancialSafety(unittest.TestCase):
    pass

def register(label, number, fn):
    fn.__name__="test_%s_%03d"%(label,number)
    setattr(Round3FinancialSafety,fn.__name__,fn)

# All 18 currently permitted transitions: each returns only the requested state.
VALID=sorted((source,target) for source,targets in ALLOWED.items() for target in targets)
assert len(VALID)==18, "State machine changed: re-audit transition coverage"
for index,(source,target) in enumerate(VALID):
    def check(self,source=source,target=target):
        before={k:frozenset(v) for k,v in ALLOWED.items()}
        self.assertEqual(transition(source,target),target)
        self.assertEqual(ALLOWED,before)
    register("valid_transition",index,check)

# 49 explicitly forbidden transitions, prioritizing terminal and unsafe reversals.
INVALID=sorted((source,target) for source in ALLOWED for target in ALLOWED
               if target not in ALLOWED[source])
assert len(INVALID)==63
selected=sorted(INVALID,key=lambda p:(
    0 if p[0] in ("expired","cancelled") else
    1 if p[1] in ("confirmed","created") else 2,p))
selected=selected[:49]
assert len(set(selected))==49
for index,(source,target) in enumerate(selected):
    def check(self,source=source,target=target):
        with self.assertRaises(ValueError):
            transition(source,target)
    register("forbidden_transition",index,check)

def evidence(amount,confirmations=1,address=ADDRESS):
    return OutputEvidence(txid=TX,vout=0,address=address,satoshis=amount,
                          network="mainnet",confirmations=confirmations,
                          block_hash=BLOCK if confirmations else "")

def observe(outputs,required,minimum=1,exclusive=True):
    return evaluate_invoice(invoice_address=ADDRESS,network="mainnet",
                            required_satoshis=required,outputs=outputs,
                            min_confirmations=minimum,address_exclusive=exclusive)

# 20 partial amounts: insufficient satoshis cannot become eligible for review.
for index in range(20):
    required=1000+index*137
    amount=required-1-index
    def check(self,required=required,amount=amount):
        result=observe([evidence(amount)],required)
        self.assertEqual(result.status,"partial")
        self.assertEqual(result.observed_satoshis,amount)
        self.assertEqual(result.confirmed_satoshis,amount)
        self.assertNotEqual(result.status,"eligible_for_review")
    register("partial_amount",index,check)

# 20 confirmation thresholds: observed full value but below threshold.
for index in range(20):
    minimum=index+2
    confirmations=minimum-1
    def check(self,minimum=minimum,confirmations=confirmations):
        result=observe([evidence(1000,confirmations)],1000,minimum)
        self.assertEqual(result.status,"confirming")
        self.assertEqual(result.observed_satoshis,1000)
        self.assertEqual(result.confirmed_satoshis,0)
    register("insufficient_confirmations",index,check)

# 20 exact-or-overpaid observations without proven exclusivity stay unattributed.
for index in range(20):
    amount=1000+index*103
    def check(self,amount=amount):
        result=observe([evidence(amount)],1000,exclusive=False)
        self.assertEqual(result.status,"unattributed")
        self.assertEqual(result.confirmed_satoshis,amount)
        self.assertNotEqual(result.status,"eligible_for_review")
    register("no_address_exclusivity",index,check)
