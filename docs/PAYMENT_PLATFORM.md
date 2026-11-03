# Payment orchestration: implementation and activation

This release implements a separate tenant-scoped payment center alongside the legacy
BCH observation tools. The executable local sandbox is not a real payment provider.
The Bitcoin Core/BCH Node and Mercado Pago adapters have fixture-based regression
coverage; no live provider or cryptocurrency network transaction was validated in
this environment. Do not treat passing sandbox tests as production approval.

## What is implemented

- Accounts isolated by organization, BTC/BCH/BRL, and environment. Values are integer
  satoshis/cents. No floating point arithmetic or client-supplied confirmation data.
- Requests with exact amounts, independent receiving references, expiration, signed
  public checkout links, local QR generation, read-only polling and partial receipts.
- Immutable balanced debit/credit movements, nonnegative available/reserved balances,
  account locks, unique provider outputs and idempotency keys with payload checking.
- Receipt verification against configured full nodes or Mercado Pago's authoritative
  payment lookup. Browser actions and legacy observations cannot credit live funds.
- Reservation before withdrawal, owner/admin password reauthentication, five failed
  attempts per five-minute window, five-minute authorization, explicit cancellation,
  externally signed crypto transactions, and bounded fees and authorized change.
- Transaction input claims across tenants. Reservations commit before broadcast.
  Timeouts preserve the expected TXID and reserved balance; recovery queries the
  node instead of issuing a second transfer or automatically refunding a reservation.
- Worker for signed Pix notifications, repeated API reconciliation, full-node wallet
  synchronization and expiration. Reorgs/reversals and unexpected external spends
  freeze affected accounts for investigation. Review resolution is deliberately
  manual; journal rows must not be edited or deleted.
- Responsive payment center with Lucide, native accessible dialogs, privacy toggle,
  reduced-motion support and server-backed status changes. No optimistic success.

The account balance represents reconciled receipts less recorded outflows. It is
not a complete external wallet balance. BRL figures are gross reconciled receipts;
Mercado Pago fees and bank availability must be checked with the provider. Pix
payouts are not implemented: Checkout API receiving credentials do not confer a
transfer/payout API product or permission.

## Local development

From the existing `/workspace/bch-flow` checkout (tasks are already isolated; do not
create a worktree unless requested):

```sh
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py check
.venv/bin/python manage.py test app_bch_flow.tests --noinput
.venv/bin/python manage.py flow_payments_audit
.venv/bin/python manage.py flow_payments_worker --watch
```

Run Django separately with `manage.py runserver 127.0.0.1:8000 --noreload`.
Open the dashboard, choose an organization, then **Abrir carteira**. The payment
center is `/bch-flow/dashboard/organizations/<uuid>/payments/`. The existing wallet
URL still serves legacy read-only BCH diagnostics. No sidebar is added to the wallet.

With `FLOW_PAYMENTS_SANDBOX_ENABLED=True` (local DEBUG default), choose **Laboratório**:

1. Create a request for any supported asset. Open its read-only public checkout.
2. Use **Simular recebimento** in the authenticated request page. This creates only
   simulated units; the QR is intentionally not a valid real payment destination.
3. Choose **Enviar**, enter a `sandbox:` destination, amount and fee limit.
4. An owner/admin authorizes with their own password, then explicitly executes the
   simulated send. Inspect available/reserved amounts and the immutable journal.

## Configure providers, without committing credentials

`docs/payment-providers.example.json` contains selectors and endpoints, not secrets.
Copy it outside the checkout or into an ignored local path. Replace its organization
key with the exact UUID visible in the organization URL. Set `FLOW_PROVIDER_CONFIG_FILE`
to that file. Each organization needs separate provider credentials and node wallet.
Do not reuse a default merchant account across tenants. Do not expose this config as
an editable public API or let clients choose RPC endpoints or credential selectors.

Access tokens can be injected through the environment and used as Bearer credentials.
Local HMAC webhook secrets and RPC passwords can be securely mounted as files. A
network-proxy placeholder is not a local raw HMAC secret or Basic Auth password;
use actual local secret mounts for those operations. Never paste credentials into
chat, checked-in files, logs, or the database.

### Mercado Pago / Pix

1. Configure a merchant/application, appropriate test credentials, collector ID and
   the webhook signing secret. Inject the access token as `MP_ACCESS_TOKEN` and the
   collector ID as `MP_COLLECTOR_ID`, matching the example selectors.
2. Allow HTTPS to `api.mercadopago.com`. The onboarding draft also lists
   `www.mercadopago.com.br` for official documentation. Draft edits must be reviewed
   and saved in environment settings to apply; saving a draft is not connectivity.
3. Register the payment webhook URL:
   `/bch-flow/webhooks/mercadopago/<organization-uuid>/mercadopago_test/`.
   It must be publicly reachable by HTTPS in a provider integration environment.
4. The endpoint validates `x-signature`, `x-request-id`, `data.id`, and timestamp
   tolerance. It queues the resource ID, then the worker re-fetches `/v1/payments/<id>`.
   Receiver, external reference, Pix method, currency, exact amount and live/test mode
   must match. A signed webhook body alone is never payment proof.
