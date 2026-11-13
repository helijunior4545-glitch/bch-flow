V5.2.1 — 5 PostgreSQL runtime tests. No financial operations enabled.
Four checks assert deployed test-database unique constraints/indexes.
Fifth test uses two independent PostgreSQL connections to race on a disposable
probe table; it does NOT exercise real reserve_outpoint().
Tests run only in Django's automatically created/destroyed test database.
Use: python manage.py test app_bch_flow.tests.test_v521_postgres_runtime --verbosity 2
Then: python manage.py test app_bch_flow --verbosity 1
Expected full suite: 905. Database must be PostgreSQL; no SQLite fallback.
Requires Django test database creation permissions. Do not run against production DB.
