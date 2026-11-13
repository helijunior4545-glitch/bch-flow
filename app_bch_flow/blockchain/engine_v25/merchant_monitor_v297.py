"""BCH Flow V2.9.7: bounded manual merchant monitoring, evidence only."""
from collections import Counter
from .invoice_discovery_v296 import discover

MAX_INVOICES = 10
SAFE_STATES = frozenset(('NO_TRANSACTIONS_FOUND', 'NO_CANDIDATE_OUTPUTS', 'CANDIDATE_OUTPUTS_OBSERVED', 'PARTIAL_EVIDENCE'))

def monitor(invoices, *, probe=False, discoverer=discover):
    """Expects a caller-scoped, ordered collection; never writes or settles."""
    rows = list(invoices)
    if len(rows) > MAX_INVOICES:
        raise ValueError('INVOICE_LIMIT_EXCEEDED')
    addresses = Counter((getattr(x, 'network', None), getattr(x, 'receiving_cashaddr', None)) for x in rows)
    result = {'state': 'NOT_TESTED', 'probed': False, 'invoice_count': len(rows),
              'reports': [], 'payment_verified': False, 'settlement_authorized': False,
              'utxo_consensus': False, 'history_complete': False, 'database_writes': False}
    if not probe:
        return result
    result['probed'] = True
    if not rows:
        result['state'] = 'NO_OPEN_INVOICES'
        return result
    problems = False
    for invoice in rows:
        address_key = (getattr(invoice, 'network', None), getattr(invoice, 'receiving_cashaddr', None))
        shared = addresses[address_key] > 1 and bool(address_key[1])
        try:
            evidence = discoverer(invoice, probe=True)
            if not isinstance(evidence, dict):
                raise ValueError('INVALID_DISCOVERY')
            state = evidence.get('state', 'INVALID_DISCOVERY')
            amount = evidence.get('observed_satoshis', 0)
            if type(amount) is not int or not 0 <= amount <= 21000000 * 100000000:
                raise ValueError('INVALID_AMOUNT')
            if state not in SAFE_STATES:
                problems = True
            report = {'invoice_id': str(invoice.id), 'discovery_state': state,
                      'candidate_count': evidence.get('candidate_count', 0),
                      'observed_satoshis': amount if state in SAFE_STATES else 0,
                      'required_satoshis': getattr(invoice, 'amount_satoshis', None),
                      'shared_receiving_address': shared,
                      'attribution_safe': False, 'payment_verified': False,
                      'settlement_authorized': False}
            if shared:
                report['state'] = 'SHARED_ADDRESS_ATTRIBUTION_UNSAFE'
            elif state == 'CANDIDATE_OUTPUTS_OBSERVED':
                report['state'] = 'UNATTRIBUTED_OUTPUT_EVIDENCE'
            else:
                report['state'] = state
        except Exception:
            problems = True
            report = {'invoice_id': str(invoice.id), 'state': 'MONITOR_UNAVAILABLE_OR_INVALID',
                      'shared_receiving_address': shared, 'attribution_safe': False,
                      'payment_verified': False, 'settlement_authorized': False}
        result['reports'].append(report)
    result['state'] = 'PARTIAL_MONITORING' if problems else 'OBSERVATION_COMPLETE_FOR_BOUNDED_BATCH'
    return result