5. Run the worker under a supervisor. Pending notifications are retained; inspect
   and retry failed jobs after correcting provider setup. Polling also recovers lost
   notifications, with a one-minute per-request interval and a bounded fair batch.
6. Verify creation, pending, approved, rejected, expired, refunded, delayed and repeated
   notifications with the provider's supported test tools. This has not been executed
   with a real merchant account here. Confirm Pix test capabilities for your account.

The adapter uses the still-supported Checkout API `/v1/payments`, not a fictional
bank-transfer endpoint. Mercado Pago also offers Orders products; the selected
merchant product, credentials and current provider requirements need validation.

Official references consulted:
- https://github.com/mercadopago/sdk-python/blob/master/mercadopago/resources/payment.py
- https://github.com/mercadopago/sdk-python/blob/master/docs/webhooks.md
- https://github.com/mercadopago/sdk-python/blob/master/mercadopago/webhook/validator.py

### BTC / BCH

1. Operate synchronized Bitcoin Core / BCH Node instances on the intended test chain.
   Import the organization's watch-only descriptors/scripts and a usable address pool
   through your node administration workflow. BCH support depends on the deployed
   node's watch-only address derivation capabilities; no server-side keys are created.
2. Configure wallet-scoped RPC endpoints, unique per tenant. HTTPS is required except
   loopback development RPC. Bind the exact node `chain` value and confirmation policy.
   `getwalletinfo.private_keys_enabled` must be false. Initial block download must be
   complete. RPC URLs and credentials are server settings, never browser inputs.
3. Create a testnet request. Address allocation uses `getnewaddress`. The worker reads
   `listsinceblock` and verifies wallet transactions and decoded outputs. An operator
   may also submit a TXID for authoritative verification, never a claimed amount.
4. For sending, reserve amount plus fee limit. **Preparar transação** selects credited
   confirmed UTXOs, reserves inputs and creates an unsigned transaction with only the
   authorized recipient and account-owned change. The proposed fixed fee equals the
   user's entered limit; check it before signing. Download the signing package.
5. Sign with a compatible external wallet using the correct network and BTC/BCH rules.
   Supply the signed hex, not a seed or private key. Reauthorize if five minutes passed.
   The server rechecks ownership, inputs, outputs, fee, and mempool acceptance before
   broadcasting. This is a manual external-signing workflow, not a completed wallet
   extension/WalletConnect integration.
6. Test broadcast timeouts, already-spent inputs, fee changes, reorgs, conflicting
   transactions and process restarts against actual nodes before any mainnet pilot.

## Production boundaries

`config.settings` remains local-only. A separate `config.production` entrypoint expects
explicit `FLOW_ALLOWED_HOSTS`, `FLOW_DATABASE_URL` (PostgreSQL with TLS verify-full),
a strong `DJANGO_SECRET_KEY`, HTTPS and secure cookies. Existing local `DB_*` settings
remain constrained; use `FLOW_DATABASE_URL` for production, not those development
variables. Provide CA trust for your database and run `check --deploy` against actual
production configuration. Use a real WSGI/ASGI server and trusted reverse proxy; never
Django runserver. Enable proxy-header trust only behind a proxy that strips untrusted
incoming headers. The production entrypoint has not been deployed or validated here.

Production sandbox is disabled. Real provider operations additionally require an
explicit `FLOW_PAYMENTS_ALLOW_LIVE=True`, live organization-specific configuration,
mainnet node chain or Mercado Pago `live_mode=True`, and validated credentials. This
flag is an activation gate, not a security certification. Live configuration is not
authorized to move real funds merely by writing a request or displaying a QR.

Before a public launch, complete provider and real-node integration testing,
independent security review (including authentication/2FA, tenant boundaries and
approval permissions), migration rehearsal, monitoring/alerts, process supervision,
backup restoration and incident/review procedures. Confirm business/legal obligations
and payment provider contracts. Do not enable real payouts on test evidence alone.

## Evidence and remaining work

Automated PostgreSQL tests cover complete sandbox flow, tenant denial, exact units,
concurrent receipts/withdrawals, idempotency, partial/late/overpayments, immutable DB
records, signature rejection, Pix response mismatches, mempool transaction validation,
and uncertain-broadcast recovery. Browser checks exercised the sandbox for all three
assets, QR loading, checkout status, password authorization, mobile layout and dialogs
using a separate temporary database that was dropped after the run.

Outstanding external prerequisites: Mercado Pago credentials and webhook secret,
a reachable HTTPS callback, isolated node wallets and RPC authentication. Outstanding
product integrations: contracted Pix payout product, guided external wallet signer,
review/refund operations and production operational/security validation. No real
funds have been moved by this implementation session.

## Merchant self-service and internationalization update

The merchant connection screen is now implemented. Owners/admins can manage their
Mercado Pago connection directly in the application, with encrypted credentials,
OAuth/PKCE, identity validation and explicit disconnection. See
[Merchant connections, languages and currencies](MERCHANT_CONNECTIONS_AND_LANGUAGES.md)
for setup and remaining provider validation. The earlier server-only configuration
instructions remain a legacy fallback only when no managed connection record exists.

English is now the default. The language selector supports nine languages with RTL
for Arabic and English fallback for untranslated legacy content. USD and EUR are
independent sandbox fiat accounts; live deposits and payouts are not enabled.
