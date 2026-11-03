# BCH Flow — The Pix Experience for Bitcoin Cash

This repository is a **blueprint scaffold**, not a live BCH payment service.

Core flows: Send / Receive / Request / Pay. Independent Django identity, logical organizations, BRL reference prices, noncustodial BCH wallet authorization and on-chain verification (integration pending).

## Installation

The generator returns files only; no host settings or database is modified. Register `app_bch_flow` and its dedicated database router only after a read-only audit of the host Django environment. Generate migrations using the real host settings after validating DB routing. Avoid any mainnet funds until tests and integration review pass.

## Verification

`python -m compileall app_bch_flow` and `python -m unittest discover -s app_bch_flow/tests/unit` (requires Django installed for some modules). See docs/IMPLEMENTATION_STATUS.md.
