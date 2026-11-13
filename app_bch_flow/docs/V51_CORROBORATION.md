# BCH Flow V5.1 — read-only evidence comparison

This is a deliberately bounded **first stage** of V5.1, not a live two-provider integration.
It compares two separately acquired V4.9-shaped observations.
**Do not label independent_corroboration true based on JSON comparisons.**
No provider ownership verification, raw transaction coinbase inspection, or chain consensus validation is implemented here.

## Commands

`python manage.py test app_bch_flow.tests.test_v51_corroboration --verbosity 2`

`BCHFLOW_V51_ENABLE_COMPARISON=1 python manage.py bchflow_v51_compare <TXID> primary.json secondary.json`

JSON files must come from separately acquired, verified sources and must match the V4.9 schema.
The existing V4.9 diagnostic produces only NOWNodes evidence; copying it into two files does NOT create independent sources.

## Next stage

Add a real secondary BCH backend with strict hostname allowlisting, HTTPS no-redirect, API key handling, chain checks, normalized outputs and independently inspected raw transaction. Then integrate verified provenance with V5.0.

## Invariants

No database writes, no migrations, no invoice attribution, no payment creation, no settlement.
