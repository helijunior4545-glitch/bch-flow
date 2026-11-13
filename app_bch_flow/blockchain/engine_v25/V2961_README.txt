BCH Flow V2.9.6.1 — Blockbook empty address history compatibility fix.

The Blockbook address endpoint may omit `txids` for an address with `txs: 0`.
This release recognizes that omission ONLY when page=1, totalPages=1,
txs=0, and no conflicting transaction/unconfirmed history appears.
It emits NO_TRANSACTIONS_FOUND for that observed empty response.
It does NOT claim complete history, prove payment, authorize settlement,
or write to the database. Missing txids with positive or unknown txs
remains fail-closed as DISCOVERY_UNAVAILABLE_OR_INVALID.

Run: python manage.py test app_bch_flow.tests.test_blockchain_invoice_discovery_v296 app_bch_flow.tests.test_blockchain_invoice_discovery_v2961
