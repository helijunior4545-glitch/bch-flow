# Organization overview

`dashboard/index.html` now extends the BCH Flow base directly. Its layout and
interactions live in `css/pages/dashboard.css` and `js/pages/dashboard.js`.
The overview no longer loads the payment-center or shared workspace CSS; those
files remain in use by organization pages and were not changed.

The page uses real active memberships from the existing dashboard view. It does
not aggregate balances, expose another account's spaces, create financial state,
or invent a team/settings destination. Each card links to its organization's
existing wallet, catalog and workspace. Roles are translated in the template.

The layout starts with one column, then adds a two-column organization grid and
a desktop sidebar. Long names/slugs truncate visually while remaining in the DOM.
Search is local, accent-insensitive, has an announced result count, and persists
no organization data. Native modal navigation manages background focus on mobile;
Escape, backdrop, links and desktop resize close it and release the scroll lock.
The menu is hidden before JavaScript loads, with a no-JavaScript fallback.
Motion is limited to small hover/press effects and respects reduced motion.

English remains the source language. New strings are included in the BCH Flow
Portuguese, Spanish, French and German PO/MO catalogs, using the existing picker.

Validation:

```sh
FLOW_BROWSER_TESTS=1 python manage.py test \
  app_bch_flow.tests.test_dashboard_overview \
  app_bch_flow.tests.test_wallet_mobile_layout \
  app_bch_flow.tests.test_software_localization --keepdb
```

Checks include account isolation, inactive memberships, login, Portuguese text,
Chromium at 320–1440px, long organization names, search/empty results, modal touch
scrolling and closing, translated layouts, and no-JavaScript navigation. Browser
fixtures use disposable identities and organizations; no payments are sent.

Deploy templates and static assets (`collectstatic`) and reload the application.
No model changes or database migrations are required.
