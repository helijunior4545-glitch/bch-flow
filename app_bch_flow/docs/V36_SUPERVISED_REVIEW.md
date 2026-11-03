# BCH Flow V3.6 — Supervised evidence review

This release deliberately **does not settle payments**. A human owner/admin may append an auditable review decision to a V3.5 unverified blockchain observation. Acceptance means **accept for investigation**, not acceptance as paid.

Default dry-run. `--write-review` requires `BCHFLOW_V36_ALLOW_REVIEW_WRITE=1` and an active owner/admin identity of the invoice organization. The command takes invoice UUID, V3.5 observation event UUID, actor identity UUID, `--decision accept_for_investigation|reject_evidence`, and `--reason` (12–1000 chars).

Example:

```sh
python manage.py bchflow_v36_review INVOICE_UUID OBSERVATION_UUID ACTOR_UUID --decision accept_for_investigation --reason "Needs independent BCH node verification"
BCHFLOW_V36_ALLOW_REVIEW_WRITE=1 python manage.py bchflow_v36_review INVOICE_UUID OBSERVATION_UUID ACTOR_UUID --decision reject_evidence --reason "Conflicting block evidence requires investigation" --write-review
```

The service locks the invoice in PostgreSQL, verifies membership and event ownership, and deduplicates exact repeated review decisions. It does not create payments, transfers, transactions, broadcast, verify chain consensus, or update invoice status. No migrations. Review history is append-only by application convention; database administrators can still modify records.

**Production limitation:** this is a review workflow, not the promised final payment settlement engine. A separate independent full-node verification, outpoint ownership and confirmation/reorg policy is required before any paid status transition.
