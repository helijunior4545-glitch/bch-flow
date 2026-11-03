BCH Flow V2.9.4.2 — strict provider-specific monetary units.

NOWNodes Blockbook v2 /api/v2/tx/<txid>: vout[].value is integer satoshis.
QuickNode BCH getrawtransaction verbose: vout[].value is decimal BCH.
Both normalize to integer satoshis before comparing output scripts and values.
Reject invalid, fractional satoshis, negative amounts, nonfinite numbers, and amounts over 21 million BCH.
No network during install. No migrations or financial state changes. No payment verification.

Install: python app_bch_flow/py.py [--apply]
Tests: python manage.py test app_bch_flow.tests.test_blockchain_tx_v294 app_bch_flow.tests.test_blockchain_tx_v2941 app_bch_flow.tests.test_blockchain_tx_v2942
Probe: python manage.py bch_provider_tx_v294 --txid <64-hex-txid> --probe
