# BCH Flow V2 — pre-migration model consolidation

This release refactors all 14 existing models and introduces 2 additional models: BCHWalletChallenge and BCHFinancialEvent (16 total). All models remain in app_bch_flow. It does not implement blockchain broadcast, wallet authorization, on-chain reconciliation, tenant permission middleware, or a complete payment state machine. **Do not enable real mainnet payments based on these models alone.**

## Integrity guarantees and limitations

- DB constraints cover positive amounts, state domains, network domains, uniqueness, wallet verification flags, and transaction/output pairing.
- `clean()` adds application-level cross-row checks, but Django does not call `full_clean()` on `save()` or bulk operations. These checks are NOT DB-enforced and cannot replace transactional service-layer locking and tenant-scoped queries.
- A validated CashAddr checksum does not prove ownership of an address. Signature-based ownership proof must be implemented and verified before marking addresses verified.
- Financial events are a model for audit history, not a database-enforced append-only ledger; write permissions and immutability need service/DB policies.
- Only the configured `bch_flow` PostgreSQL database should receive these tables. Audit the host DATABASES and DATABASE_ROUTERS before migration.

## Migration policy

Installer never changes migration files or DB. If 0001_initial.py has NOT been applied to any database, after verifying with `showmigrations`, archive/remove it manually and regenerate it. If it has been applied anywhere, NEVER delete/rewrite it; generate 0002 and use a reviewed migration plan.

## Validation

python manage.py check
python manage.py makemigrations app_bch_flow --check --dry-run
python manage.py makemigrations app_bch_flow --dry-run --verbosity 2
python manage.py showmigrations app_bch_flow --database=bch_flow
python manage.py sqlmigrate app_bch_flow 0001 --database=bch_flow
