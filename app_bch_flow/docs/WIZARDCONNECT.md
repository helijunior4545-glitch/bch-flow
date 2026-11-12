# WizardConnect integration

BCH Flow now uses the official Riften Labs WizardConnect SDK for BCH wallet
pairing and signature requests. This is an implementation of the WizardConnect
option, not an XO Template implementation. The server does not implement or
approximate the encrypted transport protocol.

## User journey

1. Open the BCH live wallet or Organization → Integrations.
2. Choose **Connect with WizardConnect** and scan the QR using a compatible BCH
   wallet. The code is a pairing URI, not a payment request. Pairing requires no
   app password, provider API key, seed or signing key. Only share it with your
   own wallet.
3. The browser uses `@wizardconnect/core` 0.2.5 and `@wizardconnect/dapp` 0.2.2 to
   negotiate `hdwalletv1` over Nostr/NIP-17. It shows connected status only after
   `walletready`, not merely after a WebSocket opens.
4. Receive/change public paths stay in a browser-tab session scoped to the BCH
   identity and organization. The browser derives a public receive address using
   libauth. This display is not a balance, receipt, or server-verified ownership
   claim. Disconnect/logout removes pairing credentials. Transport identity keys
   are distinct from BCH signing keys and never sent to Django.
5. To sign a payment, first register the same BCH wallet's account-level mainnet
   xpub and NOWNodes credentials using the existing Integrations form. Pairing
   alone does **not** auto-create a ledger/payment wallet or transfer a wallet's
   preexisting balance into BCH Flow. The current connector signs the normal
   reserved/reconciled payment workflow; it is not a standalone wallet explorer.
6. Create a normal BCH withdrawal and authorize it with the BCH Flow account
   password. Choose **Sign with WizardConnect**. The server prepares the reserved
   package and requires active organization approver membership, BCH mainnet,
   NOWNodes, and the current user's unexpired approval.
7. Before requesting a signature, the browser compares each wallet-derived public
   key and source script against the reserved inputs. Wrong wallets are refused.
   The request includes source outputs and receive/change input paths. It sets
   `broadcast: false`, so the wallet is asked only to sign.
8. Approve in the wallet. The browser checks that only input unlocking bytes
   changed, then fills the existing signed-transaction field. It never submits the
   form automatically. The user still reviews and chooses **Validate and
   broadcast**. Existing server checks, current approval, authoritative previous
   outputs, maximum fee, input reservation, mempool acceptance and recovery remain
   in force. A failed/expired/rejected signature never credits a balance or proves
   a payment.

This reduces the manual signing step for an existing payment wallet. It does not
automatically import WizardConnect's chain-level xpubs into the existing
account-level-xpub NOWNodes registration. Supported-path and registered-wallet
matching errors are explicit; no chain xpub is misrepresented as a parent account
xpub.

## Deployment and dependencies

No migration or new server credential is required. Redeploy the updated code and
run the normal `collectstatic` step. Browser communication requires outbound
WebSocket access to the SDK's configured public relays:

- `wss://relay.riften.net:443`
- `wss://relay.cauldron.quest:443`

Relays can optionally be configured by the administrator with the comma-separated
`FLOW_WIZARDCONNECT_RELAYS` runtime variable. Production accepts WSS URLs without
credentials or paths. Plain WS is permitted only for localhost in DEBUG tests.

If a CSP is configured upstream, permit these hosts in `connect-src` and permit
the SDK's WebAssembly usage as appropriate. HTTPS/secure context is required
(except localhost). Pairing retries, QR expiry, cancellation and disconnect are
visible. The connector is loaded only on the relevant wallet/integration pages.
The generated bundle is committed so production does not fetch npm at startup.

Rebuild from the pinned app lockfile:

```sh
cd app_bch_flow
npm ci
npm run build:wizardconnect
```

Sources are in `frontend/src/wizardconnect.js` and `wizard-protocol.js`; the server
adapter is in `wallets/wizardconnect/`. Upstream library source and documentation:
https://gitlab.com/riftenlabs/lib/wizardconnect . LGPL-3.0-or-later and accompanying
GPL text plus third-party notices are retained under `static/app_bch_flow/vendor`.
The upstream SDK is used unmodified. This repository includes the integration
source, lockfile and build recipe.

## Validation and limits of evidence

- 80 Django tests passed: eight connector tests and existing NOWNodes, payment-core
  and jury-account suites. They include a BCH FORKID test-key signature accepted
  through the existing submit flow with fixture RPC responses. No real funds or
  real provider broadcasts were used.
- Two Node tests pair the official dapp and wallet SDKs through a local test Nostr
  relay, exercise encrypted signing messages with a public-only fixture and
  externally signed test-key bytes, and reject wrong wallets, automatic-broadcast
  requests and changed signed transactions.
- Browser pairing tests use that official wallet SDK fixture and native browser
  WebSockets connected to a local relay configured in DEBUG mode. They do not certify public-relay uptime
  or compatibility with a particular installed end-user wallet version.

To reproduce (use a disposable local PostgreSQL URL, never production):

```sh
FLOW_TEST_DATABASE_URL=<isolated-postgresql-url> \
FLOW_WIZARD_FIXTURE_PATH=/tmp/bch-wizard-fixture.json \
DJANGO_SETTINGS_MODULE=app_bch_flow.tests.django_settings \
python -m django test app_bch_flow.tests.test_wizardconnect \
 app_bch_flow.tests.test_nownodes_payments app_bch_flow.tests.test_payment_core \
 app_bch_flow.tests.test_jury_experience --noinput

cd app_bch_flow
FLOW_WIZARD_FIXTURE_PATH=/tmp/bch-wizard-fixture.json \
node --test tests/wizardconnect-sdk.test.mjs
```

The fixture has public chain xpubs, a planned transaction and already-signed test
bytes; it contains no seed, wallet private key or real provider token. The wallet
fixture represents approval and returns those bytes; it is not a production wallet
implementation.

Before claiming **verified hackathon compliance**, pair an actual compatible BCH
wallet through the public relay on the deployed HTTPS app, demonstrate cancel and
wrong-wallet behavior, and complete an authorized BCH mainnet payment through the
app. Do not infer live readiness or organizer acceptance solely from these tests.
The banner, presentation, source link, CashTokens donation address and participation
requirements are independent and remain on the hackathon checklist.

## Electron Cash / Electrum compatibility

The Electron Cash standard source inspected at commit
`7f4afadbf62a6daa1d6d0563d0951141ddcc6a7c` (2026-11-11) has no native
WizardConnect/WalletConnect/CashConnect connector references in its Python,
JavaScript or documentation files. This does not establish compatibility with
uninspected third-party plugins or future releases. Do not claim native Electron
Cash pairing based on this implementation. Bitcoin Electrum is outside this BCH
connector's scope. The existing external/manual signing flow remains available;
for WizardConnect pairing, use a wallet or plugin that actually implements the
protocol and validate that exact version before the hackathon review.

The Paytaca app source inspected lists `@wizardconnect/core` 0.2.5 and
`@wizardconnect/wallet` 0.2.3, matching this integration's SDK generation:
https://github.com/paytaca/paytaca-app/blob/master/package.json . Cashonize source
also lists the WizardConnect SDK:
https://github.com/cashonize/cashonize-wallet/blob/main/package.json . These are
source-level compatibility indicators, not certification of the user's installed
release. Verify the exact wallet version with a live pairing before relying on it.
