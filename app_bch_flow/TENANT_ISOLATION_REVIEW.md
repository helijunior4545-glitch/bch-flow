# BCH Flow account and organization isolation review

## Confirmed defects and changes

The authenticated software library previously combined `buyer=current_identity`
with a persistent browser guest capability and recovered guest grants. Consequently,
logging into account B on a browser that had made guest purchases could expose
those purchases in B's library. Logout did not clear those capabilities. The new
regression tests reproduced the library disclosure before the correction.

Authenticated software access now uses only the authenticated buyer. Login,
registration, jury entry and logout clear the BCH software guest cookie and recovery
grants. Other host application session data is preserved; orders and payments are
not deleted or reassigned. Guest recovery links continue to restore their own order
in a signed-out guest session. A logged-in customer must sign out to use a guest
purchase recovery link rather than silently importing it into that account.

A valid explicit login POST now authenticates the submitted credentials even when
another BCH session exists, and revokes the old browser token on success. Invalid
credentials return the form instead of redirecting as though a switch succeeded.
An existing local variable named `_` also shadowed gettext on failed login and
duplicate registration; those error paths now render normally without changing
the authenticated identity. Existing GET login behavior and the configured jury
account rules remain in place.

Some private dashboard/catalog pages lacked anti-cache headers. The BCH privacy
middleware now applies `private`, `no-store`, `max-age=0` and `Vary: Cookie,
Accept-Language` to resolved BCH dynamic routes, including redirects and denied
responses. It is registered outside the jury middleware. Static files retain their
normal cache behavior.

A non-authenticating random browser-context nonce changes on account transitions.
Shared BCH page code reloads restored history and old tabs when that context changes.
The nonce contains no identity or authentication token and cannot grant access.

## Checked boundaries

| Surface | Verification |
| --- | --- |
| Software purchases, order/status, retry and download | Foreign buyer/guest IDs denied; browser guest capabilities excluded when signed in |
| Login, registration, logout | Old token revoked, guest permissions removed, unrelated host session preserved |
| Organization workspace and invoice API | Distinct organization IDs denied; API list contains only authorized invoices |
| Invoice details, payment-link sharing and evidence | Foreign resource ID cannot override an authorized organization in the URL |
| Wallet, receive/send preview, diagnostics, monitor and chipnet views | Foreign organization denied before page content or operations |
| Wallet modal panels | Original authorization still enforced for each delegated view |
| Financial home and provider integrations | Foreign organization denied |
| Private catalog, product API and seller sales | Foreign organization denied |
| Revoked memberships | Requests stop succeeding once membership is inactive |
| Browser navigation | Guest → A → logout → B tested; old A tab reloads and A's private orders are denied |
| Payment and artifact delivery | Existing guest/account Chromium purchase and ZIP download tests pass |

The public software storefront, offered product images and explicit signed public
payment URLs are intentionally public. Sharing a deliberately public payment link
does not authorize the organization dashboard or software download.

## Validation and limits

The new tests use disposable PostgreSQL data and separate identities/organizations;
Chromium tests also exercise the browser's retained guest cookie, account switching
and an old tab. Run:

```sh
FLOW_BROWSER_TESTS=1 python manage.py test \
  app_bch_flow.tests.test_tenant_boundaries \
  app_bch_flow.tests.test_v3_foundation \
  app_bch_flow.tests.test_v3_invoices \
  app_merchant_catalog.tests.test_storefront \
  app_merchant_catalog.tests.test_software_browser --keepdb
```

The focused command above executed 36 tests, all passing, including Chromium
account switching and existing purchase/download flows.

The wider financial, wallet, jury and software suite executed 92 tests: 83 passed
and 9 failed on existing UI text/translation expectations and the host CSRF failure
view's redirect status. All 9 failures were rerun against the original tracked code
and reproduced. They are separate from the newly corrected purchase disclosure.
The guest suite likewise retains its previously documented CSRF 302/403 assertion
mismatch. Placeholder files in the tenancy/security test directories are not
counted as isolation coverage.

This review validates the listed scenarios, not every possible route, browser or
production configuration. It does not query production customer data or establish
whether a production CDN overrides the new response headers. Deployment should
purge any retained BCH dynamic-page cache and refresh existing browser sessions.
No schema migration is required. Deploy the application and run collectstatic for
the new session-privacy script. No app_home behavior or global Django user session
is changed.
