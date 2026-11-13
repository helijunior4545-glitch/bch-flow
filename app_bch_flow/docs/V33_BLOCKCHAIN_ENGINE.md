# BCH Flow V3.3 — read-only blockchain evidence engine

- New pure evaluator for transaction outputs, confirmation threshold, duplicate output rejection, network and address matching.
- No blockchain provider is configured; the default provider explicitly refuses to operate.
- A fixture provider is included **only** for deterministic tests.
- A confirmed amount is never a settled payment: the strongest output is `eligible_for_review`.
- Shared addresses cannot uniquely attribute payments to an invoice; the database does not yet enforce exclusive allocation.
- No automatic mutation of BCHInvoice, BCHPayment or BCHTransaction, no signing, no broadcast, no key custody.
- Reorg handling requires a real verified provider, block tracking and persistent reconciliation; not yet implemented.
- For production: implement and audit an authenticated BCH node/Electrum adapter, verify block inclusion and chain tip, enforce exclusive address allocation or unambiguous attribution, implement idempotent DB reconciliation and extensive adversarial tests.

Run: `python manage.py test app_bch_flow.tests.test_v33_engine --verbosity 2`
Run full: `python manage.py test app_bch_flow.tests.test_v3_foundation app_bch_flow.tests.test_v3_invoices app_bch_flow.tests.test_v33_engine --verbosity 2`
The command `python manage.py bchflow_v33_observe <invoice-uuid>` fails closed until an audited provider is configured.
