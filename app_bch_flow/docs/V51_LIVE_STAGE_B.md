# BCH Flow V5.1 — Stage B (read-only)

Two external BCH mainnet API operators: NOWNodes Blockbook and Blockchair dashboards.

- Explicit opt-in: `BCHFLOW_V51B_ENABLE_LIVE=1`
- Existing NOWNodes credential: `BCHFLOW_V48_PRIMARY_KEY` (never put the key on the command line).
- `python manage.py bchflow_v51_live <TXID>`
- Uses only HTTPS, fixed allowlisted hosts, no redirects, bounded response size and timeout.
- Collects transaction outputs and block evidence from both providers; fail closed on missing fields.
- Compares data using V5.1-A. Operator-level separation is not independently audited.
- No database reads or writes, no migrations, no payment creation, no settlement.
- A consistent result is **not** permission to pay, attribute, or settle.
- Some Blockchair plans/rate limits may return errors; these block comparison.
- Future work: validate CashAddr checksum, verify raw transaction/coinbase status, independent chain tip, provider provenance and V5.0 integration.
