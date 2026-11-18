# Software storefront

The public software storefront uses the existing release/offer data and catalog
product images. Only software with an available offer is listed; unpublished,
archived, inactive-organization and frozen-account products are excluded by the
existing `available_offers()` query. Product images are served through the same
public-availability check, without opening the seller catalog administration.

The shared software shell supplies navigation, footer and styling for product,
checkout and purchase pages. The two decorative WebP banners are local static
assets with separate HTML text, so translations never require editing images.
Lucide supplies application/action symbols; payment marks reuse BCH Flow's SVGs.

## Collection behavior

Without JavaScript, all published cards remain usable in a normal grid. With
JavaScript, each collection page has six cards (3 × 2) at 1000px+, four at 620px+,
and two stacked cards on smaller screens. A single page has no rotation controls.
Search matches seller-supplied names, descriptions and visible card text. Filters
use actual payment offers rather than invented software categories.

Multiple pages rotate every 6.5 seconds. Hover, focus and hidden tabs temporarily
suspend rotation. Manual navigation, dragging, swiping, filtering and searching
pause it until the user starts it again. Reduced-motion preferences disable
automatic rotation and smooth scrolling. Arrows, Home/End, page buttons, native
touch scrolling and mouse dragging are supported. Off-screen pages are inert to
keep keyboard navigation inside the visible cards.

The language policy lives in `app_bch_flow.localization.SoftwareLocaleMiddleware`,
registered before any host locale middleware. It uses only Django and resolved
BCH Flow view names, so it also works at a different standalone mount path.
There is no import or software-specific rule in `app_home`.

English is the default for the public software routes. The existing language selector
cookie and explicit URL language take precedence. UI translations and compiled
catalogs live under `locale/{pt_BR,es,de,fr}/LC_MESSAGES`. Seller-entered names,
descriptions, requirements and licenses retain their original catalog content;
there are no translated product fields in the current model.

## Validation

With the normal full Django application settings and a disposable PostgreSQL test
database configured:

```sh
python manage.py test app_merchant_catalog.tests.test_storefront --keepdb
FLOW_BROWSER_TESTS=1 python manage.py test app_merchant_catalog.tests.test_storefront --keepdb
python manage.py test app_merchant_catalog.tests.test_software app_merchant_catalog.tests.test_guest_software --keepdb
```

Browser checks require Node, Playwright and `/usr/bin/chromium`. They create
products only in the disposable test database and save screenshots under
`/tmp/bch-storefront`. The checks cover the saved image, publication visibility,
localization, 320–1440px layouts, 6/4/2 grouping, autoplay, manual controls, mouse
dragging, search/filtering and reduced motion.

With the current full environment settings, two existing commerce assertions fail:
`test_foreign_account_cannot_be_published` expects an English validation message
on the Portuguese seller dashboard, and `test_csrf_is_required_for_guest_checkout`
expects HTTP 403 while the configured custom CSRF failure view redirects with 302.
Both failures also reproduce with the original locale middleware. The six new
storefront checks pass.

## Discovery controls

The technology ribbon and compact language disclosure belong to BCH Flow.
Thirty illustrative 3D technology sculptures share one local transparent WebP
atlas (about 440 KiB). No icon CDN, 3D runtime, animation framework or complete
JavaScript icon package is loaded. The atlas is generated artwork with recognizable
technology marks; the names are rendered separately as accessible HTML text.
The symbols have no surrounding cards, borders or tiles.
The ribbon uses a linear CSS transform with equal repeated groups for a seamless
loop. Pointer interaction pauses it and identifies the selected technology.
Keyboard navigation exposes the original group as a scrollable list. Rotation
pauses off-screen and in hidden tabs, and is disabled with reduced motion.

The 42px language bar uses a native details disclosure and the existing CSRF
protected language POST endpoint. Selecting an autonym submits immediately,
including without JavaScript. Escape, arrow keys, outside clicks and focus leaving
the menu are supported. A quiet announcement rotates every 7.5 seconds with
real links to software, purchases and the creator workspace. It pauses for focus,
interaction and hidden tabs; reduced motion keeps a static message. The utility strip keeps the contextual message and language control; fixed
purchase/workspace links live in the primary navigation to avoid duplication.
Components are included only from BCH Flow templates.

The storefront cards use a Download CTA with a download-tray icon. Each CTA opens
the existing product purchase form at `#checkout-title`; it does not create an
order or serve the archive. The card explicitly states that availability follows
payment confirmation, and shows the seller prices and source-code inclusion.
Dark primary navigation has explicit high-contrast hover and keyboard-focus colors.

Compact cards use a fixed, modest preview frame with `object-fit: contain` and
no hover zoom, so portrait, square and landscape artwork remains entirely visible.
Names, creators and versions are ellipsized; descriptions are limited to two
lines. Full names remain accessible and full catalog text is used for search.
Prices are not truncated, and the Download action shares their row. Hover, focus
and press states use lightweight CSS transitions with reduced-motion support.
Browser checks include long unbroken text and the maximum permitted BCH price.
