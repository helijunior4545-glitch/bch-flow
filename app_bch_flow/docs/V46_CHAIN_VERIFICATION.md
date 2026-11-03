# BCH Flow V4.6 — External Blockchain Corroboration

V4.6 is **read-only**. It first enforces V4.5 manual-review readiness, then fetches complete address histories using two distinct provider instances. Default adapters: NOWNodes V3.9 and Secondary Blockbook V3.7. Both require their existing explicit environment opt-ins and host allowlists. Test fixtures inject fake providers and perform **no network requests**.

The service compares both providers' full output histories using V3.7 `compare_evidence`, checks the exact TXID and outpoint set in the V4.2 assessment, matches address, network and exact invoice satoshis, and requires a minimum confirmation count. Any disagreement or missing data blocks corroboration. Unrelated historical address outputs can cause a conservative block. Pagination truncation is rejected by the underlying V3.4 adapter.

`corroborated_external_only` means two external API responses agree. **It is not independent consensus verification, proof of wallet ownership, irreversible finality, proof of transaction time, or authorization to settle.** Two hosts may share the same node/provider. A later chain reorganization can invalidate a previously observed block. No invoice status, payment, transfer, reservation, journal or transaction is modified. `settlement_authorized` is always false.

## Install

Copy the downloaded installer to the Django project root as `py.py`, then run `python py.py` (dry run) and `python py.py --apply`. It only creates new files, never overwrites changed files, and runs no migrations.

## Tests

`python manage.py test app_bch_flow.tests.test_v46_chain_verification --verbosity 2`

Then run V4.0–V4.6 regression tests together (expected 62 tests if prior 51 remain unchanged).

## Operational limitations

- Live calls require configured NOWNodes and secondary Blockbook, TLS, allowlists and credentials. No live calls occur in tests.
- This module does not prove the providers are operationally independent; additional validation against a self-operated BCH node is a future milestone.
- It cannot establish ownership of a receiving address or guarantee protection against reorgs.
- Never wire this result to `BCHInvoice.status='paid'` or to automatic settlement.
