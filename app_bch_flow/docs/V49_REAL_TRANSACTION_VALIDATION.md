# BCH Flow V4.9 — Real transaction diagnostic (read-only)

No migrations, no wallet, no private keys, no invoice writes, no settlement.

## Production environment (Coolify)

BCHFLOW_V49_ENABLE_REAL_DIAGNOSTIC=1
BCHFLOW_V48_PRIMARY_KEY=<NOWNODES_SECRET>

NOWNodes BCH Blockbook is pinned to https://bchbook.nownodes.io.
`BCHFLOW_V48_ENABLE_LIVE` is NOT required for this single-provider diagnostic.
Do not set `BCHFLOW_V48_ALLOWED_HOSTS` to invented placeholders.

## Usage

python manage.py bchflow_v49_diagnose <REAL_MAINNET_TXID>
python manage.py bchflow_v49_diagnose <REAL_MAINNET_TXID> --output /home/farcry/Downloads/bch_v49_report.json

The output path is create-only. Do not paste the API key into a terminal command or report.

## Important

This is an external *single-provider* observation, not independent corroboration,
consensus verification, ownership proof, invoice attribution, or payment settlement.
The V4.8 dual-provider policy remains separate and unmodified.
All tests use fixtures; successful tests do not demonstrate successful live connectivity.

## Provider API details

NOWNodes: /api (Blockbook status), /api/v2/tx/{txid} (normalized transaction),
/api/v2/block-index/{height} (height/hash). Uses header `api-key`.
The response coin identifier may be `Bcash` (per official docs).

API docs: https://docs.nownodes.io/bch/mainnet/blockbook/blockbook/
