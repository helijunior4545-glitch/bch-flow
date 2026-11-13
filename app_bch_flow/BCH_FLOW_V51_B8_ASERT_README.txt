BCH FLOW V5.1-B.8 — ASERT arithmetic, explicit anchor, read-only.
41 unit tests. Reference: https://bitcoin-cash-node.gitlab.io/bchn-sw/bitcoincash-upgrade-specifications/2020-11-15-asert/
No auto network, no DB writes, no payments. Anchor is caller-provided and NOT authenticated.
Does NOT verify full consensus, canonical chain, MTP, provenance, pre-ASERT or testnet.
Run: python py.py (dry-run); python py.py --apply; python manage.py test app_bch_flow --verbosity 1
