# Security invariants

1. No server-side private key custody.
2. No successful-payment claim from wallet callback alone.
3. Validate CashAddr and network, recipient and amount before authorization.
4. Verify transaction outputs and satoshis against invoice; txid is not enough.
5. Guard double matching, partial payment, under/overpayment, expiration, chain reorganizations.
6. Enforce validated tenant membership on every request and worker.
7. Hash server session tokens at rest; rotate on login and revoke on logout.
8. Never enable payment endpoints until live integration, migrations, and tests pass.
