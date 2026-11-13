BCH Flow V2.9.1 — Single-provider manual health probe.

No network:
  python manage.py bch_provider_single_v291 --provider A

Explicit HTTPS GET /api to configured provider A only:
  python manage.py bch_provider_single_v291 --provider A --probe

Environment:
  BCHFLOW_V26_PROVIDER_A_URL=https://bchbook.nownodes.io
  BCHFLOW_V26_PROVIDER_A_KEY=<secret; never commit>

The existing V2.6 BlockbookProvider already accepts coin=Bcash and uses api-key header.
This diagnostic does NOT require BCHFLOW_V26_ENABLE_OBSERVATION=1.
It does NOT query wallet addresses, change invoices, or authorize settlement.
The V2.8 two-provider gate remains unchanged. HEALTHY means only /api health.
No endpoint, key, or raw HTTP response is printed.
