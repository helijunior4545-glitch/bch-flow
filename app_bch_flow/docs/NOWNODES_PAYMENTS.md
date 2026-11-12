# Provider-connected BTC / BCH payments

The canonical operational interface is `financial/home.html`. The AI Yako app
(`app_qvac_financial`) is independent and is not modified by this implementation.

## Current capabilities and release evidence

- BTC and BCH share the existing integer-unit ledger, per-account locks, global
  outpoint reservations, authorization expiry and recoverable broadcast workflow.
- NOWNodes supports mainnet public address derivation and chain access without a
  hosted wallet. Core remains available for server-configured isolated watch-only
  RPC wallets. Unknown provider IDs fail closed.
- NOWNodes API tokens are encrypted using the existing credential cipher. A token
  is never placed in a URL or returned to the browser after saving.
- Each managed wallet has its own immutable public key and ledger account. Several
  BTC or BCH wallets can belong to the same organization. Account-level
  mainnet xpub/zpub keys are normalized before the global wallet uniqueness check.
  BTC uses BIP84 P2WPKH, BCH uses BIP44 P2PKH, with branch 0 for receiving and
  branch 1 for dedicated change. Private extended keys and seeds are rejected.
- Every invoice and change allocation is persisted under a connection lock.
  A different public key adds a separate wallet rather than replacing the old one. API credentials
  can be refreshed without changing the wallet or confirmation policy.
- External signing remains mandatory. BCH's legacy Core signing hard stop is
  preserved. The new NOWNodes adapter has its own strict change-address registry,
  package verification and externally signed transaction path.
- A printable receipt is issued only from credited evidence and a paid/overpaid
  request. Unpaid/review requests and sandbox records remain explicitly identified.

Automated tests exercise real **test-key** BTC SegWit and BCH FORKID signatures,
receipt reconciliation/replay, reservations, exact output/script verification,
change, broadcast response loss/recovery, tenant separation and wrong networks.
Node responses and broadcasts are controlled fixtures: they do **not** prove a
live NOWNodes payment. No real funds were sent. A NOWNodes key and allowed network
access were unavailable during implementation; account plan/endpoint access and
production end-to-end payment verification remain outstanding.

## Configure

1. Apply migrations and install `requirements.txt`, including the SVG QR dependency.
2. For Coolify, set the **runtime secret** `FLOW_CREDENTIAL_ENCRYPTION_KEY` to a
   securely generated Fernet key and redeploy. Generate it privately with
   `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
   Never send this value in chat or commit it. Keep the same key across deployments
   and back it up securely: replacing it makes existing credentials unreadable.
   This unlocks credential storage; it does not connect NOWNodes or Mercado Pago.
   Alternatively, configure `FLOW_CREDENTIAL_ENCRYPTION_KEYS` in trusted Django settings, or set
   `FLOW_CREDENTIAL_KEY_FILE` to an administrator-managed Fernet key file. The file
   contains one key per line; newest key first. Keep old keys to decrypt existing
   records during rotation. Never commit keys or place them in setup instructions.
   Explicit Django settings and key-file configuration take precedence over the
   single-key runtime variable. Without encryption, the connection form remains disabled.
3. Live operations retain the existing `FLOW_PAYMENTS_ALLOW_LIVE` setting and require
   DEBUG disabled, HTTPS, and secure session and CSRF cookies. Saving a connection
   performs a read-only chain check; it does not certify payment behavior.
4. Open Organization → Integrations → BTC / BCH. Select NOWNodes, the asset, your
   NOWNodes API key, account public key and confirmation policy. Reauthenticate with
   the BCH Flow account password. The API key must have access to both RPC and
   Blockbook for the chosen asset; check the actual plan in your NOWNodes account.
   Do not assume a free plan includes all endpoints or both assets.
5. Compare the first derived receiving and change addresses with the external
   signing wallet **before funding**. BTC expects the account at `m/84'/0'/account'`;
   BCH expects `m/44'/145'/account'`. The server derives `0/index` and `1/index`.
   An xpub proves public derivability, not control of the private signing key.
6. Run `python manage.py flow_payments_worker --watch --interval 30` as a supervised
   process. HTTP requests do not start the worker. It discovers receipts, checks
   previously credited transactions for reorganizations and freezes accounts when
   an unknown outgoing transaction is detected. The request page's refresh action
   also scans the account when no TXID is supplied.

Required outbound HTTPS destinations:

| Asset | Core RPC | Blockbook |
|---|---|---|
| BTC | btc.nownodes.io | btcbook.nownodes.io |
| BCH | bch.nownodes.io | bchbook.nownodes.io |

`docs.nownodes.io` is useful for current official API documentation. Keep TLS
verification enabled. Endpoints are fixed in the adapter; submitted arbitrary URLs
are never fetched. Network access must be allowed independently of API credentials.

## Receive, send and recover

Create a request on the wallet page. The address/URI and SVG QR contain the real
request amount and address; expired or fully paid requests no longer expose a
payment QR. The worker discovers on-chain payment evidence and credits confirmed
outpoints exactly once. A receipt can be printed/saved as PDF from the request.

To send, enter the destination, amount and explicit maximum fee. Review the
reservation, prepare/download the signing package, then sign **only** in the
external wallet. The package supplies raw unsigned transaction bytes, previous
outpoints, amounts, scripts and account-relative derivation paths. External wallet
support for this import/signing workflow must be checked; it is not a universal
hardware-wallet connector or automatic PSBT flow. The maximum fee is a ceiling,
not a dynamic fee-rate estimate; the current package uses that fee as its budget.

