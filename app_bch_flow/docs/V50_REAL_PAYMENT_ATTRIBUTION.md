# BCH Flow V5.0 — Real Payment Attribution Validation (read-only)

This milestone introduces a conservative **invoice-specific** assessment against a real BCH mainnet TXID. It uses the existing V4.9 NOWNodes adapter, reads an existing `BCHInvoice` and existing `BCHOutpointReservation` rows, and never writes invoice, payment, journal, or reservation records.

## Environment (Coolify runtime only)

```
BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC=1
BCHFLOW_V48_PRIMARY_KEY=<secret>
BCHFLOW_V50_ENABLE_ASSESSMENT=1
```

No build-time secrets. No migrations. Do not paste API keys into terminal arguments.

## Usage

```
python manage.py bchflow_v50_assess <EXISTING_INVOICE_UUID> <MAINNET_TXID>
python manage.py test app_bch_flow.tests.test_v50_attribution --verbosity 2
python manage.py test app_bch_flow.tests --verbosity 2
```

The example coinbase TXID `e415aca63768515434fede7cf823eb003f2111a46d56443a506915cf007861c3` **must be blocked**. It is not a customer payment. Do not use it as evidence of invoice payment.

## Scope / safety

- Live NOWNodes data is external observation, **not consensus or independent corroboration**.
- V5.0 will block `no_independent_corroboration` until a separately verified two-provider attestation is integrated. No CLI switch bypasses this requirement.
- Raw `vin` is inspected to block coinbase transactions; unknown transaction type also blocks.
- Require matching CashAddr, exact satoshi amount, at least two confirmations, consistent tip/height, freshness, unexpired unpaid invoice, unique matching output, and no already-reserved outpoint.
- Current policy treats existing reservation as a block (including any reservation for the same invoice). This is intentionally conservative.
- If the installed reservation model fields differ, CLI stops with `unknown_reservation_schema`; inspect the actual schema rather than changing DB models blindly.
- Assessment `eligible_for_manual_review_only` is **never** payment authorization or settlement.
- Address reuse across different invoices is not comprehensively checked here; manual review remains mandatory. No invoice status changes, no `BCHPayment`, no writes.
- This release does not claim that the full two-provider proof or production settlement workflow is complete.
