# BCH Flow V4.1 — Conservative Attribution Pre-Review

- Read-only, additive, no migrations, no API calls, no ledger writes.
- Accepts V4.0 PaymentCandidate objects; simulation data is never payment proof.
- Detects invoice reuse, expiration, partial amounts, confirmation shortfalls, closed invoices, candidate mismatches.
- Even exact confirmed amounts remain **manual_review_only**, because V4.0 candidate does not prove output timestamp, address ownership, or independent chain verification.
- Does not implement final payment attribution, settlement, audited review workflow, or replay protection; those require persisted, authenticated output-level evidence and state-machine design.
- Run: `python manage.py test app_bch_flow.tests.test_v41_attribution --verbosity 2`.
