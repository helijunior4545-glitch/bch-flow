# BCH Flow V4.8: Live Blockbook Snapshots

Read-only opt-in adapter. It collects two consecutive corroborated observations from two allowlisted HTTPS Blockbook providers and evaluates the V4.7 freshness/reorganization policy. It never marks invoices paid, persists data, broadcasts transactions, or handles private keys.

Enable explicitly with BCHFLOW_V48_ENABLE_LIVE=1 and BCHFLOW_V48_ALLOWED_HOSTS=node-a.example,node-b.example. The caller supplies full HTTPS origins, a BCH mainnet CashAddr, TXID, exact expected outpoint indices and satoshi values. API keys are passed explicitly (never in URLs). Never expose provider keys in logs. The two hosts may still share backend infrastructure.

The provider status endpoint must report Bitcoin Cash mainnet, synced status, bestHeight, and backend.chain. The transaction endpoint must return txid, blockHeight, blockHash, confirmations, blockTime, and vout values as integer satoshi strings. Both hosts must agree exactly including tip height. That strictness can reject benign temporary lag; fail closed by design.

A successful current_external_only decision means recent external evidence only, not chain consensus or payment authorization. A provider's reported coin identity is not independently authenticated. Confirmations can regress in reorganizations. The timestamp is observation time, not transaction time. No cryptographic SPV proof is verified. No invoice/organization binding occurs in this standalone observer; use only with prior V4.5 policy gating.

Test: python manage.py test app_bch_flow.tests.test_v48_live_snapshots --verbosity 2

No migrations. No wallet required. Offline tests use injected fake transport.
