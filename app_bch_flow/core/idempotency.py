"""Deterministic fingerprints for retry detection; persistence is required separately."""
import hashlib
import json

def request_fingerprint(organization_id, operation, payload):
    data = json.dumps({"organization": str(organization_id), "operation": operation, "payload": payload}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(data.encode("utf-8")).hexdigest()
