"""BCH Flow V5.4: fail-closed source-to-state evidence audit; no DB access."""
import ast
import hashlib
import json
import pathlib
import re
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / 'app_bch_flow'


def literal_states(path, variable):
    tree = ast.parse(path.read_text(encoding='utf-8'), filename=str(path))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == variable for t in node.targets):
            if isinstance(node.value, (ast.List, ast.Tuple)):
                return {str(elt.elts[0].value) for elt in node.value.elts if isinstance(elt, (ast.Tuple, ast.List)) and elt.elts and isinstance(elt.elts[0], ast.Constant)}
            if isinstance(node.value, ast.Dict):
                return {k.value for k in node.value.keys if isinstance(k, ast.Constant) and isinstance(k.value, str)}
    raise ValueError(f'Cannot safely parse {variable}: {path}')


def audit():
    findings = []
    paths = {'machine': APP/'payments/state_machine.py', 'finance': APP/'models/finance.py',
             'reservation': APP/'blockchain/v43_outpoint_reservation.py',
             'settlement': APP/'blockchain/v45_settlement_policy.py'}
    for name, path in paths.items():
        if not path.is_file():
            findings.append({'id': f'source_{name}', 'status': 'FAIL', 'reason': 'Required file missing'})
        else:
            findings.append({'id': f'source_{name}', 'status': 'PRESENT', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    if paths['machine'].exists() and paths['finance'].exists():
        try:
            machine = literal_states(paths['machine'], 'ALLOWED')
            model = literal_states(paths['finance'], 'PAYMENT_STATES')
            findings.append({'id': 'payment_state_alignment', 'status': 'REVIEW' if machine != model else 'PASS',
                             'machine': sorted(machine), 'model': sorted(model),
                             'only_machine': sorted(machine-model), 'only_model': sorted(model-machine),
                             'reason': 'Different domains may be intentional; trace all call sites before changing either.' if machine != model else 'Same enumerated states; semantics still require review.'})
        except Exception as exc:
            findings.append({'id': 'payment_state_alignment', 'status': 'NOT_PROVEN', 'reason': str(exc)})
    usage=[]
    for file in sorted(APP.rglob('*.py')):
        if any(part in {'tests','migrations','__pycache__'} for part in file.relative_to(APP).parts):
            continue
        try:
            tree=ast.parse(file.read_text(encoding='utf-8'), filename=str(file))
        except (SyntaxError, UnicodeError) as exc:
            usage.append({'file':str(file.relative_to(APP)), 'parse_error':str(exc)})
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                fn=node.func
                name=fn.id if isinstance(fn,ast.Name) else fn.attr if isinstance(fn,ast.Attribute) else None
                if name in {'transition','reserve_outpoint','save','update','bulk_update','bulk_create'}:
                    if name in {'save','update','bulk_update','bulk_create'}:
                        snippet=ast.get_source_segment(file.read_text(encoding='utf-8'),node) or ''
                        if not any(x in snippet.lower() for x in ('status','payment','invoice','reservation')):
                            continue
                    usage.append({'file':str(file.relative_to(APP)), 'line':node.lineno,'call':name})
    findings.append({'id':'potential_financial_mutation_call_sites','status':'REVIEW','locations':usage,
                     'reason':'Static candidates only; manual dataflow review required.'})
    for key in ('crash_recovery_process_kill','authenticated_asert_anchor','canonical_chain_independent_proof',
                'independent_provider_provenance','live_reorg_fault_injection','end_to_end_settlement'):
        findings.append({'id':key,'status':'NOT_PROVEN','reason':'Not established by static source analysis.'})
    findings.append({'id':'settlement_release','status':'BLOCKED','reason':'Audit cannot authorize settlement.'})
    return {'schema':'bchflow.v54.source_evidence','timestamp_utc':datetime.now(timezone.utc).isoformat(),
            'read_only':True,'database_access':False,'settlement_authorized':False,'checks':findings}


if __name__=='__main__':
    print(json.dumps(audit(),ensure_ascii=False,indent=2))
