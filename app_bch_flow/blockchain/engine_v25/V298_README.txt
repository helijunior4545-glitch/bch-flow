BCH FLOW V2.9.8 — one-shot scheduler-safe merchant monitoring.

Install: python app_bch_flow/py.py (dry run); python app_bch_flow/py.py --apply
Check: python manage.py check
Test: python manage.py test app_bch_flow.tests.test_blockchain_scheduled_monitor_v298

Manual run (no local snapshot):
 python manage.py bch_merchant_monitor_v298 --org-id <UUID> --probe

Optional local snapshot (directory must already exist):
 mkdir -p -m 700 /home/farcry/Downloads/bchflow-observations
 python manage.py bch_merchant_monitor_v298 --org-id <UUID> --probe --snapshot-file /home/farcry/Downloads/bchflow-observations/finance.json

External cron (example, adapt absolute paths, org UUID and cadence; DO NOT use until validated):
 */15 * * * * cd /home/farcry/Documents/bch-flow && /usr/bin/flock -n /tmp/bchflow-finance-v298.lock /home/farcry/Documents/bch-flow/.venv/bin/python manage.py bch_merchant_monitor_v298 --org-id <UUID> --probe --snapshot-file /home/farcry/Downloads/bchflow-observations/finance.json >> /home/farcry/Downloads/bchflow-observations/monitor.log 2>&1

External flock is required for concurrency protection; no daemon or cron entries installed.
The snapshot is an OPTIONAL local JSON file, not a database change. It contains whitelisted evidence only and is atomically replaced with mode 0600. A successful bounded observation is required to replace an earlier snapshot. No automatic settlement, payment verification, signing, broadcasting or UTXO consensus. This version does not provide full chain history, finality, or transaction attribution.
