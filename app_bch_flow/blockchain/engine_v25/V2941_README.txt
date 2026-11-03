BCH Flow V2.9.4.1 - Blockbook vout.hex normalization fix.

NOWNodes Blockbook /api/v2/tx/<txid> returns output script in vout[].hex.
Bitcoin Cash verbose RPC getrawtransaction returns vout[].scriptPubKey.hex.
This guarded patch accepts both Blockbook formats and rejects conflicting script fields.
Existing V2.9.4 tests and command remain unchanged. No financial verification.

Run:
python app_bch_flow/py.py                 # dry-run
python app_bch_flow/py.py --apply         # checksum-guarded
python manage.py check
python manage.py test app_bch_flow.tests.test_blockchain_tx_v294 app_bch_flow.tests.test_blockchain_tx_v2941
python manage.py bch_provider_tx_v294 --txid <64-hex> --probe

If RPC_TX_UNAVAILABLE appears, QuickNode may not support historic txid lookups.
No database migrations, no automatic network, no secret logging.
