# BCH Flow V3.7 — Two-provider external corroboration

This is **NOT independent blockchain consensus verification**. Two HTTPS Blockbook services can rely on the same node, infrastructure, software, or erroneous chain. Agreement is only **corroborated_external**, never paid/settled.

- Primary V3.4 settings: `BCHFLOW_V34_ENABLE_NETWORK=1`, `BCHFLOW_V34_BLOCKBOOK_URL=https://PRIMARY_HOST`, `BCHFLOW_V34_ALLOWED_HOSTS=PRIMARY_HOST`.
- Secondary V3.7 settings: `BCHFLOW_V37_ENABLE_SECONDARY=1`, `BCHFLOW_V37_SECONDARY_BLOCKBOOK_URL=https://SECONDARY_HOST`, `BCHFLOW_V37_SECONDARY_ALLOWED_HOSTS=SECONDARY_HOST`.
- Endpoints must be HTTPS with different hostnames. **Different hostnames do not prove independent operators or consensus.** Verify ownership and infrastructure separately.
- Run `python manage.py bchflow_v37_compare INVOICE_UUID --min-confirmations 2`.
- Read-only. No migrations, no writes, no payment/transaction/transfer creation, no signing or broadcasting.
- Compare full paginated outpoint sets; matching network/address/value/block hash and confirmations; reject missing outputs, conflicting blocks, insufficient confirmations and divergent heights.
- The adapter currently supports BCH **mainnet only**, and can reject valid chain data when a node advances during sequential reads. Fail-closed is intentional.
- Before production settlement: validate real endpoints, check their underlying infrastructure, verify BCH consensus with an independent full node, prove unique invoice allocation and reorg policy, and implement audited idempotent settlement.
