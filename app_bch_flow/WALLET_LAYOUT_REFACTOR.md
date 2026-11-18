# Wallet layout and mobile drawer

The layout refactor preserves the wallet design and financial controllers.
Environment and signing components now render directly in their final shared dock
in `financial/home.html`. The old V20 form-moving block and the separate signing
layout script are no longer executed. Conditional signing permissions still come
from Django; no connection or payment state is inferred from layout.

The wallet drawer has one controller, including after the main element is replaced
by currency navigation. Its close button and controlled sidebar ID are rendered in
HTML. On mobile, the closed sidebar is inert; the open drawer traps keyboard focus,
blocks background interaction and scrolls independently. Closing, Escape, backdrop,
resize and navigation release the lock and preserve the document's scroll position.
The drawer controller loads before the chart/controller bundles. Mobile background
scroll is locked with overflow on the document, without fixing or offsetting the
body. The drawer is capped at 264px / 78vw and menu rows at 208px, retaining
44px minimum touch targets and safe-area padding.

Scoped CSS enforces `[hidden]` and closed native dialogs before JavaScript starts,
keeps wide tables inside their horizontal scroller, and supports touch scrolling,
short screens, dynamic viewport height and the bottom safe area. Navigation active
state distinguishes hash destinations instead of highlighting every wallet link.

Validation:

```sh
FLOW_BROWSER_TESTS=1 python manage.py test \
  app_bch_flow.tests.test_wallet_mobile_layout --keepdb
```

The Chromium checks cover a JavaScript-disabled initial render, widths 320, 390,
768, 800, 801, 850, 1024 and 1440; a 400px-high screen with mobile emulation, normal animations and real touch
gestures in both directions; document touch scrolling after closing;
Escape/backdrop closing, scroll restoration, currency replacement, anchor navigation
and the Receive dialog. Market-data endpoints return controlled unavailable
responses; no live provider credentials or payments are used.

The wallet/WizardConnect regression run executed 23 tests: 20 passed. Three
existing failures (an English archived-wallet assertion under translated settings,
and two CSRF 403 expectations against the host's redirecting failure view) were
reproduced against the original code before these changes. They are not new layout
regressions. This is Chromium validation, not a claim of testing every mobile OS.

No model, migration, balance, payment or signing behavior changed. Deploy updated
application templates and collect static assets; no database migration is required.
