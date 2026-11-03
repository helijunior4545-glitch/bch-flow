# BCH Flow V4.0 — Payment Candidate Observation (phase 1)

This release adds a conservative, **read-only**, opt-in observer for an explicit invoice ID and TXID. It does **not** implement automatic detection, attribution, reconciliation journal writing, human review creation, consensus verification, or settlement. Those require separate audited phases.

Requires existing V3.3, V3.4 and V3.9 files, Django/PostgreSQL invoice model and NOWNodes environment variables already validated.

Configure **runtime** variable `BCHFLOW_V40_ENABLE_OBSERVATION=1` in Coolify, then restart/redeploy.

Run: `python manage.py bchflow_v40_observe <INVOICE_ID> <64_HEX_TXID> --min-confirmations 2`

**Warning:** V3.4 retrieves all pages up to its configured maximum (10 pages x 100 transactions here). If the address has more than 1000 transactions, it **fails closed**; it will not return partial evidence. This is expected for busy addresses. This version is not suitable for general merchant payment monitoring yet.

The observer filters to the explicit TXID, checks the invoice's mainnet address and amount using the V3.3 deterministic engine, and always returns `unattributed` because address exclusivity and temporal attribution have not been proven. No DB writes. No `paid` status. No signing/broadcast.

Run offline tests: `python manage.py test app_bch_flow.tests.test_v40_payment_observer`; system check: `python manage.py check`.

**Next required phase:** transaction-specific retrieval, confirmation-height consistency, invoice creation-time window, verified address allocation, safe retry scheduling, and supervised journal recording. Do not use V4.0 phase 1 as a payment processor.
