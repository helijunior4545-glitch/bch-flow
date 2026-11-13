# BCH Flow V5.1-B.5 — NOWNodes + Electrum read-only comparison

Adds a **separate** diagnostic adapter, no modifications to existing payment/settlement paths.

Flow: opt-in environment flag `BCHFLOW_V51B5_ENABLE_LIVE=1` -> existing NOWNodes Blockbook transaction API (`BCHFLOW_V48_PRIMARY_KEY`) -> obtain `blockHeight`, `blockHash`, `confirmations`, `vout` -> existing B.4 `collect_inclusion` using height and anchor -> verify Merkle against Electrum header and hash against NOWNodes -> compare output satoshi values and confirmation arithmetic.

IMPORTANT: output **scripts vs CashAddr are NOT compared**; output amounts alone do not prove the recipient. NOWNodes block hash is an external provider claim, not a locally validated canonical BCH chain. No provider independence, reorg freshness, checkpoint, finality, invoice attribution or settlement is asserted. An Electrum server and NOWNodes might share upstream infrastructure. This code is diagnostic only.

Run `python manage.py test app_bch_flow.tests.test_v51_electrum_b5` and full PostgreSQL suite (expected 291 = 280 + 11). For a live diagnostic, run inside your Django environment:

```
BCHFLOW_V51B5_ENABLE_LIVE=1 python manage.py shell -c 'from app_bch_flow.blockchain.v51_electrum_b5 import assess_diagnostic; import json; print(json.dumps(assess_diagnostic("e415aca63768515434fede7cf823eb003f2111a46d56443a506915cf007861c3"), indent=2))'
```

The NOWNodes API key must be configured in the environment already; never print it. No migrations, no automatic failover, no writes.
