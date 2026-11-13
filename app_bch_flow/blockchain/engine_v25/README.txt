BCH Flow V2.5 — provider-neutral read-only observation engine

STATUS: FOUNDATION ONLY. No new live public providers are configured. The existing V2.4 UI
continues using V4.3 and will remain unavailable until its opt-in flag and key are configured.

Provider contract: name (unique stable identifier), observe(cashaddr) -> Snapshot.
The provider MUST validate network, synchronization, bounded response, transaction outputs,
and use bounded network timeouts; failures raise ProviderFailure with a safe code.

Call observe(address, [provider_a, provider_b], enabled=True) only from a manually authorized
flow. Provider agreement means matching current UTXO snapshots, NOT verified payment, chain
consensus, address ownership or permission to settle. Different block heights can disagree.

Future steps: implement independent, pinned, network-restricted adapters with tests; compare
block heights and transaction history; enforce address attribution, confirmations and reorg
policies; add audited persistence only after review. Never derive invoice PAID from UTXOs.

No migrations, network calls, background tasks, signing, broadcast or invoice mutations.
