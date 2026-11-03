# BCH Flow V3.4 — Opt-in read-only network adapter

Adds Blockbook v2 HTTPS address transaction polling and a read-only management command.
No automatic invoice status transitions, settlement, wallet signing, broadcasts, or database writes.
Third-party provider responses are untrusted evidence, **not independently verified chain consensus**.

Configuration (server environment, not hard-coded):

- `BCHFLOW_V34_ENABLE_NETWORK=1`
- `BCHFLOW_V34_BLOCKBOOK_URL=https://YOUR-AUDITED-BLOCKBOOK-HOST`
- `BCHFLOW_V34_ALLOWED_HOSTS=YOUR-AUDITED-BLOCKBOOK-HOST`

The provider must serve the BCH **mainnet** Blockbook v2 API, including complete transaction output data (`details=txs`).
The application rejects HTTP, redirects, unallowlisted hosts, unexpected response shapes, incomplete pagination and unsupported chipnet.
Use a trusted provider or your own Blockbook deployment. The server must also enforce outbound network policy to prevent DNS rebinding or internal routing; hostname checks alone are not SSRF-proof.

Commands:

`python manage.py check`

`python manage.py test app_bch_flow.tests.test_v34_network --verbosity 2`

`python manage.py bchflow_v34_probe <INVOICE_UUID> --min-confirmations 1`

The command always labels the result unverified and never writes financial status. Shared receiving addresses are never attributed to a particular invoice.
Do not use as proof of payment, do not use with real funds for settlement, and do not expose the command through public HTTP endpoints.
