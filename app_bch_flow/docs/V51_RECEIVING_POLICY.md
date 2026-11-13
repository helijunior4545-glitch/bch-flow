# BCH Flow V5.1 — receiving eligibility boundary

This release is deliberately fail-closed. It introduces a deterministic, testable policy for BCH mainnet receiving eligibility. No wallet secrets, migration, database writes, broadcast, or automatic settlement.

**Important:** The policy is not wired into invoice creation. It cannot prove wallet ownership, derivation, exclusive reservation, chain consensus, or payment. These must be implemented as real authenticated and transactionally enforced services before the UI may claim payments are operational. Do not pass user-supplied booleans as evidence.

For address exclusivity, count every historical invoice on the same network/address across organizations and statuses, and enforce allocation atomically in PostgreSQL. A Python count without a DB constraint/lock is not a reservation.

Run: `python manage.py test app_bch_flow.tests.test_v51_receive_policy --verbosity 2`

Next integration: verified wallet binding and derivation, DB-backed address reservation, invoice checkout QR, independent on-chain validation with reorg handling, transactional idempotent settlement, end-to-end test with a real small BCH transfer. Until then, payment settlement must remain disabled.
