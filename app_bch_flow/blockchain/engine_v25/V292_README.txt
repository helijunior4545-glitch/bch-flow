BCH Flow V2.9.2 Hybrid BCH Mainnet Provider Diagnostics

QuickNode endpoint: create a BCH Mainnet standard RPC endpoint. Blockbook add-on NOT required.
In your local .env (never commit):
  BCHFLOW_V292_QUICKNODE_RPC_URL=https://<your-host>.bch-mainnet.quiknode.pro/<your-private-token>/

Do not paste the URL or token in chat, screenshots, logs or version control.

Without network:
  python manage.py bch_provider_hybrid_v292

Explicitly test both services:
  python manage.py bch_provider_hybrid_v292 --probe

Test:
  python manage.py test app_bch_flow.tests.test_blockchain_hybrid_v292

QuickNode calls: POST JSON-RPC getblockchaininfo and getbestblockhash. If unsupported, result is RPC_UNAVAILABLE; report the sanitized state, not the secret endpoint.
NOWNodes calls: existing V2.9.1 /api probe.
The output HEALTHY_DIAGNOSTICS_ONLY never constitutes UTXO consensus, verified payment or settlement.
The existing two-Blockbook gate is unchanged; no address scans, invoice writes, migrations or automatic network calls.
