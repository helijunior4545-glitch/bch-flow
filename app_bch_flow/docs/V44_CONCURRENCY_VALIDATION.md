# BCH Flow V4.4 — PostgreSQL Real Concurrency Validation

No production code or migration changes. Tests use `TransactionTestCase`, separate thread-local PostgreSQL connections, and a barrier for simultaneous start.

Five tests: competing invoices; same-invoice idempotency; rollback; database uniqueness independent of service; distinct outputs.

Run: `python manage.py test app_bch_flow.tests.test_v44_concurrency --verbosity 2`

**Safety:** no wallet, no payment, no settlement, no blockchain broadcast.

**Limits:** This is a concurrent-start integration test, not a proof of every possible transaction interleaving, and does not guarantee that other database aliases or payment paths use the same reservation mechanism. Repeat under load before production readiness.
