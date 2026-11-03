#!/usr/bin/env python3
"""BCH Flow V5.5: read-only, conservative static financial-flow map. No Django imports."""
import ast
import hashlib
import json
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path

APP = Path(__file__).resolve().parent
ROOT = APP.parent
ENTRY_WORDS = ('invoice', 'checkout', 'payment', 'webhook', 'observe', 'reconcile', 'confirm', 'settle', 'reservation', 'outpoint', 'chain', 'broadcast')
SINK_WORDS = ('save', 'create', 'update', 'delete', 'bulk_create', 'bulk_update', 'get_or_create', 'update_or_create', 'reserve_outpoint', 'transition', 'settle', 'confirm', 'mark_paid', 'credit', 'transfer')
SECURITY_WORDS = ('signature', 'proof', 'merkle', 'asert', 'anchor', 'canonical', 'consensus', 'confirmations', 'reorg', 'provider', 'idempot', 'tenant', 'organi', 'reserve', 'rollback')


def dotted(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        prefix = dotted(node.value)
        return (prefix + '.' if prefix else '') + node.attr
    return None


def scan():
    records = []
    failures = []
    for path in sorted(APP.rglob('*.py')):
        if any(p in {'tests', 'migrations', '__pycache__'} for p in path.relative_to(APP).parts):
            continue
        rel = path.relative_to(APP).as_posix()
        try:
            data = path.read_bytes()
            tree = ast.parse(data.decode('utf-8-sig'), filename=rel)
        except (OSError, UnicodeError, SyntaxError) as exc:
            failures.append({'file': rel, 'reason': type(exc).__name__ + ': ' + str(exc)[:180]})
            continue
        module = 'app_bch_flow.' + rel[:-3].replace('/', '.')
        imports = {}
        for n in ast.walk(tree):
            if isinstance(n, ast.Import):
                for alias in n.names:
                    imports[alias.asname or alias.name.split('.')[0]] = alias.name
            elif isinstance(n, ast.ImportFrom) and n.module:
                if n.level:
                    parts = module.split('.')[:-1]
                    up = n.level - 1
                    base = '.'.join(parts[:len(parts)-up]) if up <= len(parts) else ''
                    imported = base + '.' + n.module if base else n.module
                else:
                    imported = n.module
                for alias in n.names:
                    imports[alias.asname or alias.name] = imported + '.' + alias.name
        funcs = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        for fn in funcs:
            calls = []
            for node in ast.walk(fn):
                if isinstance(node, ast.Call):
                    name = dotted(node.func)
                    if name:
                        first, _, rest = name.partition('.')
                        resolved = imports.get(first, first) + ('.' + rest if rest else '')
                        calls.append({'line': node.lineno, 'name': name, 'resolved': resolved})
            qual = module + '.' + fn.name
            records.append({'id': qual, 'file': rel, 'line': fn.lineno,
                            'sha256': hashlib.sha256(data).hexdigest(),
                            'calls': sorted(calls, key=lambda c: (c['line'], c['name'])),
                            'entry_candidate': any(w in (rel + '.' + fn.name).lower() for w in ENTRY_WORDS)})
    return records, failures


def audit():
    records, failures = scan()
    byid = {r['id']: r for r in records}
    byshort = defaultdict(list)
    for r in records:
        byshort[r['id'].rsplit('.', 1)[-1]].append(r['id'])
    edges = []
    unresolved = []
    sinks = []
    security = []
    for r in records:
        for c in r['calls']:
            name = c['name'].rsplit('.', 1)[-1].lower()
            if any(w in name for w in SINK_WORDS):
                sinks.append({'source': r['id'], 'file': r['file'], 'line': c['line'], 'call': c['name'], 'classification': 'POTENTIAL_ONLY'})
            if any(w in name for w in SECURITY_WORDS):
                security.append({'source': r['id'], 'file': r['file'], 'line': c['line'], 'call': c['name'], 'classification': 'NAME_MATCH_ONLY'})
            resolved = c['resolved']
            if resolved in byid:
                edges.append({'from': r['id'], 'to': resolved, 'line': c['line'], 'confidence': 'RESOLVED_IMPORT'})
            elif c['name'] in byshort and len(byshort[c['name']]) == 1:
                edges.append({'from': r['id'], 'to': byshort[c['name']][0], 'line': c['line'], 'confidence': 'LOCAL_NAME_HEURISTIC'})
            elif any(w in name for w in SINK_WORDS) and len(unresolved) < 500:
                unresolved.append({'source': r['id'], 'line': c['line'], 'call': c['name']})
    adj = defaultdict(set)
    for e in edges:
        adj[e['from']].add(e['to'])
    entries = sorted(r['id'] for r in records if r['entry_candidate'])
    reachable = set(entries)
    todo = deque(entries)
    while todo:
        for dest in adj[todo.popleft()]:
            if dest not in reachable:
                reachable.add(dest)
                todo.append(dest)
    reachable_sinks = [s for s in sinks if s['source'] in reachable]
    findings = [
        {'id': 'source_parse', 'status': 'REVIEW' if failures else 'PASS', 'parse_failures': failures},
        {'id': 'entrypoint_coverage', 'status': 'REVIEW', 'reason': 'Heuristic names; URL routing, dynamic dispatch, Celery and signals not proven'},
        {'id': 'financial_mutation_paths', 'status': 'REVIEW', 'reason': 'Potential calls, not validated writes or complete dataflow'},
        {'id': 'state_domain_alignment', 'status': 'REVIEW', 'reason': 'Distinct machine/model state sets require manual domain mapping'},
        {'id': 'process_crash_recovery', 'status': 'NOT_PROVEN'},
        {'id': 'authenticated_bch_consensus', 'status': 'NOT_PROVEN'},
        {'id': 'provider_independence', 'status': 'NOT_PROVEN'},
        {'id': 'live_reorg_and_settlement', 'status': 'NOT_PROVEN'},
        {'id': 'settlement_release', 'status': 'BLOCKED'},
    ]
    return {'schema': 'bchflow.v55.financial_flow_map', 'timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'read_only': True, 'database_access': False, 'settlement_authorized': False,
            'counts': {'functions': len(records), 'entry_candidates': len(entries), 'resolved_edges': len(edges),
                       'potential_mutation_calls': len(sinks), 'reachable_mutation_calls': len(reachable_sinks),
                       'security_name_matches': len(security), 'parse_failures': len(failures)},
            'entry_candidates': entries, 'call_edges': edges, 'reachable_potential_mutations': reachable_sinks,
            'all_potential_mutations': sinks, 'security_name_matches': security,
            'unresolved_mutation_calls': unresolved, 'findings': findings,
            'limitations': ['AST name resolution is approximate; false positives and negatives expected',
                            'No execution, DB access, network requests, or settlement',
                            'This report is a review map, never a financial authorization']}


if __name__ == '__main__':
    print(json.dumps(audit(), ensure_ascii=False, indent=2))
