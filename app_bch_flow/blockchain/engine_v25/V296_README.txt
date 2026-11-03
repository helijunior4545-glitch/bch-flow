BCH Flow V2.9.6 — bounded automatic invoice transaction discovery.

Read-only management command:
python manage.py bch_invoice_discover_v296 --org-id <real-uuid> --invoice-id <real-uuid> --probe

Without --probe no network calls. Requires existing BCHFLOW_V26_PROVIDER_A_URL / KEY and
QuickNode V2.9.4.3 configuration for transaction cross-checking.
Discovers up to five transaction IDs from the FIRST Blockbook address history page.
Each candidate is passed to V2.9.5, which uses V2.9.4.3 cross-provider comparison.
History is NEVER claimed complete, even with zero transactions. A provider can omit
transactions, return truncated pages, or give inconsistent results. Totals represent
ONLY observed candidate outputs, not invoice payments or total historical receipts.
A shared receiving address can contain payments for multiple invoices; never
attribute those outputs as invoice settlement.

No database writes, migrations, private keys, signing, broadcasting, UTXO consensus,
payment verification, or settlement authorization. Explicit --probe only.
Test: python manage.py test app_bch_flow.tests.test_blockchain_invoice_discovery_v296
