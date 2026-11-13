BCH Flow V2.9.3 — explicit read-only common-height block hash comparison.

No network: python manage.py bch_provider_cross_v293
Network:    python manage.py bch_provider_cross_v293 --probe

Uses existing NOWNodes Blockbook A and QuickNode BCH Mainnet JSON-RPC settings.
Compares hash at min(reported heights)-6 using Blockbook GET
/api/v2/block-index/<height> and QuickNode RPC getblockhash(height).
Requires network identity/sync and rejects reported height drift >12 blocks.
A matching hash is a diagnostic cross-check of a common historical block,
NOT independent UTXO agreement, payment verification, settlement authorization,
or a guarantee of provider independence. No TXID, wallet address, database,
or invoice is touched. Network calls only when --probe is supplied.
All errors sanitized. No secrets printed. No existing files changed.
