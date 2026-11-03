BCH FLOW V2.9.9 — Automated Monitoring Operations (opt-in external scheduler)

Adds one-shot management command bch_merchant_monitor_v299. This wraps the
already validated V298 monitor. No cron jobs, services, migrations or DB writes
are installed. Uses nonblocking fcntl flock per organization on local filesystem.
Audit JSONL contains ONLY timestamp, organization ID, outcome, duration, invoice
count, change count, snapshot_written, monitor state and exception TYPE.
Never credentials, addresses, transaction IDs or candidate payloads.

PREPARE:
 mkdir -p -m 700 /home/farcry/Downloads/bchflow-observations

RUN:
 python manage.py bch_merchant_monitor_v299 --org-id f5e8b720-d000-4d17-a9c6-d1c49b5bd192 --probe --lock-dir /home/farcry/Downloads/bchflow-observations --snapshot-file /home/farcry/Downloads/bchflow-observations/finance.json --audit-file /home/farcry/Downloads/bchflow-observations/finance-audit.jsonl

TEST:
 python manage.py test app_bch_flow.tests.test_blockchain_monitor_operations_v299

OPTIONAL EXTERNAL CRON EXAMPLE (NOT INSTALLED):
 */5 * * * * cd /home/farcry/Documents/bch-flow && /home/farcry/Documents/bch-flow/.venv/bin/python manage.py bch_merchant_monitor_v299 --org-id f5e8b720-d000-4d17-a9c6-d1c49b5bd192 --probe --lock-dir /home/farcry/Downloads/bchflow-observations --snapshot-file /home/farcry/Downloads/bchflow-observations/finance.json --audit-file /home/farcry/Downloads/bchflow-observations/finance-audit.jsonl

Notes: scheduler is not enabled by this installer. No retries inside a run;
subsequent scheduled runs can recover after transient provider errors. The audit
file grows indefinitely; configure external log rotation before production.
A failed V298 run does not overwrite the previous valid snapshot. Monitoring
is bounded to 10 open invoices, watch-only, with history_complete=false.
No payment verification, UTXO consensus, settlement, signing or broadcasting.
