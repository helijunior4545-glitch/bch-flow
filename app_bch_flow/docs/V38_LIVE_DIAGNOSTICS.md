# BCH Flow V3.8 — live provider diagnostics

Read-only, mainnet-only, explicit opt-in. No migrations, no database writes, no settlement.

Configure the existing V3.4 primary and V3.7 secondary HTTPS endpoints and allowlists:

- `BCHFLOW_V34_ENABLE_NETWORK=1`
- `BCHFLOW_V34_BLOCKBOOK_URL=https://PRIMARY_HOST`
- `BCHFLOW_V34_ALLOWED_HOSTS=PRIMARY_HOST`
- `BCHFLOW_V37_ENABLE_SECONDARY=1`
- `BCHFLOW_V37_SECONDARY_BLOCKBOOK_URL=https://SECONDARY_HOST`
- `BCHFLOW_V37_SECONDARY_ALLOWED_HOSTS=SECONDARY_HOST`

Then run `python manage.py bchflow_v38_diagnose 'bitcoincash:VALID_MAINNET_CASHADDR' --min-confirmations 2`.

Requires both services to expose Blockbook `/api/v2` with `coin` explicitly identifying Bitcoin Cash, plus paginated `/api/v2/address/...` with full transaction outputs. No public endpoints are assumed verified. A valid address with transaction history is required to demonstrate positive corroboration. Output statuses: `corroborated_external`, `disagreement`, `inconclusive`. Errors fail closed.

**Security:** distinct hostnames are NOT proof of independent operators, full nodes, chain consensus, or a genuine payment. External provider metadata may be wrong. Do not use diagnostics to settle payments. Validate both services' actual ownership, TLS, data completeness, chain state and node diversity before enabling financial operations.
