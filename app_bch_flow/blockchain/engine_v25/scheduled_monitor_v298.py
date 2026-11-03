"""V2.9.8 read-only scheduled observations; optional local snapshots, never DB writes."""
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .merchant_monitor_v297 import monitor

SAFE_FIELDS = ('invoice_id', 'state', 'discovery_state', 'candidate_count',
               'observed_satoshis', 'required_satoshis', 'shared_receiving_address',
               'attribution_safe', 'payment_verified', 'settlement_authorized')


def sanitize(report):
    """Whitelist evidence only; no address, provider credentials or candidate payloads."""
    return {
        'state': str(report.get('state', 'INVALID_REPORT')),
        'invoice_count': report.get('invoice_count', 0),
        'history_complete': False,
        'payment_verified': False,
        'utxo_consensus': False,
        'settlement_authorized': False,
        'database_writes': False,
        'reports': [{key: row[key] for key in SAFE_FIELDS if key in row}
                    for row in report.get('reports', []) if isinstance(row, dict)],
    }


def differences(previous, current):
    old = {r['invoice_id']: r for r in previous.get('reports', []) if isinstance(r, dict) and 'invoice_id' in r}
    changes = []
    for row in current['reports']:
        key = row.get('invoice_id')
        if key not in old:
            changes.append({'invoice_id': key, 'change': 'FIRST_OBSERVATION'})
            continue
        fields = ('state', 'discovery_state', 'candidate_count', 'observed_satoshis')
        changed = [f for f in fields if old[key].get(f) != row.get(f)]
        if changed:
            changes.append({'invoice_id': key, 'change': 'EVIDENCE_CHANGED', 'fields': changed})
    # Absence is not evidence of removal: bounded batches may omit invoices.
    return changes


def observe(invoices, *, probe=False, discoverer=None, previous=None):
    kwargs = {'probe': probe}
    if discoverer is not None:
        kwargs['discoverer'] = discoverer
    current = sanitize(monitor(invoices, **kwargs))
    return current, differences(previous or {}, current) if probe else []


def read_snapshot(path, organization_id):
    path = Path(path)
    if path.is_symlink():
        raise ValueError('SNAPSHOT_SYMLINK_NOT_ALLOWED')
    if not path.exists():
        return {}
    if not path.is_file() or path.stat().st_size > 1024 * 1024:
        raise ValueError('INVALID_SNAPSHOT_FILE')
    with path.open('r', encoding='utf-8') as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or data.get('organization_id') != organization_id:
        raise ValueError('SNAPSHOT_ORGANIZATION_MISMATCH')
    return data


def save_snapshot(path, organization_id, current):
    """Atomic local evidence snapshot; explicitly NOT a database operation."""
    path = Path(path)
    parent = path.parent
    if parent.is_symlink() or not parent.is_dir():
        raise ValueError('INVALID_SNAPSHOT_DIRECTORY')
    if path.is_symlink():
        raise ValueError('SNAPSHOT_SYMLINK_NOT_ALLOWED')
    if path.exists() and not path.is_file():
        raise ValueError('INVALID_SNAPSHOT_FILE')
    payload = dict(current)
    payload['organization_id'] = organization_id
    payload['observed_at_utc'] = datetime.now(timezone.utc).isoformat()
    raw = (json.dumps(payload, sort_keys=True, indent=2) + '\n').encode('utf-8')
    fd, tmp = tempfile.mkstemp(prefix='.bchflow-v298-', dir=parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'wb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
