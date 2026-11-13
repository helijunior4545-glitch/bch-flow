# BCH Flow — BCH, BTC and Pix payment workspace

Django application with independent customer identity, organization permissions,
payment requests, receipts and externally signed crypto transfers. Pix support
is receiving through Mercado Pago; real Pix payouts require a separate product.

WizardConnect now provides browser pairing and signature requests for the
existing NOWNodes-connected BCH mainnet payment flow. See
[WizardConnect setup, build and validation](docs/WIZARDCONNECT.md).

## Run and configure

Use the host project's normal Python dependencies, PostgreSQL settings, HTTPS and
migration workflow. Register `app_bch_flow` in the host configuration if reusing
it independently. Run `python manage.py migrate app_bch_flow` and
`python manage.py collectstatic --noinput` when deploying the application.

Provider credentials, public-wallet derivation, worker and signing prerequisites
are documented in [NOWNodes payments](docs/NOWNODES_PAYMENTS.md). Private seeds and
BCH signing keys remain in the external wallet. Pairing does not create ledger
balances or automatically register the wallet's chain-level xpubs as an account.

[Customer jury access](docs/JURY_REVIEW.md) uses a normal pre-provisioned customer
account. Historical sandbox data remains separate from real operations.

## Validation boundaries

See [implementation status](docs/IMPLEMENTATION_STATUS.md) and the
[hackathon checklist](docs/HACKATHON_COMPLIANCE.md). The repository contains real
SDK interoperability tests and test-key BCH signature verification with fixture
node responses. These do not certify deployed public-relay/physical-wallet
compatibility, a completed production mainnet payment, or full hackathon
eligibility. Verify the deployed flow before handling funds or marking those
requirements complete.
