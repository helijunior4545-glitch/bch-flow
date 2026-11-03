#!/usr/bin/env python3
"""BCH Flow V6.0 — five-gate safety audit, fail-closed.

No live BCH transactions, settlement, schema migrations, or production DB writes.
The optional Django regression test command creates its own TEST database.
The evidence gates intentionally remain NOT_PROVEN unless independently verified.
"""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app_bch_flow"
COMPONENTS = {
    "reservation": "blockchain/v43_outpoint_reservation.py",
    "state_machine": "payments/state_machine.py",
    "asert": "blockchain/v51_asert_b8.py",
    "asert_replay": "blockchain/v51_asert_b81.py",
    "anchor": "blockchain/v51_asert_b82.py",
    "policy": "blockchain/v45_settlement_policy.py",
    "chain_verification": "blockchain/v46_chain_verification.py",
    "provider_quorum": "blockchain/v37_quorum.py",
    "observer": "blockchain/v40_payment_observer.py",
    "reorg": "blockchain/v47_reorg_freshness.py",
    "invoice": "models/finance.py",
    "entrypoint": "views/v3_workspace.py",
}
GATES = {
    "01_process_kill_recovery": {
        "requires": ["reservation", "invoice"],
        "evidence": "Independent worker process is SIGKILLed during an actual DB transaction; replay after restart demonstrates durable rollback/idempotency on PostgreSQL.",
    },
    "02_consensus_asert_canonical_chain": {
        "requires": ["asert", "asert_replay", "anchor", "chain_verification"],
        "evidence": "Independently authenticated BCH historical header vectors, ASERT anchor, cumulative-work canonical-chain selection and adversarial forks.",
    },
    "03_independent_provider_provenance": {
        "requires": ["provider_quorum", "observer"],
        "evidence": "Two demonstrably independent sources, distinct upstream provenance, disagreement and compromised-provider tests.",
    },
    "04_live_reorg_and_replay": {
        "requires": ["reorg", "chain_verification", "invoice"],
        "evidence": "Controlled reorg/replay invalidates stale confirmations and prevents duplicate or irreversible fulfillment.",
    },
    "05_http_worker_to_financial_settlement": {
        "requires": ["entrypoint", "observer", "reservation", "policy", "invoice"],
        "evidence": "Real Django HTTP/worker entrypoint through observation, verified evidence, outpoint reservation and final state, with injected failures and tenant isolation.",
    },
}

def source_inventory():
    result = {}
    for name, rel in COMPONENTS.items():
        file = APP / rel
        if not file.is_file() or file.is_symlink():
            result[name] = {"status": "MISSING", "path": rel}
            continue
        raw = file.read_bytes()
        try:
            tree = ast.parse(raw, filename=str(file))
        except (SyntaxError, UnicodeError) as exc:
            result[name] = {"status": "PARSE_ERROR", "path": rel, "error": str(exc)}
            continue
        result[name] = {
            "status": "PARSED_ONLY", "path": rel,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "functions": sorted({n.name for n in ast.walk(tree)
                                 if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}),
        }
    return result

def run_regression(timeout):
    # Never silently run Django tests against production: require explicit opt-in
    # and Django's normal test database machinery.
    command = [sys.executable, "manage.py", "test", "app_bch_flow", "--verbosity", "1", "--noinput"]
    try:
        proc = subprocess.run(command, cwd=ROOT, capture_output=True, text=True,
                              timeout=timeout, check=False)
        output = (proc.stdout + "\n" + proc.stderr)[-12000:]
        return {"command": command, "returncode": proc.returncode,
                "status": "PASS" if proc.returncode == 0 else "FAIL",
                "log_tail": output}
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {"status": "FAIL", "error": str(exc)}

def build_report(run_tests=False, timeout=300):
    inventory = source_inventory()
    regression = run_regression(timeout) if run_tests else {
        "status": "NOT_RUN", "reason": "Use --run-regression explicitly"}
    gates = {}
    for name, gate in GATES.items():
        missing = [x for x in gate["requires"] if
                   inventory[x]["status"] != "PARSED_ONLY"]
        gates[name] = {
            "status": "FAIL" if missing else "NOT_PROVEN",
            "missing_or_unparseable_sources": missing,
            "evidence_required": gate["evidence"],
            "note": "Source presence and unit-test success cannot certify this gate.",
        }
    return {
        "schema": "bchflow.v60.five_gate_audit",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "mode": "read_only_and_optional_django_test_db",
        "regression": regression,
        "gates": gates,
        "sources": inventory,
        "all_gates_proven": False,
        "commercial_settlement_authorized": False,
        "settlement_release": "BLOCKED",
        "reason": "Independent runtime evidence and external review are not yet supplied.",
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-regression", action="store_true",
                        help="Run Django tests on Django-created test DB; may take time")
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--output", help="Optional report path; default stdout only")
    args = parser.parse_args()
    if args.timeout < 30 or args.timeout > 3600:
        parser.error("--timeout must be between 30 and 3600 seconds")
    if not (ROOT / "manage.py").is_file():
        parser.error("Django project root not found")
    report = build_report(args.run_regression, args.timeout)
    serialized = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        target = Path(args.output).expanduser()
        if target.exists() or target.is_symlink():
            parser.error("Report path already exists; refusing overwrite")
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("x", encoding="utf-8") as file:
            file.write(serialized)
        print("Report:", target)
    else:
        print(serialized)
    print("FINAL: settlement_release=BLOCKED; all_gates_proven=False")
    if report["regression"]["status"] == "FAIL":
        return 2
    if any(g["status"] == "FAIL" for g in report["gates"].values()):
        return 2
    return 0  # audit ran successfully; NOT an approval for settlement

if __name__ == "__main__":
    raise SystemExit(main())
