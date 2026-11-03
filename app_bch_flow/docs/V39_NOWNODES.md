# BCH Flow V3.9 — NOWNodes authenticated BCH Blockbook

Additive read-only integration; no migration, DB writes, settlement, signing or broadcast.

Environment (configure in private server secret store; never commit keys):

```
BCHFLOW_V34_ENABLE_NETWORK=1
BCHFLOW_V34_BLOCKBOOK_URL=https://bchbook.nownodes.io
BCHFLOW_V34_ALLOWED_HOSTS=bchbook.nownodes.io
BCHFLOW_V39_ENABLE_NOWNODES=1
BCHFLOW_V39_NOWNODES_API_KEY=<SECRET>
```

Status test: `python manage.py bchflow_v39_nownodes`

Optional address diagnostic: `python manage.py bchflow_v39_nownodes --address 'bitcoincash:...' --max-pages 3 --page-size 50`

Note: the documented example address has 1624 transactions; max_pages=3 cannot retrieve its entire history. This correctly FAILS CLOSED, not partial success. Do not use it for an address evidence positive test with default limits.

Run offline tests: `python manage.py test app_bch_flow.tests.test_v39_nownodes`

V3.8 remains unchanged and uses its original provider setup. V3.9 status checks require Bcash/BCH/main and aligned block heights; network read errors abort. Status and address data are external claims, not independent consensus proof. Validate NOWNodes commercial usage rights before production.
