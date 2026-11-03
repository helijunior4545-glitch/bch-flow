# BCH Flow V3.5 — Evidence-only PostgreSQL reconciliation journal

This version adds idempotent *unverified evidence* journaling using existing `bchflow_financial_event` table. No schema migration, payment settlement, broadcast, private keys, or invoice/payment/transfer status transitions.

Default behavior is a dry-run. Live provider reads require V3.4 opt-in and an audited BCH Blockbook mainnet HTTPS endpoint.

Run:

```
python manage.py check
python manage.py makemigrations app_bch_flow --check --dry-run
python manage.py test app_bch_flow.tests.test_v35_reconciliation --verbosity 2
python manage.py bchflow_v35_reconcile <INVOICE_UUID>
```

To persist an **unverified observation only**, configure V3.4 network environment and explicitly set `BCHFLOW_V35_ALLOW_JOURNAL=1`, then run:

```
python manage.py bchflow_v35_reconcile <INVOICE_UUID> --write-observation
```

`--write-observation` writes to the production default PostgreSQL database; do not enable without operational approval and backups. The invoice status remains unchanged. All writes are serialized on the invoice row and deduplicated by SHA-256 digest. Existing unrelated financial events are never modified. Shared receiving addresses are never attributed to a specific invoice. Historical evidence remains in the journal even after reorgs; the latest evidence must be rechecked before any future settlement.

Limitations: external explorer data is not independent chain verification; same-address uniqueness alone does not prove wallet ownership or uniquely establish payment intent; current service is not a financial ledger or payment confirmation. No automated settlement is enabled.
