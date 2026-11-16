# Software sales and automatic delivery

BCH Flow sells a license to one software release, delivered as a private ZIP.
`app_merchant_catalog` owns packages, offers, orders and download logs;
`app_bch_flow` owns receiving accounts, provider verification and the ledger.
There is no new payment ledger or client-controlled settlement endpoint.

## Seller workflow

1. Apply migrations with `.venv/bin/python manage.py migrate --noinput`.
2. Configure the organization's BTC/BCH watch-only receiving wallet or Mercado
   Pago receiving account using the existing Integrations workflow. Production
   still requires HTTPS, secure cookies, DEBUG disabled, provider credentials and
   explicit `FLOW_PAYMENTS_ALLOW_LIVE`. Publishing does not bypass these gates.
3. Create a product in Catalog. Use its upload action to publish a software
   version. Include the source, README.md and LICENSE.txt in a ZIP no larger than
   100 MB (expanded maximum 500 MB / 10,000 entries). Describe requirements,
   external costs, installation, licensing, support and updates honestly.
4. Set an explicit price and an organization-owned live receiving account.
   Additional BTC, BCH or Pix prices are added from the published-release list.
   Prices are independent fixed amounts, not a browser exchange-rate conversion.
5. Share `/bch-flow/software/products/<product UUID>/`. The software storefront
   and seller sales list are linked from Catalog; My software is in navigation.

Published release files are never edited by this UI. A new upload creates a new
version. Existing orders retain their exact release, name, license and payment
amount; publishing a newer version does not silently change what was purchased.
Archiving the product prevents new sales while retaining paid purchases. Offer
creation and release publication are restricted to the organization's non-demo
owner/admin/operator roles. Private purchase pages require the buyer's identity.

## Payment and delivery contract

- A signed-in non-demo buyer chooses a method. A browser-generated UUID makes
  repeated submissions return the same order; a buyer row lock serializes
  competing submissions. Provider setup happens after order persistence. A
  timeout retains the same order and provider idempotency reference for retry.
- BTC/BCH addresses and Pix codes come from existing adapters, never from user
  assertions. Keep `manage.py flow_payments_worker --watch` supervised. Crypto
  wallet synchronization and Pix polling/signed webhooks reconcile receipts.
- The full amount must have credited receipts, an explicit credited timestamp,
  a paid/overpaid request, a live account and no account freeze or receipt review.
  Partial and unconfirmed receipts do not grant access. Sandbox receipts never
  grant access to a software release.
- The order page polls a read-only endpoint and reloads when its state changes.
  Opening a link or clicking a browser button cannot confirm payment. An approved
  overpayment grants access; handling any excess is a seller support operation.
- Late payments enter review under the existing financial policy. The UI tells
  buyers not to pay again and to contact the seller with the order ID. There is
  no automatic manual-approval or refund action in this release.
- Each download rechecks payment and identity, including after a five-minute
  signed URL was issued. Refund/reversal/reorg review blocks future downloads;
  already downloaded files cannot be recalled. SHA-256 is checked before sending
  the file. Missing or changed files produce a recoverable error, retaining the
  purchase. Download logs record authorized stream attempts, not proof that the
  browser saved every byte.

## Storage and deployment

The current standalone settings use `private_media` as MEDIA_ROOT, with no
public media route. **Do not expose this directory through nginx, a CDN or a
public bucket.** Storage backends must keep `software/releases/` private. Files
are served only by authenticated attachment responses. Preserve release files
and database together in backups; do not delete artifacts referenced by orders.
Set storage/upload limits and request timeouts to accommodate the 100 MB maximum.
ZIP format/path/integrity validation is not malware scanning or certification of
seller code. The seller is responsible for package functionality and rights.

Run `collectstatic --noinput` after deployment; this feature has no npm build
requirement. Keep workers running after web restarts. Live provider keys, endpoint
access and wallet confirmation policies remain deployment prerequisites. Do not
infer a successful real BTC/BCH/Pix sale from fixture tests.

## Validation

```sh
.venv/bin/python manage.py test app_merchant_catalog.tests.test_software \
 app_merchant_catalog.tests.test_catalog app_merchant_catalog.tests.test_catalog_v11 \
 app_bch_flow.tests.test_payment_core app_bch_flow.tests.test_nownodes_payments \
 app_bch_flow.tests.test_payment_concurrency app_bch_flow.tests.test_wizardconnect --noinput

# Optional Chromium UI tests; requires Node with playwright and /usr/bin/chromium.
FLOW_BROWSER_TESTS=1 .venv/bin/python manage.py test \
 app_merchant_catalog.tests.test_software_browser.SoftwareBrowserTests --noinput
```

Browser tests use a disposable PostgreSQL test database, actual login, responsive
product/order screens, a controlled settlement and a downloaded ZIP hash check.
Adapter tests use controlled RPC/Mercado Pago responses for BTC/BCH/Pix worker
reconciliation, including a Pix refund. No test sends money or broadcasts a
transaction. Run database-using suites sequentially on a shared checkout.
