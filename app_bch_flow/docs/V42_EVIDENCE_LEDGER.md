# V4.2 Evidence Ledger (simulation only)

Integrates V3.5 persisted observations and V4.1 conservative assessment.
Default dry-run. Explicit write only with `write=True`. No financial status changes.
Does NOT verify consensus, prove address ownership, reserve outputs, authorize human review, or settle.
Cross-invoice outpoint checks are best-effort and NOT concurrency-safe without a DB unique constraint.
Run `python manage.py test app_bch_flow.tests.test_v42_evidence_ledger --verbosity 2`.
