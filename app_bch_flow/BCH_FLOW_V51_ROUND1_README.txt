BCH Flow Round 1 — 120 adversarial deterministic tests.
20 ASERT timestamp variations; 20 invalid ASERT inputs; 20 compact-PoW work vectors;
20 invalid branch vectors; 20 fork ordering vectors; 20 observed reorg-depth vectors.
Adds read-only observed branch-work comparator. No chain selection, authenticated chainwork,
historical mainnet vectors, independent provider verification, or settlement authorization.
These tests are a defensive regression batch, NOT full BCH consensus certification.
Positive cases are deterministic synthetic scenarios; do not describe them as historical.
Expected suite: 533 + 120 = 653. No migrations or DB writes.
