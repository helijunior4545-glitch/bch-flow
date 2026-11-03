BCH FLOW V5.1-B.8.1 — HISTORICAL REPLAY PREPARATION
Adds a bounded 2–144 header replay that checks internal SHA256 links, individual PoW,
and ASERT transitions using an EXPLICIT caller-supplied anchor. No network, DB,
migration, invoice/payment state change, or settlement authorization.
20 new adversarial tests. The positive synthetic tests mock difficulty/PoW and DO NOT
prove mainnet historical consensus. Historical reference vectors and authenticated
anchor/provenance are still required. Do not use as canonical chain verification.
Run: python py.py (dry run), python py.py --apply,
python manage.py test app_bch_flow --verbosity 1
Reference: https://bitcoin-cash-node.gitlab.io/bchn-sw/bitcoincash-upgrade-specifications/2020-11-15-asert/
Official vectors: https://gitlab.com/bitcoin-cash-node/bchn-sw/qa-assets/-/tree/master/test_vectors/aserti3-2d