Authorize with the BCH Flow password and paste the signed raw transaction. The
server verifies local transaction bytes, reserved inputs, credited UTXO ownership,
previous transaction amounts/scripts, exact approved destination and internal change,
fee and node mempool acceptance. It commits the expected TXID and reservations
before broadcasting. A timeout remains `unknown`, with funds reserved. Use recovery
against the expected TXID; do not create another transfer. `submitted` means the
node accepted broadcast, not that the transfer is confirmed in a block.

The current public history scan is bounded to 500 transactions per address. If that
limit is exceeded the worker stops with an error rather than silently skipping
history. Large wallets need a paginated/incremental indexer extension. Repeated scans
can consume a free provider plan quickly; tune worker intervals and monitor quotas.
NOWNodes testnet is not configured here; use an explicit Core test/regtest setup.

Mercado Pago credentials are used only for BRL Pix receipts. BTC/BCH never use Pix
credentials. Pix payouts remain disabled without a separately contracted product.

## Additional providers

All financial service and worker entry points select nodes through
`financial.nodes.blockchain_node(account)`. Add a named adapter there and expose
its validated connection fields in `NodeForm`; do not accept arbitrary endpoint
URLs. An adapter must implement readiness/network validation, unique address
allocation, authoritative outputs and UTXOs, discovery, signing-package creation,
strict signed-transaction inspection, broadcast and recovery. Preserve the same
integer units, ownership, finality and reservation contracts. Never map a hosted
node's chain RPC to nonexistent wallet RPC methods such as `getnewaddress`.

## UI and asset changes

The new foundation supplies tokens and controls. Landing, authentication, workspace,
invoice and public checkout have separate layout CSS; wallet and financial detail
styles are rewritten. The primary templates are structurally rebuilt, including a
shared workspace navigation, real request QR, receipt and a transfer review dialog.
Reduced motion, keyboard focus, dialog escape/return focus, copy feedback and busy
states are supported. Layout density is responsive; browser zoom is not overridden.

The repeated `bf106` per-template injections and their 106 unreferenced CSS files,
plus the unused enterprise/microinteraction layers, are removed. Assets still used
by legacy watch-only tools are retained. Placeholder pages remain placeholders;
their missing business features are not implemented by this visual refactor.

## Reproduce the focused test suite

Use an isolated PostgreSQL server whose test role can create a test database. Do
not point this profile at production. Set `FLOW_TEST_DATABASE_URL` securely to the
isolated database URL, then from the repository root:

```sh
DJANGO_SETTINGS_MODULE=app_bch_flow.tests.django_settings python manage.py test \
  app_bch_flow.tests.test_nownodes_payments \
  app_bch_flow.tests.test_payment_core \
  app_bch_flow.tests.test_merchant_integrations \
  app_bch_flow.tests.test_btc_hd_public \
  app_bch_flow.tests.test_v56_financial_guards --noinput
```

This test profile uses fast test-only password hashing and creates a database with
the Django `test_` prefix. The NOWNodes tests do not contact external services.


## HTTP client compatibility

NOWNodes RPC and Blockbook use `requests` with its default HTTP identity, standard
TLS trust and inherited proxy configuration. RPC uses `requests.post(json=...)`
with a lowercase `api-key` header, matching the successful read-only production
`getblockchaininfo` probe. Redirects and automatic retries remain disabled, and
JSON responses are bounded and decoded with exact decimal values. Mercado Pago
and self-hosted Core transports are unchanged.

If a private terminal probe returns HTTP 200 while the application reports 403,
first deploy this transport update and use the same API key in the integrations
form. The probe demonstrates RPC access for that key/container; it does not prove
Blockbook permissions, wallet ownership, or end-to-end payment/broadcast readiness.
No migration or new dependency is required for this transport change.

## Reusing a disconnected BTC connection

Removing an API credential preserves its public wallet registration, derivation
counters, addresses and history. That public wallet remains reserved to the
original asset and organization. Registering the same Electrum BTC public key as
BCH is rejected with a wallet-specific explanation, rather than a Mercado Pago
merchant error. Use a separate BCH account public key matching the supported
BIP44 derivation. The NOWNodes API key can be shared across the BTC/BCH connections
when it has the appropriate endpoint permissions; the wallet public keys remain
separate. Do not rewrite stored asset or fingerprint fields to bypass this check.


## Multiple wallets and lifecycle

Migration `0010_multiple_wallets` links each existing node connection to its
original ledger account. Existing account IDs, balances, invoice references,
addresses, derivation counters, receipts and journals are preserved. Restart web
and payment worker processes with the new code after applying migrations.

Organization → Integrations now lists named wallet cards, showing the asset,
connection state and separate available/reserved balances. Add another BTC or BCH
wallet with a distinct account public key. Reusing the same public key for the
same organization/asset refreshes its credentials instead of creating a duplicate.
Each card opens `payments/?asset=...&environment=live&wallet=<uuid>`; the wallet
switcher and financial navigation preserve the selected ledger. Legacy Core and
sandbox accounts remain separate, without a managed wallet association.

Removal requires owner/admin authorization, CSRF protection and password
reauthentication. Lifecycle changes record actor, wallet ID and asset in the audit
trail without public keys or API credentials. A wallet with no derived addresses, counters or financial history
can be deleted together with its empty account. A wallet with addresses/history can
be archived when its balance is zero and pending requests, withdrawals and reviews
are resolved. Archived wallets remain visible for history and can be restored.
They cannot create new requests, addresses, authorizations or withdrawals.
Credentials are retained encrypted for historical receipt/reorganization scanning;
archiving does not revoke a NOWNodes key. No money or financial history is deleted.

New operations resolve the exact wallet/account. A missing selector in an ambiguous
service call is rejected rather than choosing an arbitrary wallet. IDs from another
organization, asset or environment are rejected. The migration refuses reversal
while multiple wallets/accounts exist, to prevent collapsing independent ledgers.
