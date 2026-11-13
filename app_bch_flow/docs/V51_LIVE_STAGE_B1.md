# BCH Flow V5.1-B.1 — Live provider diagnostics and normalization

- Replace only `blockchain/v51_live.py` after SHA256 verification of the exact V5.1-B file.
- Add `tests/test_v51_live_b1.py`; original `tests/test_v51_live.py` remains intact.
- Safe atomic replace, rollback backup under `app_bch_flow/blockchain/` named `v51_live.py.pre_b1.<sha256>.bak`.
- The installer is dry-run by default and never executes Django, migrations, or network calls.
- `blockchair` transaction output may have a `recipient` string instead of `addresses` array.
- CashAddr-only policy: legacy addresses, scripts without addresses, and malformed responses fail closed. Proper legacy-to-CashAddr conversion is **not** implemented.
- Errors include stage names (`nownodes_tx_fetch`, `blockchair_tx_fetch`, `nownodes_tx_parse`, `blockchair_tx_parse`, `blockchair_block_fetch`, `blockchair_block_parse`). API credentials and response bodies are never included.
- Reuses V5.1-A comparator and its max tip divergence 2; does not grant provider independence or settlement.
- Blockchair block dashboard and context schema remain to be verified against actual live payloads; no assertion of live success until verified.

## Tests

`python manage.py test app_bch_flow.tests.test_v51_live app_bch_flow.tests.test_v51_live_b1 --verbosity 2`

`python manage.py test app_bch_flow.tests --verbosity 2`

## Live check

`BCHFLOW_V51B_ENABLE_LIVE=1 python manage.py bchflow_v51_live <TXID>`

Keep `BCHFLOW_V48_PRIMARY_KEY` in your secret environment; do not paste it in logs.
