#!/usr/bin/env python3
"""V5.7 conservative source-only report: no DB access, network, or authorization."""
import ast
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PATHS = {
    "workspace": "views/v3_workspace.py",
    "observer": "blockchain/v40_payment_observer.py",
    "reconciliation": "blockchain/v35_reconciliation.py",
    "review": "blockchain/v36_review.py",
    "evidence_ledger": "blockchain/v42_evidence_ledger.py",
    "reservation": "blockchain/v43_outpoint_reservation.py",
    "policy": "blockchain/v45_settlement_policy.py",
    "chain_verification": "blockchain/v46_chain_verification.py",
    "state_machine": "payments/state_machine.py",
    "invoice_model": "models/finance.py",
}
def inspect():
    sources = []
    for name, rel in PATHS.items():
        path = ROOT / rel
        if not path.is_file():
            sources.append({"component": name, "status": "MISSING", "path": rel})
            continue
        raw = path.read_bytes()
        try:
            tree = ast.parse(raw, filename=str(path))
        except (SyntaxError, UnicodeError) as exc:
            sources.append({"component": name, "status": "PARSE_ERROR",
                            "path": rel, "error": str(exc)})
            continue
        functions = sorted({n.name for n in ast.walk(tree)
                            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))})
        sources.append({"component": name, "status": "PARSED",
                        "path": rel, "sha256": hashlib.sha256(raw).hexdigest(),
                        "functions": functions})
    return {
        "schema": "bchflow.v57.postgresql_boundary",
        "read_only": True,
        "settlement_authorized": False,
        "settlement_release": "BLOCKED",
        "verified_by_v57_tests_if_pass": [
            "real PostgreSQL reservation persistence",
            "transaction rollback",
            "cross-invoice outpoint exclusion",
            "repeated claim idempotency",
            "no automatic paid/confirmed state in tested reservation calls",
        ],
        "not_proven": [
            "end-to-end production HTTP/worker entrypoint execution",
            "independently authenticated BCH consensus and canonical chain",
            "independent provider provenance",
            "live reorg and replay",
            "actual process kill and durable recovery",
            "commercial settlement authorization",
        ],
        "sources": sources,
    }
if __name__ == "__main__":
    print(json.dumps(inspect(), ensure_ascii=False, indent=2))
