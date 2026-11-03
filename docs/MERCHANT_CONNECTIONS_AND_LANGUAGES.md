# Merchant integrations, languages and additional fiat currencies

## Merchant-facing connection screen

Owners/admins can open **Integrations · Mercado Pago** from the payment center:
`/bch-flow/dashboard/organizations/<organization-uuid>/integrations/`.
Viewers, operators and identities outside the organization cannot manage credentials.

Two explicit connection methods are implemented:

- **Connect with Mercado Pago**: OAuth authorization code flow with state, PKCE S256,
  ten-minute expiry, one-time callback consumption, and binding to the original
  identity, organization and opaque browser session. The application exchanges the
  code server-side and verifies the returned user against `/users/me`. Expiring
  credentials are refreshed under a database row lock.
- **Use my own application credentials**: enter a test/production access token and
  webhook signing secret. The server validates the merchant via `/users/me`; it never
  accepts a browser-supplied collector ID. The UI asks for the **BCH Flow** password,
  not the seller's Mercado Pago login password. Password attempts are rate-limited.

A Brazilian merchant account (`site_id=MLB`) is required for the BRL/Pix adapter.
Token-prefix checks are an additional manual-input preflight; payment verification
still checks provider `live_mode`, recipient, amount, currency and request reference.
The screen verifies identity and credential usability, not every product permission
or successful payment. A real provider test is still required.

Tokens and signature secrets use Fernet authenticated encryption with a separately
managed key. They are never returned to the page after saving and are filtered from
Django error reports. Database uniqueness permanently binds each provider merchant
identity to one organization. Replacing the receiver of an organization with payment
history is blocked. The database and encryption key must be backed up separately.

**Disconnect account** erases the application's saved access/refresh/signature
ciphertexts, invalidates pending OAuth grants and places open Pix requests under
review so their public checkout no longer offers a payment code. Disconnected
credentials do not silently fall back to legacy server configuration. Money remains
with Mercado Pago. Merchants should also revoke the application in Mercado Pago to
invalidate provider-side authorization; no unsupported revocation API is invented.

### Administrator prerequisites

For local development:

```sh
.venv/bin/python tools/bootstrap_credential_key.py
# Set the non-secret path in the ignored local .env:
# FLOW_CREDENTIAL_KEY_FILE=/workspace/bch-flow/.merchant-encryption.key
.venv/bin/python manage.py migrate --noinput
```

The bootstrap creates a mode-0600 ignored local key only if none exists. It does
not overwrite or print existing keys. For production, mount a securely managed key
file and set `FLOW_CREDENTIAL_KEY_FILE`; alternatively inject
`FLOW_CREDENTIAL_ENCRYPTION_KEYS`. For rotation, list the new key first and retain
old keys until every encrypted connection has been re-encrypted or reconnected.
There is no `SECRET_KEY` derivation fallback. Loss of all encryption keys requires
merchant reconnection; do not copy them into chat, source code or database rows.

OAuth additionally needs these platform/application settings:

- `MP_CLIENT_ID`: application client ID.
- `MP_CLIENT_SECRET`: server-side application secret, used only for token exchange.
- `MP_REDIRECT_URI`: exact registered HTTPS URL ending in
  `/bch-flow/integrations/mercadopago/callback/`.
- `MP_WEBHOOK_SECRET_FILE`: actual raw platform webhook signing secret in a secure
  mount. OAuth connections use this application's signing secret. Merchant-supplied
  manual connections use their separately encrypted signing secret.

Allow the application's API host `api.mercadopago.com`. The seller's browser visits
`auth.mercadopago.com` for authorization. Configure the existing organization/environment
webhook callback URLs described in `PAYMENT_PLATFORM.md`. Public HTTPS, application
registration, correct product/scopes, callback delivery and real-provider testing
remain required. Never include authorization-code query strings in production access
logs. A proxy-only placeholder cannot serve as a raw local encryption or HMAC key.

Official endpoint behavior was checked against the Mercado Pago Python SDK's
`resources/oauth.py` and `resources/user.py`. OAuth PKCE and the selected merchant
product must be verified with the actual registered application before production.
No live merchant credentials were available during this implementation.

## Language selection

English is the default even when the browser sends another `Accept-Language`.
Users explicitly choose a language in the top language selector. A one-year,
HttpOnly, SameSite=Lax preference cookie retains the choice in that browser.
Production marks this cookie Secure. Language preferences do not affect identity,
permissions, organization ownership, network, currency or financial arithmetic.

Initial language options are English, Brazilian Portuguese, Spanish, French,
German, Simplified Chinese, Japanese, Arabic and Hindi. Arabic uses `dir=rtl`;
amounts, transaction IDs and addresses retain isolated left-to-right formatting.
The payment center, checkout, merchant connection UI, navigation, forms and key
interaction/status messages have catalogs. English is the explicit fallback for
untranslated historical screens and technical error messages. This is not a claim
that every legacy diagnostic or scaffold has a complete translation in every locale.

Sources are standard Django gettext `.po` files under `locale/`. Checked-in `.mo`
files make startup independent of system gettext tools. After editing catalogs:

```sh
.venv/bin/python tools/compile_locales.py
```

The compiler supports the current singular UTF-8 messages and rejects plural/context
syntax; use GNU `msgfmt` when adding those features. Catalogs specify language-appropriate
plural metadata. Keep new user-facing Python strings behind gettext and template
strings behind `{% trans %}`. No runtime translation service receives customer data.

## USD and EUR

BTC/BCH still use satoshis; BRL/USD/EUR use integer cents. USD and EUR have their own
organization/environment accounts and can execute the complete **sandbox** receive,
reserve, authorize, send and audit flow. Database constraints and service guards
reject live USD/EUR accounts. The UI exposes no live/testnet provider selector for
them and routes neither currency into Mercado Pago Pix or a cryptocurrency node.

These are fiat currency units, not USDT/USDC and not exchange-rate estimates. There
is no currency conversion, cross-currency balance summing, deposit rail or real USD/EUR
payout integration. A compatible provider with country/product/account permissions
must be selected and validated before real dollar/euro operations are enabled.

## Validation

PostgreSQL tests cover encrypted persistence, redacted form rendering, roles and
cross-tenant denial, CSRF, state replay/session/expiry/environment rejection, refresh,
disconnection, historical receiver protection, nine language choices, explicit English
default, safe redirects, RTL, precision and USD/EUR ledger isolation.
Browser tests use a separate temporary database and a mocked merchant identity
response. They exercise the credential form without calling a real provider,
verify that secrets disappear after save, switch all languages, check Arabic/mobile
layout, and complete both new currencies' sandbox receipt/authorization/send flows.
These tests are not live OAuth or banking validation.
