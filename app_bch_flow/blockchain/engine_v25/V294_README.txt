BCH Flow V2.9.4: explicit manual cross-provider transaction comparison.

Offline: python manage.py bch_provider_tx_v294 --txid <64-hex-txid>
Online:  python manage.py bch_provider_tx_v294 --txid <64-hex-txid> --probe

Requires existing NOWNodes Blockbook A and QuickNode BCH JSON-RPC B environment variables.
Reads Blockbook /api and /api/v2/tx/<txid>; RPC getblockchaininfo and getrawtransaction(txid,true).
Compares exact transaction ID, confirmed block hash, output values in satoshis and scriptPubKey hex.
Does NOT infer an address payment, invoice match, finality, UTXO agreement or settlement authorization.
A QuickNode node without transaction indexing may return RPC_TX_UNAVAILABLE. This is not a conflict.
No writes, no automatic network without --probe, no secret output, no migrations.
