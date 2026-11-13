# BCH Flow V5.3-B — public address primitives (partial stage)

Creates a dependency-free **public-data-only** BCH CashAddr encoder and checksum
validator. The encoder supports compressed SEC public keys and P2PKH hash160.
`chipnet` uses the `bchtest:` CashAddr prefix, as does BCH testnet.

This is **not a wallet generator**. No private keys, BIP39 mnemonic, signing,
key recovery, browser UI, challenge verification, or production route changes.
Public-key format checks are not full elliptic-curve point validation.

No existing files overwritten. No migrations. No Django settings modified.
Dry-run by default. `--apply` creates only new files. The prior V5.3-A
`authorize_real_receive()` remains fail-closed. Do not send BCH to any address
until control of its private key and recovery have been demonstrated.

Run: `python -m unittest app_bch_flow.tests.test_v53b_cashaddr -v`
Next stage: vetted, pinned BCH crypto library, local key generation, encrypted
backup/recovery, signed challenge verification and independent test vectors.
