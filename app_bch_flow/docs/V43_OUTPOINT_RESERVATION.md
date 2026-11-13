# V4.3 Outpoint Reservation (simulation / supervised review only)

Adds a PostgreSQL-enforced unique claim on `(network, txid, output_index)`.
This claim is not proof of payment, address ownership, consensus, or settlement.
No BCHPayment, BCHTransaction, or invoice state is changed by this service.

Install with `python py.py --apply`; then inspect `python manage.py makemigrations app_bch_flow --check --dry-run` and `python manage.py migrate app_bch_flow --plan` before running `python manage.py migrate app_bch_flow`.
Test: `python manage.py test app_bch_flow.tests.test_v43_outpoint_reservation --verbosity 2`.

Known limits: V4.3 does not implement release/reassignment, human reviewer authorization, or reorg resolution. Existing historical evidence needs separate reconciliation before trusting reservations. Cross-invoice concurrency is enforced by the unique constraint, but dedicated concurrent-connection tests remain a release gate.
