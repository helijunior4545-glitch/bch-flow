BCH Flow V5.1-B.6 — read-only header continuity

Opt-in live diagnostic, max 144 contiguous headers from transaction block to tip.
Validates double-SHA256 header hashes, prev-block links, and tip equality.
Does NOT validate BCH DAA, PoW target, chainwork, canonicality, provider independence, script-address equality or authorize finance.
For older transactions beyond 143 blocks from tip, result is blocked by design.

Run after setting BOTH BCHFLOW_V51B5_ENABLE_LIVE=1 and BCHFLOW_V51B6_ENABLE_LIVE=1, and BCHFLOW_V48_PRIMARY_KEY in the existing Django environment:

BCHFLOW_V51B5_ENABLE_LIVE=1 BCHFLOW_V51B6_ENABLE_LIVE=1 python manage.py shell -c 'import json; from app_bch_flow.blockchain.v51_electrum_b6 import assess_continuity; print(json.dumps(assess_continuity("e415aca63768515434fede7cf823eb003f2111a46d56443a506915cf007861c3"), indent=2))'

NOTE: The sample TX may age out of the 144-header bounded range; blocked is expected then.

Tests: python manage.py test app_bch_flow.tests.test_v51_electrum_b6
Regression: python manage.py test app_bch_flow --verbosity 1
