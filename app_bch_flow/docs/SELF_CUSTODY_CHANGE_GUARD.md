# BCH Flow: self-custody change-address safety patch

This installer **does not** create a real BCH wallet or enable real payments.
It adds a strict, fail-closed guard to the existing `CoreNode.prepare_unsigned`
method: BCH withdrawal signing-package preparation is blocked until a verified
client-side signer and dedicated change-address registry are implemented.

The policy helper also rejects invoice-address reuse, missing change addresses,
and payment/change destination reuse. Passing its shape check **does not** prove
address ownership. The guard is intentionally not bypassable via a Django flag.

No migrations, no seed/private-key storage, no network calls, no automatic
Mainnet enablement. Existing BTC code is not changed by the new guard.

Next engineering work: audited BIP39/BIP32 BCH client wallet; dedicated
receive/change derivation with ownership proof; verified change registry;
BCH sighash signing and independent vectors; Chipnet end-to-end; UTXO/reorg
reconciliation; security review. Do not mark readiness evidence as passed.
