# Financial workspace

`financial/home.html` is the authenticated operations screen. It now uses a
single `financial-workspace.css` and `financial-workspace.js`, plus shared
`workspace-tokens.css`. Signing, receipt catalog and the chart library remain
separate components. Obsolete versioned wallet styles/scripts were removed.
Other pages keep their legacy polish stylesheet through the base template's
`legacy_polish` block; the wallet and software pages opt out. Software uses the
same charcoal/orange tokens. No payment provider, ledger or signing rule changed.

## Interaction contract

- BTC/BCH candles use the existing authenticated CoinGecko endpoint. Drag to pan,
  wheel/pinch to zoom; axis dragging adjusts the scale. Buttons support zoom,
  reset and expansion. Focus the chart to use +/- and arrow keys; Home resets.
  Resizing and periodic refresh preserve the visible range. Choosing a period
  explicitly resets it. Loading/failure states never insert example candles.
- BRL is a histogram of daily credited receipts for the selected account,
  asset/environment and organization's timezone, not a market quotation.
- Search (Ctrl/Cmd K) and status filters affect the recent loaded records only.
  They do not search the full database. The existing limit remains 20 requests
  and 20 withdrawals. Privacy masking covers balances and visible amounts.
- Dialogs preserve focus, use native modal behavior, and support Escape.
  The transfer confirmation is a separate step before the original reservation
  POST. Only the server can authorize, reserve, sign-validate and broadcast.
- Mobile navigation traps keyboard focus and closes on Escape or outside click.
  Expanded charts trap focus and lock background scrolling. Reduced-motion
  preference removes decorative transitions. No motion is needed to operate.
- Pix sending is not offered in provider environments; sandbox sending remains
  explicitly simulated. WizardConnect is restricted to eligible BCH live roles.
  Wallet receiving-account setup remains separate from signing-wallet pairing.
- Software statistics are scoped to the organization and chosen environment.
  Sales and eligible-download totals cover the last seven days. Eligible
  downloads count currently verified paid orders, not completed file transfers.

## Validation

```sh
.venv/bin/python manage.py test app_bch_flow.tests.test_financial_workspace.FinancialWorkspaceTests \
 app_merchant_catalog.tests.test_software app_bch_flow.tests.test_payment_core \
 app_bch_flow.tests.test_nownodes_payments app_bch_flow.tests.test_wizardconnect \
 app_bch_flow.tests.test_payment_concurrency app_merchant_catalog.tests.test_catalog \
 app_merchant_catalog.tests.test_catalog_v11 --noinput

FLOW_BROWSER_TESTS=1 .venv/bin/python manage.py test \
 app_bch_flow.tests.test_financial_workspace.FinancialWorkspaceBrowserTests \
 app_merchant_catalog.tests.test_software_browser.SoftwareBrowserTests --noinput
```

Browser checks require Chromium and Node/Playwright; they use disposable local
PostgreSQL and controlled market data, never live money. Runtime API failures
remain visible. Deploy with collectstatic and restart web processes. No new
migration, environment variable or secret is required for this UI refactor.
