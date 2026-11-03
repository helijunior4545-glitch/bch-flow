BCH Flow V2.9 — manual provider connectivity diagnostic.

Command (NO NETWORK): python manage.py bch_provider_health_v29
Command (EXPLICIT NETWORK): python manage.py bch_provider_health_v29 --probe

Requires BCHFLOW_V26_ENABLE_OBSERVATION=1 and two distinct configured HTTPS
Blockbook origins. Configuration values are not printed. The probe performs
GET /api only; no addresses, transactions or balances are requested.

A HEALTHY result means two configured endpoints reported BCH mainnet and
synchronization. It does not prove independent backend infrastructure,
actual blockchain validity, UTXO consistency, invoice payment, or settlement.

No default public provider endpoints are bundled. Configure only trusted
provider origins and protect the process environment from untrusted input.
Avoid probing untrusted hosts. Runtime V2.8 remains unchanged.
