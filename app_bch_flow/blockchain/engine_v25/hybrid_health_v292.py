"""Isolated hybrid health, not two-provider UTXO consensus."""
from .single_health_v291 import diagnose_one
from .quicknode_rpc_v292 import diagnose_rpc


def diagnose_hybrid(*, probe=False):
    a = diagnose_one('A', probe=probe)
    b = diagnose_rpc(probe=probe)
    status = ('HEALTHY_DIAGNOSTICS_ONLY' if a['state'] == 'HEALTHY' and b['state'] == 'HEALTHY'
              else 'NOT_TESTED' if not probe else 'INCOMPLETE')
    return {'state': status, 'probed': bool(probe), 'blockbook_a': a, 'rpc_b': b,
            'utxo_consensus': False, 'payment_verified': False,
            'settlement_authorized': False}
