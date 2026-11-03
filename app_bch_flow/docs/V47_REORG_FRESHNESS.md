# BCH Flow V4.7 — Chain Reorganization & Evidence Freshness

This is a **read-only temporal risk assessment** of two caller-supplied corroborated snapshots. It is NOT a full blockchain reorg detector and does not establish independent BCH consensus.

## Contract

- `ChainSnapshot` contains txid, network, block hash/height, tip height, confirmations, UTC-aware observation timestamp, provider hostnames, corroboration flag, and complete allocated invoice outpoints.
- `assess_chain_freshness(previous, current, now=..., max_age_seconds=120, min_confirmations=2)` returns `current_external_only`, `stale`, `reorg_suspected`, or `blocked`.
- Changed block hash, changed inclusion height, regressed tip, or decreased confirmations flag **suspected** reorganization or inconsistent upstream observations.
- Time regressions, future-dated observations, mismatched TXID/outpoints, insufficient confirmations, and missing corroboration block.
- Expired evidence is stale even if both providers previously agreed.
- Strict confirmation arithmetic is required: `tip_height - block_height + 1`.
- Never mark invoices paid, create payments, write financial events, mutate reservations, or broadcast transactions.

## Integration caveat

The existing V4.6 result does not contain the required block heights, tip heights, observation timestamps, or full provider provenance. V4.7 deliberately **does not fabricate these fields**. An eventual live integration must collect independently timestamped snapshots and verify their provenance before calling this module. In the meantime, all 17 tests use deterministic synthetic snapshots and perform no external calls.

## Run

`python manage.py test app_bch_flow.tests.test_v47_reorg_freshness --verbosity 2`

Then run all V4.0–V4.7 suites together (expected 79 tests if the previous 62 remain unchanged).

## Security limits

Two distinct hostnames do not prove independent infrastructure. A consistent but incorrect upstream response can still pass. Snapshot comparison cannot establish address ownership, UTXO unspent status, or finality. It is not authorization to settle.
