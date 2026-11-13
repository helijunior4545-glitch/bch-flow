"""Bounded, read-only invoice transaction discovery. Never verifies or settles payment."""
import os
import re
from .blockbook_v26 import BlockbookProvider
from .invoice_evidence_v295 import evaluate

TXID = re.compile(r"[0-9a-fA-F]{64}\Z")
MAX_CANDIDATES = 5

def discover(invoice, *, probe=False, book_factory=BlockbookProvider, evaluator=evaluate):
    report = {'state': 'NOT_TESTED', 'probed': False, 'invoice_id': str(getattr(invoice, 'id', '')),
              'candidates': [], 'candidate_count': 0, 'observed_satoshis': 0,
              'history_complete': False, 'payment_verified': False, 'utxo_consensus': False,
              'settlement_authorized': False}
    address = getattr(invoice, 'receiving_cashaddr', None)
    if getattr(invoice, 'network', None) != 'mainnet':
        report['state'] = 'UNSUPPORTED_NETWORK'; return report
    if not isinstance(address, str) or not address.startswith('bitcoincash:') or not re.fullmatch(r'bitcoincash:[a-z0-9]{20,120}', address):
        report['state'] = 'INVALID_ADDRESS'; return report
    required = getattr(invoice, 'amount_satoshis', None)
    if type(required) is not int or required <= 0:
        report['state'] = 'INVALID_INVOICE'; return report
    report['required_satoshis'] = required
    endpoint = os.getenv('BCHFLOW_V26_PROVIDER_A_URL', '').strip()
    if not endpoint:
        report['state'] = 'NOT_CONFIGURED'; return report
    if not probe:
        return report
    report['probed'] = True
    try:
        book = book_factory('blockbook_a', endpoint, api_key=os.getenv('BCHFLOW_V26_PROVIDER_A_KEY', ''))
        # Query only the first page, bounded; never assert exhaustive history.
        response = book._get('/api/v2/address/' + address + '?details=txids&page=1&pageSize=' + str(MAX_CANDIDATES))
        if not isinstance(response, dict):
            raise ValueError('INVALID_RESPONSE')
        returned_address = response.get('address')
        if returned_address is not None and returned_address != address:
            raise ValueError('ADDRESS_MISMATCH')
        txids = response.get('txids')
        # Blockbook may omit txids entirely when the address has no history.
        # Only accept that omission with internally consistent zero-history metadata.
        if txids is None and 'txids' not in response:
            total = response.get('txs')
            page = response.get('page')
            pages = response.get('totalPages')
            if (type(total) is int and total == 0 and
                    type(page) is int and page == 1 and
                    type(pages) is int and pages == 1 and
                    response.get('transactions') is None and
                    response.get('unconfirmedTxs', 0) == 0):
                txids = []
            else:
                raise ValueError('MISSING_TXIDS_WITH_NONEMPTY_OR_UNKNOWN_HISTORY')
        if not isinstance(txids, list) or len(txids) > MAX_CANDIDATES:
            raise ValueError('INVALID_TXIDS')
        if any(not isinstance(txid, str) or not TXID.fullmatch(txid) for txid in txids):
            raise ValueError('INVALID_TXID')
        if len({txid.lower() for txid in txids}) != len(txids):
            raise ValueError('DUPLICATE_TXID')
        report['candidate_count'] = len(txids)
        # The provider's reported total is informational; no complete-history claim.
        total = response.get('txs')
        report['provider_reported_transactions'] = total if type(total) is int and 0 <= total <= 100000000 else None
        for txid in txids:
            evidence = evaluator(invoice, txid, probe=True)
            if not isinstance(evidence, dict):
                raise ValueError('INVALID_EVIDENCE')
            state = evidence.get('state', 'INVALID_EVIDENCE')
            amount = evidence.get('observed_satoshis', 0)
            if type(amount) is not int or amount < 0 or amount > 21000000 * 100000000:
                raise ValueError('INVALID_AMOUNT')
            matched = state == 'ADDRESS_OUTPUT_OBSERVED' and evidence.get('matching_transaction') is True
            report['candidates'].append({'txid': txid.lower(), 'state': state,
                                         'matching_transaction': evidence.get('matching_transaction') is True,
                                         'address_output_observed': matched,
                                         'observed_satoshis': amount if matched else 0,
                                         'confirmations_reported': evidence.get('confirmations_reported')})
            if matched:
                report['observed_satoshis'] += amount
        if any(item['state'] not in ('ADDRESS_OUTPUT_OBSERVED', 'NO_ADDRESS_OUTPUT') for item in report['candidates']):
            report['state'] = 'PARTIAL_EVIDENCE'
        elif report['observed_satoshis']:
            report['state'] = 'CANDIDATE_OUTPUTS_OBSERVED'
        elif not txids and type(total) is int and total == 0:
            report['state'] = 'NO_TRANSACTIONS_FOUND'
        else:
            report['state'] = 'NO_CANDIDATE_OUTPUTS'
    except Exception:
        report['state'] = 'DISCOVERY_UNAVAILABLE_OR_INVALID'
        report['observed_satoshis'] = 0
        report['candidates'] = []
        report['candidate_count'] = 0
    return report
