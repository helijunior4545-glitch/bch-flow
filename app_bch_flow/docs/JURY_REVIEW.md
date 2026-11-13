# BCH Flow — normal customer access for jurors

The jury button signs in to **one pre-provisioned BCHIdentity customer account**.
It uses the same password verification, opaque sessions, membership permissions,
wallet UI and provider-integration routes as ordinary customer login. It opens
`financial/home.html` with `asset=BCH&environment=live`. It does not create a new
identity on click, issue simulated funds, prepare example payments, or configure
an on-chain wallet on behalf of the account.

The dedicated customer organization starts without funds, payment accounts or
provider connections. The normal wallet shows a **Connect your first wallet**
action. Jurors can inspect the ordinary workflow and integration screens without
funding the account. Creating provider-backed payment requests still requires
normal wallet/provider setup. There are no signing keys or example funds added.
The jurors share the account's data; each browser gets a separate normal session.
A different authenticated customer's session is preserved by the jury entry.

## Coolify configuration and account creation

Set these runtime variables in the production application in Coolify:

```dotenv
FLOW_JURY_EMAIL=jurors-test244@gmail.com
FLOW_JURY_PASSWORD=<the generated password from the private credentials file>
FLOW_JURY_ORGANIZATION_SLUG=bch-flow-jury
```

Keep the generated password in Coolify's secret configuration, outside Git. The
password is not rendered into page HTML or sent as a browser query parameter. It
can also be used with the normal email/password sign-in form. No email is sent and
no Gmail mailbox is created by provisioning this BCH Flow account.

Redeploy after saving the variables. Both `scripts/container_start.sh` (Docker)
and `Procfile` now run the following after normal database initialization:

```sh
python manage.py bchflow_setup_jury --if-configured
python manage.py collectstatic --noinput
```

The command creates the normal customer identity and its organization once.
Later deployments verify the configured password and preserve all account data.
It will not reset another customer's password, take over an existing organization,
promote a legacy demo identity, or seed funds. Missing variables skip provisioning
and disable the jury button. Partially configured/invalid credentials produce a
configuration error; errors never print the password. Correct configuration and
redeploy, or run the command explicitly in the production application terminal:

```sh
python manage.py bchflow_setup_jury
```

The public login POST only authenticates this already-provisioned account. If the
account is unavailable it renders a translated error without creating a fallback
identity. Existing sessions are revoked when the same browser enters again.
Normal authentication cookies retain the existing secure/HttpOnly settings.

No new schema migration is introduced in this revision. Keep the previously
required `0011_bchidentity_is_demo` migration: historical demo accounts retain
sandbox restrictions and their old ledger entries are not converted into real
funds. They are no longer provisioned by the jury button. Old demo sessions can
open the login page and enter the new customer account.

## Interface

Login and registration use a centered layout with a prominent customer-account
jury entry above the normal forms. The landing invitation reflects the real
customer workflow. The navigation sidebar is sticky on desktop with a separately
scrollable menu and a visible footer; mobile keeps navigation and sign-out in a
compact sticky header. A short desktop viewport also preserves footer access.

English is the source language. New text is translated in the committed Brazilian
Portuguese, Spanish, French and German catalogs. Existing legacy translation gaps
remain measurable with `python manage.py flow_translations`. Compile edited
catalogs with `python manage.py flow_translations --compile`, then restart workers.

## Validation

Point `FLOW_TEST_DATABASE_URL` at an isolated local PostgreSQL database and run:

```sh
DJANGO_SETTINGS_MODULE=app_bch_flow.tests.django_settings \
python -m django test \
  app_bch_flow.tests.test_jury_experience \
  app_bch_flow.tests.test_payment_core \
  app_bch_flow.tests.test_merchant_integrations \
  app_bch_flow.tests.test_multiple_wallets \
  app_bch_flow.tests.test_v56_financial_guards --noinput
```

The selected suites passed 87 distinct tests, including customer provisioning/authentication,
idempotence, CSRF, account preservation, legacy-demo isolation, integration access,
and no invented balances. Chromium verified centered login on desktop/mobile,
normal live wallet and integration access, visible sidebar footer during page
scroll at 1440×1000, 1440×600 and 390×844, and normal logout. Production account
creation requires the above Coolify configuration; local validation does not
establish that credentials or accounts have been installed in production.
