# BCH Flow V5.3-A — ownership security gate

This stage is deliberately fail-closed. It installs a standalone, read-only
policy and tests. It DOES NOT generate keys, derive BCH CashAddr, verify
BCH signatures, enable receiving, change Django routes, or enable spending.

## Why
The existing V4.1 wallet view declares WATCH_ONLY and disables broadcasting
and settlement. A wallet connection row or verified_at field cannot establish
cryptographic control of the address. Sending BCH to an unproven address risks
permanent loss of funds.

## Integration plan
1. Choose a maintained, independently reviewed BCH-compatible cryptography
   library (e.g. libauth), pin version and integrity, and bundle locally.
2. Implement client-side CSPRNG key generation and BIP39/BIP32/BIP44 or a
   documented compatible derivation standard; verify CashAddr test vectors.
3. Design secure backup/recovery UX; secrets never enter Django, logs, URLs,
   telemetry or browser persistent storage without authenticated encryption.
4. Implement domain-separated, short-lived, single-use signed challenges,
   verified against the address and organization; handle replay and revocation.
5. Add chipnet end-to-end tests including recovery and a signed spend.
6. Enable mainnet receiving only after address ownership is proven; keep
   broadcasting and automatic settlement independently gated.

## Safety
No database migration, no existing-file overwrite, no key material, no
production data mutations. Dry-run by default. Review diff before --apply.
