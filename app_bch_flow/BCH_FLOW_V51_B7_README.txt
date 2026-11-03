BCH Flow V5.1-B.7 — bounded PoW checks (read-only)

Validates compact nBits, canonical encoding, PoW limit, each double-SHA256 header hash <= declared target, and observed summed work.
Requires B.6 header continuity for combined validation. Does NOT validate BCH difficulty adjustment algorithm (DAA), network-specific checkpoints, chain selection, consensus, or financial authorization.

Dry run: python py.py
Apply: python py.py --apply
Tests: python manage.py test app_bch_flow.tests.test_v51_electrum_b7
Regression: python manage.py test app_bch_flow --verbosity 1

Live (optional): requires B5, B7 opt-ins and existing NOWNodes key:
BCHFLOW_V51B5_ENABLE_LIVE=1 BCHFLOW_V51B7_ENABLE_LIVE=1 python manage.py shell -c 'import json; from app_bch_flow.blockchain.v51_electrum_b7 import assess_pow; print(json.dumps(assess_pow("e415aca63768515434fede7cf823eb003f2111a46d56443a506915cf007861c3"), indent=2))'

Fail-closed if transaction > 143 blocks from tip, or upstream unavailable. No DB writes or migrations.
