BCH Flow V5.3 - consolidated installation, independent security gates.
This does not claim that all five domains are proven.
PostgreSQL: six real reservation-function tests including two independent connections,
rollback, cross-org conflict, idempotency, dry-run and evidence mismatch.
Read-only report: source presence, state mismatch, and explicit NOT_PROVEN gates
for consensus, canonical chain, independent providers, live reorg and crash recovery.
NO migrations, production DB access, automatic settlement or source overwrites.
After installing:
python manage.py test app_bch_flow.tests.test_v53_integrated --verbosity 2
python manage.py test app_bch_flow --verbosity 1
python app_bch_flow/v53_readiness.py
Tests have NOT been run against the user's PostgreSQL; test failures must be reported.
The complete financial readiness gate is BLOCKED.
