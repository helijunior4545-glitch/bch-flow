#!/usr/bin/env python3
"""V5.6 executable guard audit; no network, DB writes, or settlement authorization."""
import ast
import hashlib
import json
from pathlib import Path

APP = Path(__file__).resolve().parent
SOURCES = {
    'machine': APP / 'payments/state_machine.py',
    'finance': APP / 'models/finance.py',
    'policy': APP / 'blockchain/v45_settlement_policy.py',
    'chain': APP / 'blockchain/v46_chain_verification.py',
    'reservation': APP / 'blockchain/v43_outpoint_reservation.py',
    'reconciliation': APP / 'blockchain/v35_reconciliation.py',
    'evidence': APP / 'blockchain/v42_evidence_ledger.py',
    'workspace': APP / 'views/v3_workspace.py',
}

def inspect():
    checks=[]
    for name,path in SOURCES.items():
        if not path.is_file():
            checks.append({'id':name,'status':'FAIL','reason':'missing source'})
            continue
        raw=path.read_bytes()
        try:
            tree=ast.parse(raw, filename=str(path))
        except (SyntaxError,UnicodeError) as exc:
            checks.append({'id':name,'status':'FAIL','reason':str(exc)[:200]})
            continue
        methods=sorted({n.name for n in ast.walk(tree) if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef))})
        checks.append({'id':name,'status':'PRESENT','sha256':hashlib.sha256(raw).hexdigest(),'functions':methods})
    checks.extend([
        {'id':'process_crash_recovery','status':'NOT_PROVEN'},
        {'id':'authenticated_consensus_and_chain','status':'NOT_PROVEN'},
        {'id':'independent_provider_provenance','status':'NOT_PROVEN'},
        {'id':'reorg_live','status':'NOT_PROVEN'},
        {'id':'end_to_end_settlement','status':'NOT_PROVEN'},
        {'id':'settlement_release','status':'BLOCKED'},
    ])
    return {'schema':'bchflow.v56.guard_inventory','read_only':True,'database_access':False,'settlement_authorized':False,'checks':checks,
            'note':'Presence and unit tests are not proof of production execution paths or consensus.'}

if __name__=='__main__':
    print(json.dumps(inspect(),indent=2,ensure_ascii=False))
