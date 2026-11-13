# Architecture

Independent Django app, own identity and membership models, dedicated PostgreSQL alias, organization-scoped data, wallet authorization in user wallet, blockchain verification on server.

## Host integration constraints

Django `AUTH_USER_MODEL`, session middleware, URL routing and database routers are process-global. Custom BCH identity must not be wired as a second global AUTH_USER_MODEL. Session cookie and authentication boundary require an audited, dedicated middleware implementation before activation. A separate database requires explicit routing for reads/writes/migrations and careful cross-DB FK policy; Django does not enforce foreign keys across databases. Do not assume `default` is the dedicated database.

## Explicitly missing

Mainnet provider integration; verified WizardConnect/XO protocol; secure auth middleware, login, CSRF flows, verification, idempotent reconciliation, tenant authorization enforcement in endpoints, actual DB migrations, deployment. These are not functional in the scaffold.
