# BCH Flow V5.3-C — cryptographic ownership proof primitive

This stage adds an **application-specific ECDSA/secp256k1 challenge verifier**.
It binds organization, network, address, nonce and 5-minute expiry to the
signature. It is **not** the Bitcoin Cash Signed Message standard, and does
not sign or broadcast BCH transactions. It does not create a browser wallet.

`cryptography` is a required existing Python dependency. If absent, install
an audited/pinned version through the project's dependency-management process;
do not install packages ad hoc inside the production container.

## Critical missing integration

Do NOT expose this verifier as a live endpoint yet. Production activation needs:
1. Authenticated challenge issuance, identity/org authorization, CSRF/rate limits.
2. DB-persisted SHA256 challenge digest and expiry, one-time consumption in
   `transaction.atomic()` with `select_for_update()` and replay rejection.
3. Browser-local, independently reviewed secp256k1 signer with a vetted,
   pinned supply chain; secure wallet generation, backup and recovery.
4. Compatibility and independent test vectors, including BCH transactions.
5. Recovery tests in a second device, before any real BCH deposits.

The existing V5.3-A receiving gate stays CLOSED. No migrations or routes
are added. The test suite uses ephemeral private keys **only inside tests**.

Run: `python -m unittest app_bch_flow.tests.test_v53c_proof -v`.
