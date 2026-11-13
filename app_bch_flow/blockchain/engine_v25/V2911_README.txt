BCH Flow V2.9.11 — bounded JSONL audit rotation, no migrations or database writes.
This installer does not enable a timer or modify systemd units.
Rotation takes the SAME per-org flock used by V299 and skips if monitor is running.
Use after a monitor run, with the same lock directory and audit path.

DRY RUN:
 python app_bch_flow/py.py
INSTALL:
 python app_bch_flow/py.py --apply
TEST:
 python manage.py test app_bch_flow.tests.test_blockchain_audit_rotation_v2911
MANUAL ROTATION (1 MiB threshold, retain 12 archives):
 python -m app_bch_flow.blockchain.engine_v25.audit_rotation_v2911 --org-id f5e8b720-d000-4d17-a9c6-d1c49b5bd192 --lock-dir /home/farcry/Downloads/bchflow-observations --audit-file /home/farcry/Downloads/bchflow-observations/finance-audit.jsonl
No automatic schedule is installed; review logs and results before activation.
Archive names use UTC timestamps. Only complete newline-terminated JSONL is rotated.
Never verifies payments, broadcasts transactions, signs, or changes invoice status.
