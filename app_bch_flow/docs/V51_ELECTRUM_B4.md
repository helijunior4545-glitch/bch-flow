# BCH Flow V5.1-B.4 — Read-only inclusion evidence

Adds `blockchain/v51_electrum_b4.py` and 10 deterministic unit tests. Does not modify the B.3 adapter or live settlement/corroboration logic.

`verify_inclusion(txid, block_height, merkle_result, header_hex, trusted_block_hash=..., trusted_tip_height=...)` verifies Merkle root against header, computes block hash, optionally compares a separately sourced block-hash anchor, and reports confirmation arithmetic. An anchor supplied by the same Electrum provider is **not independent**. Canonical chain, operator independence, reorg safety and finality are **never** asserted.

`collect_inclusion(txid, host, block_height=..., trusted_block_hash=..., trusted_tip_height=...)` uses CA-verified TLS and strict host allowlist. Block height MUST come from a separate trusted source: raw Electrum TX retrieval does not return height. The function verifies raw TXID then requests `blockchain.transaction.get_merkle` and `blockchain.block.header`. Two connections are used; no mutation occurs.

All results explicitly deny automatic invoice attribution, payment creation, and settlement. This is not wired into any live payment path. No migrations.

Tests: `python manage.py test app_bch_flow.tests.test_v51_electrum_b4` then `python manage.py test app_bch_flow --verbosity 1` with your PostgreSQL configuration. Expected baseline after B.3: 280 tests.

Next: independent block-height sourcing, BCH chain identity and checkpoint verification, provenance, freshness and reorg handling, before supervised financial use.
