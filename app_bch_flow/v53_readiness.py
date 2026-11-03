#!/usr/bin/env python3
"""V5.3 consolidated conservative readiness report. No database access, no writes."""
import ast,hashlib,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parent
BASE=ROOT

def main():
    checks=[]
    def add(name,status,detail):checks.append({'id':name,'status':status,'detail':detail})
    required=['blockchain/v43_outpoint_reservation.py','blockchain/v45_settlement_policy.py','blockchain/v51_asert_b8.py','blockchain/v51_asert_b81.py','blockchain/v51_asert_b82.py','models/finance.py','payments/state_machine.py']
    for rel in required:
        path=BASE/rel
        add('source_'+rel,'PRESENT' if path.is_file() else 'FAIL',hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else 'missing')
    try:
        import re
        source=(BASE/'payments/state_machine.py').read_text()
        model=(BASE/'models/finance.py').read_text()
        tree=ast.parse(source)
        assign=next(n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='ALLOWED' for t in n.targets))
        allowed={node.value for key,value in zip(assign.value.keys,assign.value.values) for node in [key] if isinstance(node,ast.Constant)}
        match=re.search(r'PAYMENT_STATES\s*=\s*(\[[^\n]+\])',model)
        states={a for a,b in ast.literal_eval(match.group(1))}
        add('payment_state_alignment','PASS' if allowed==states else 'REVIEW',{'machine':sorted(allowed),'model':sorted(states),'only_machine':sorted(allowed-states),'only_model':sorted(states-allowed)})
    except Exception as exc:add('payment_state_alignment','REVIEW',str(exc))
    for name,detail in [
        ('reservation_real_concurrency','Run python manage.py test app_bch_flow.tests.test_v53_integrated --verbosity 2; this static report cannot attest runtime outcome.'),
        ('crash_recovery','Atomic rollback tests are not process-crash injection or durable replay.'),
        ('asert_mainnet_vectors','Independent authenticated historical BCH reference vectors not provided.'),
        ('authenticated_anchor','No independently authenticated anchor evidence provided.'),
        ('canonical_chain','No authenticated canonical-chain selection proof.'),
        ('provider_independence','No independent operator/provenance attestation.'),
        ('reorg_live','No live adversarial reorganization validation.'),
        ('end_to_end_settlement','No end-to-end safe settlement authorization established.')]:add(name,'NOT_PROVEN',detail)
    add('settlement_release','BLOCKED','No code path in this installer authorizes settlement.')
    report={'schema':'bchflow.v53.consolidated_readiness','read_only':True,'settlement_authorized':False,'checks':checks}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print('\nRESULT: settlement BLOCKED; static audit cannot establish financial readiness.')
if __name__=='__main__':main()
