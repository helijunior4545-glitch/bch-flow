# BCH Flow V1: identity, organizations, schema

- Independent BCHIdentity, hashed passwords, opaque digest-only session tokens, CSRF-protected forms.
- Logical tenant organizations with membership roles and organization-scoped queries.
- Expanded finance schema: transaction network+txid uniqueness; payment output uniqueness; tenant checks in model.clean (service must also enforce).
- No migration executed automatically. No production blockchain payments, no wallet signatures, no rate provider.
- Sessions cookie is Secure: HTTPS required for browser login. Requires Django SECRET_KEY and CSRF middleware.
- The dedicated PostgreSQL alias `bch_flow` and router must be configured in the host; this installer does not change host settings.
- After Django host check: `python manage.py makemigrations app_bch_flow` then review generated migration and only after DB validation `python manage.py migrate app_bch_flow --database=bch_flow`.
- Existing deployed tables require an explicit migration/data-preservation plan. Do not blindly apply first migration.
