# BCH Flow privacy base

The consent UI, JavaScript, CSS, translations and policy views belong to
`app_bch_flow`. There are no imports from `app_home`, the social-network app,
site consent models, host context processors or organization permissions.
The component is included by the BCH Flow base and the separate financial
checkout template. Its links therefore cover the public storefront, product,
purchase, order, checkout, authentication, landing and policy pages, as well as
workspace pages. No wallet product modal was changed.

## Meaning and persistence

This is a browser privacy preference, not acceptance of product licenses,
authorization of a payment or an auditable server-side consent register.
Essential storage remains available when the visitor refuses optional content.
Only optional external media is a selectable category; this component does not
install analytics or marketing integrations.

The first-party local-storage key is `bchflow:privacy:<reversed home path>`, scoped
to the app mount. The stored version, timestamp, essential flag and external-media
boolean expire after 180 days. Missing, invalid, obsolete or expired records deny
optional media. No identity, IP address, current purchase URL or guest purchase
token is recorded or transmitted by this component. A choice applies to this
browser; it is not synchronized with an account or another app. Storage errors
are visible, with an in-memory choice for the current page. Cross-tab changes
and restored pages re-evaluate permission. Increase the JS VERSION when a policy
change requires a fresh choice.

## Optional content integrations

Resources must not have a live external `src`, iframe, script, preconnect or CSS
URL before permission. On a user's permission, integrate through:

```js
const unregister = window.BCHFlowPrivacy.register(
  'external_media',
  () => mountExternalPlayer(),
  () => removeExternalPlayerAndItsResources()
);
```

Registration invokes `start` only with current permission. Withdrawal calls
`stop`, including cross-tab withdrawal. Both callbacks are mandatory. Register
after `consent.js` has executed (its script is deferred). Do not initialize a
third-party resource before registration. First-party uploaded videos do not
require optional external-media permission. Future integrations must follow
this API; it is not a network interception layer for arbitrary third-party code.
The bubbling `bchflow:consentchange` event communicates the current boolean flags.

## Public documents

`policies/privacy/`, `policies/cookies/` and `policies/terms/` are public, translated
routes under the app mount. Their initial text describes the platform and this
component's behavior. Deployment-specific operator/contact, retention and seller
legal terms must be maintained by the operator; this base does not invent an
operator identity, retention schedule or claim legal certification.

## Validation and deployment

```sh
FLOW_BROWSER_TESTS=1 python manage.py test \
  app_bch_flow.tests.test_privacy_consent --keepdb
```

Tests exercise public routes, first-choice denial, reject/persist, customization,
revocation/teardown, cross-page and cross-tab behavior, bad and expired storage,
blocked storage, no JavaScript, and component layout at 320–1440px.
No models or migrations are added. Deploy the updated templates, run
`collectstatic`, and reload the application. PO and compiled MO translations are
included for Portuguese, Spanish, French and German; English is the source text.
