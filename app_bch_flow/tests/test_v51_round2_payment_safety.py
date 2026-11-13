"""Round 2: 120 parameterized financial evidence and attribution safety tests.

These test the existing read-only v33 observation/provider boundary. No settlement.
"""
import unittest
from app_bch_flow.blockchain.v33_engine import OutputEvidence, EvidenceError, evaluate_invoice
from app_bch_flow.blockchain.v33_provider import FixtureProvider, DisabledProvider, ProviderUnavailable

ADDRESS="bitcoincash:qtest-address"
OTHER="bitcoincash:qother-address"
TX="a"*64
def output(**changes):
    kw=dict(txid=TX,vout=0,address=ADDRESS,satoshis=1000,
            network="mainnet",confirmations=1,block_hash="b"*64)
    kw.update(changes)
    return OutputEvidence(**kw)
def observe(outputs,**changes):
    kw=dict(invoice_address=ADDRESS,network="mainnet",required_satoshis=1000,
            outputs=outputs,min_confirmations=1,address_exclusive=False)
    kw.update(changes)
    return evaluate_invoice(**kw)

class Round2PaymentSafety(unittest.TestCase):pass
def register(group,index,fn):
    fn.__name__="test_%s_%02d"%(group,index)
    setattr(Round2PaymentSafety,fn.__name__,fn)

# Group 1: malformed/unsafe evidence cannot enter financial observations.
BAD_OUTPUTS=[
    ("txid",""),("txid","A"*64),("txid","z"*64),("txid",None),
    ("vout",-1),("vout",True),("vout",100001),("vout","0"),
    ("address",""),("address",None),
    ("satoshis",0),("satoshis",-1),("satoshis",True),("satoshis",2100000000000001),
    ("network","testnet"),("network",None),
    ("confirmations",-1),("confirmations",True),("confirmations",10000001),
    ("block_hash","f"*63),
]
assert len(BAD_OUTPUTS)==20
for i,(key,value) in enumerate(BAD_OUTPUTS):
    def case(self,key=key,value=value):
        with self.assertRaises(EvidenceError):output(**{key:value})
    register("malformed_evidence",i,case)

# Group 2: duplicate outpoints cannot be counted twice, even if metadata differs.
for i in range(20):
    amount=1+i*101
    def case(self,amount=amount):
        first=output(satoshis=amount)
        duplicate=output(satoshis=amount+1,confirmations=2)
        with self.assertRaisesRegex(EvidenceError,"duplicate"):
            observe([first,duplicate],address_exclusive=True)
    register("duplicate_outpoint",i,case)

# Group 3: amount alone never establishes attribution when address exclusivity is absent.
for i in range(20):
    amount=1000+i*500
    def case(self,amount=amount):
        result=observe([output(satoshis=amount)],required_satoshis=1000)
        self.assertEqual(result.status,"unattributed")
        self.assertEqual(result.confirmed_satoshis,amount)
        self.assertNotEqual(result.status,"eligible_for_review")
    register("no_exclusivity",i,case)

# Group 4: insufficient confirmations cannot become eligible for review.
for i in range(20):
    required=1+i*97
    def case(self,required=required):
        result=observe([output(satoshis=required,confirmations=0,block_hash="")],
                       required_satoshis=required,address_exclusive=True,
                       min_confirmations=1)
        self.assertEqual(result.status,"confirming")
        self.assertEqual(result.confirmed_satoshis,0)
    register("unconfirmed",i,case)

# Group 5: foreign address/network outputs must never count toward the invoice.
for i in range(20):
    amount=1000+i*71
    def case(self,amount=amount):
        foreign=output(address=OTHER,satoshis=amount)
        result=observe([foreign],address_exclusive=True)
        self.assertEqual(result.status,"not_seen")
        self.assertEqual(result.observed_satoshis,0)
        chip=output(network="chipnet",satoshis=amount)
        result2=observe([chip],address_exclusive=True)
        self.assertEqual(result2.status,"not_seen")
        self.assertEqual(result2.confirmed_satoshis,0)
    register("foreign_output",i,case)

# Group 6: fixture provider is filtered and immutable; no settlement is implied.
for i in range(20):
    amount=1000+i*113
    def case(self,amount=amount):
        fixture=FixtureProvider([
            output(satoshis=amount),
            output(txid="c"*64,address=OTHER,satoshis=amount+1),
            output(txid="d"*64,network="chipnet",satoshis=amount+2),
        ])
        matched=fixture.outputs_for_address(network="mainnet",address=ADDRESS)
        self.assertIsInstance(matched,tuple)
        self.assertEqual(len(matched),1)
        self.assertEqual(matched[0].satoshis,amount)
        self.assertEqual(observe(matched).status,"unattributed")
        with self.assertRaises(ProviderUnavailable):
            DisabledProvider().outputs_for_address(network="mainnet",address=ADDRESS)
    register("provider_boundary",i,case)
