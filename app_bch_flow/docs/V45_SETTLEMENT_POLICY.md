# BCH Flow V4.5 — Settlement Policy (read-only gate)

This version evaluates whether simulated/unverified V4.2 evidence, its V3.5 observation, and V4.3 exclusive outpoint reservations are internally consistent enough to enter **manual review**. It does **not** verify on-chain transactions, prove address ownership, grant settlement authorization, create BCHPayment/BCHTransaction, or change BCHInvoice.status/paid_at.

Decision `manual_review_ready` means **review only**. `settlement_authorized` is always False. Reasons explicitly identify missing independent chain verification, receiving-address ownership proof, reorg/finality policy and human authorization. `blocked` means one or more local consistency checks failed.

Limitations: V3.5 and V4.2 event metadata is not cryptographically verified against blockchain; a forged or mutable historical event can pass internal consistency. There is no provider consensus, reorg monitoring, settlement state machine, real transfer, wallet, or automatic payment recognition. No migrations are needed.

Run: `python manage.py test app_bch_flow.tests.test_v45_settlement_policy --verbosity 2` then the V4.0–V4.5 regression suite. Test only on isolated PostgreSQL test DB. Do not expose this function as a payment-approval endpoint.
