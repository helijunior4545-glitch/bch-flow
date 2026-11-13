# BCH Flow V5.1-B.3 — Electrum read-only adapter

Scope: standalone module `blockchain/v51_electrum.py`, no change to live corroboration, models, migrations or payment logic.

Validated externally by operator: three Fulcrum servers with CA-verified TLS and matching raw TXID. This installer does not re-run live checks.

`collect_one(txid, host)` requires host allowlist, verifies TLS and local double-SHA256 TXID, and parses raw output scripts and satoshis without guessing addresses. It explicitly reports `merkle_verified=False`, `chain_verified=False`, `independent_corroboration=False`, `invoice_attributed=False`, `payment_created=False`, `settlement_authorized=False`.

`verify_merkle` is a pure function for future integration. No height discovery or header-chain trust is implemented. Do not use this module for financial authorization.

Run: `python manage.py test app_bch_flow.tests.test_v51_electrum_b3 --settings=<your PostgreSQL test settings>` and then full suite with your existing PostgreSQL settings.

This stage deliberately does NOT automatically fail over the live NOWNodes+Blockchair corroboration path. Follow-on stage must validate block height, merkle inclusion, canonical chain, script-to-CashAddr mapping, independent operator provenance, reorg and freshness before enabling comparison.
