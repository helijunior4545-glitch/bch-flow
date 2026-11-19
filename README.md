# BCH Flow

**Your payment. With clarity.**

BCH Flow is a Django-based payment platform and digital software marketplace. It brings merchant payments and downloadable software products together, with checkout options for **Bitcoin Cash (BCH)**, **Bitcoin (BTC)** and **Brazilian Real (BRL) via Pix**.

The marketplace is designed around a straightforward transaction: a seller publishes a software product and a release archive; a buyer chooses a payment method; and the platform makes the purchased release available after payment has been verified.

## What BCH Flow is

BCH Flow combines two related capabilities:

- **Merchant payments:** payment workflows for supported digital assets and Pix.
- **Software marketplace:** a catalog where developers and businesses can publish and sell downloadable software.

It is intended for one-time digital software purchases. The marketplace delivers the purchased files; it is not, by itself, a hosting, SaaS, installation, or ongoing maintenance service.

## Marketplace

Sellers can publish software products with release information and a downloadable archive. A listing can include:

- Product name, description and version
- Price and supported payment methods
- ZIP release archive
- Requirements, installation notes and release notes
- License and support information
- Optional product images and promotional video

The marketplace is intended to support many kinds of software, not a single framework or programming language. Examples include business applications, scripts, automation tools, APIs, libraries, plugins, AI agents, desktop applications, mobile apps, e-commerce tools and templates.

### Buyer experience

1. Browse the software catalog and open a product page.
2. Choose an available payment method: BCH, BTC or Pix (BRL).
3. Complete the checkout.
4. Download access becomes available after the server verifies the required payment.
5. Download the release associated with the purchase.

A buyer does not need to provide a private wallet key to BCH Flow. Payment status shown by a browser or checkout page is not, by itself, proof of settlement.

## Payment and delivery principles

- **Payment-gated delivery:** an order must meet the server-side payment requirements before its download is unlocked.
- **Release-specific purchases:** an order is associated with the software release purchased.
- **Integrity checks:** release archives are inspected and their SHA-256 digest is recorded for integrity verification.
- **Private download access:** downloads use controlled access rather than exposing the release archive as a public file.
- **No private-key collection:** BCH Flow is designed not to ask users to disclose their wallet private keys.
- **Pix support:** BRL checkout is presented as Pix where configured.

Payment providers, network confirmation rules and production configuration determine whether a payment can be considered settled. Do not treat a demo, sandbox receipt, pending transaction or unverified provider response as a completed payment.

## Technology

- Python
- Django
- PostgreSQL
- Bitcoin Cash and Bitcoin payment integrations
- Pix payment integration
- HTML, CSS and JavaScript

The repository includes the Django application modules for BCH Flow and its merchant software catalog.

## Repository layout

| Path | Purpose |
| --- | --- |
| `app_bch_flow/` | Main BCH Flow application and URL integration |
| `app_merchant_catalog/` | Merchant software catalog, releases, orders and downloads |
| `examples/software/` | Software examples |

Other project and infrastructure files are maintained in the repository.

## Development

BCH Flow is developed as a Django project. To work on it locally:

1. Clone this repository.
2. Create and activate a Python virtual environment.
3. Install the dependencies defined by the project.
4. Configure the environment variables and services required by your local setup.
5. Apply Django migrations.
6. Run the project's tests before making changes.

The exact environment configuration depends on the payment providers and infrastructure you intend to use. Never commit API credentials, wallet secrets, private keys, production database credentials or other sensitive configuration.

## Security considerations

This project handles payment state and paid digital downloads. Before deploying or modifying it:

- Keep payment verification on the server.
- Validate provider callbacks and transaction data; never unlock a purchase based only on client-side state.
- Protect payment credentials and webhook secrets.
- Keep downloadable archives in private storage.
- Validate uploaded archives and prevent path traversal.
- Preserve purchase and release records needed for auditability.
- Test payment confirmation, partial payments, retries, expiration and chain reorganization behavior for the networks you enable.
- Review access controls and tenant isolation when operating multiple merchant accounts.

A successful local test does not establish that a live payment integration is production-ready. Verify each payment method in the target environment before accepting real payments.

## Seller and buyer responsibilities

A software listing should accurately describe what is included, its requirements, license terms and any support that is offered. Unless a listing explicitly includes support or installation, the marketplace's core delivery flow is the purchase and download of the specified software release.

This does not remove any rights or obligations imposed by applicable consumer, intellectual-property, privacy or other laws. Sellers must have the rights needed to distribute the software they publish.

## Project status

BCH Flow is under active development. Features and integrations may depend on environment configuration and external payment providers. Review the code, configuration and tests for your deployment before using the platform with real funds or commercial software.

## License

See the repository's license file, if provided, for the terms governing use and distribution of this project. Software products sold through the marketplace may have their own separate licenses.
