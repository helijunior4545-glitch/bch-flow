# Offline BCH P2PKH signer — experimental / Chipnet-only validation

This adds a **real cryptographic BCH ForkID signature generator**, not a production-ready wallet.
The function `sign_unsigned_p2pkh` uses `cryptography` secp256k1 ECDSA with
SIGHASH_ALL|FORKID (0x41), low-S DER and compressed public keys.
It only supports standard legacy-serialized P2PKH inputs/outputs and one key per input.
It does NOT implement HD key derivation, secure seed storage, CashAddr verification,
UTXO source verification, change ownership registry, hardware signing, network
broadcast, replay resistance for arbitrary networks, or a user confirmation UI.

**Do not execute with real keys in a Django container, cloud server, or online terminal.**
Use only in a separate offline trusted client, and verify prevout data and outputs
independently. The `prevouts` argument is caller-supplied and therefore untrusted.
This module intentionally does not integrate with CoreNode, alter Django routes,
remove the previous fail-closed guard, or enable Mainnet.

The unit tests validate ECDSA signatures using `cryptography` but do not constitute
independent BCH consensus vectors or Chipnet interoperability proof.
Next: audited client vault and derivation, independent UTXO provenance verification,
change-address registry, BCH node vector tests, Chipnet send/receive, security review.
