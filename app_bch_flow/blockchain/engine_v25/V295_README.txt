BCH Flow V2.9.5 — Merchant Payment Evidence (manual TXID, read-only)

Requires an existing mainnet BCHInvoice, explicit organization UUID, invoice UUID and TXID.
The command verifies cross-provider TX evidence using V2.9.4.3 and then fetches Blockbook outputs.
It reports a candidate only when Blockbook explicitly lists the invoice receiving address in an output.
Confirmations are reported by Blockbook, not independently cross-validated.
It does NOT automatically discover all invoice transactions, validate address script derivation,
prove unspent outputs, establish total historical receipts, validate finality, or change invoice status.
No signing, broadcasting, settlement, DB writes or migration.

python app_bch_flow/py.py
python app_bch_flow/py.py --apply
python manage.py test app_bch_flow.tests.test_blockchain_invoice_evidence_v295
python manage.py bch_invoice_evidence_v295 --org-id <uuid> --invoice-id <uuid> --txid <64hex> --probe
Without --probe no provider calls are made.
Use the command only with an authorized organization's invoice IDs. CLI operator must already have DB access.
