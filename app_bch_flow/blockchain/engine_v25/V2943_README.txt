BCH Flow V2.9.4.3 — QuickNode RPC float compatibility.

QuickNode verbose getrawtransaction vout[].value arrives as Python float via JSON decoding.
Normalize Decimal(str(value))*100000000 and reject non-integral satoshis, negative,
non-finite or over-supply amounts. NOWNodes Blockbook values remain integer satoshis.

Note: Decimal(str(float)) does not restore precision lost during JSON parsing.
This patch addresses the observed rejection without altering the existing RPC client.
For future high-assurance monetary processing, parse JSON numeric values as Decimal
at the RPC transport boundary and verify all response shapes before enabling actions.

No signing, payment verification, UTXO consensus, settlement or broadcasting enabled.
Run: python app_bch_flow/py.py [--apply]
Test: python manage.py test app_bch_flow.tests.test_blockchain_tx_v2943
Probe (manual only): python manage.py bch_provider_tx_v294 --txid 3936a8a9e17762183d9b316657dc34a856ce9c3f0ce31693a54c01c59db5711d --probe
