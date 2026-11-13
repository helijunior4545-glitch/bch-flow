BCH Flow V2.9.7 — bounded merchant invoice monitoring (manual, read-only).

Command: python manage.py bch_merchant_monitor_v297 --org-id <real-uuid> --probe
Without --probe, NO provider calls. With --probe, scans up to 10 created invoices
for the specified organization using existing V2.9.6 discovery. No scheduler,
no DB writes, no payment verification, no settlement, no UTXO consensus.
Shared receiving addresses are explicitly flagged as attribution unsafe.
Evidence from an address is never sufficient to assign payment to a particular invoice.
First page only and maximum 5 txids per invoice; history_complete always false.
This version is a manually invoked monitoring foundation, not a recurring daemon.
Run tests: python manage.py test app_bch_flow.tests.test_blockchain_merchant_monitor_v297
