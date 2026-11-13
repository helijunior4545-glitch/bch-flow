"""V2.9.5 read-only, manually supplied TXID invoice evidence. Never settles invoices."""
import re
from .transaction_validation_v294 import compare_tx, _outputs
from .blockbook_v26 import BlockbookProvider
import os

TXID = re.compile(r'[0-9a-fA-F]{64}\Z')

def _address_match(row, address):
    """Only an explicit address in Blockbook output counts as a candidate."""
    addresses = row.get('addresses')
    return isinstance(addresses, list) and address in addresses and all(isinstance(a, str) for a in addresses)

def evaluate(invoice, txid, *, probe=False, compare=compare_tx, book_factory=BlockbookProvider):
    report = {'state': 'NOT_TESTED', 'probed': False, 'matching_transaction': False,
              'address_output_observed': False, 'observed_satoshis': 0,
              'required_satoshis': None, 'confirmations_reported': None,
              'payment_verified': False, 'utxo_consensus': False, 'settlement_authorized': False}
    if getattr(invoice, 'network', None) != 'mainnet':
        report['state'] = 'UNSUPPORTED_NETWORK'; return report
    address = getattr(invoice, 'receiving_cashaddr', None)
    required = getattr(invoice, 'amount_satoshis', None)
    if not isinstance(address, str) or not address.startswith('bitcoincash:') or type(required) is not int or required <= 0:
        report['state'] = 'INVALID_INVOICE'; return report
    report['required_satoshis'] = required
    if not isinstance(txid, str) or not TXID.fullmatch(txid):
        report['state'] = 'INVALID_TXID'; return report
    if not probe: return report
    report['probed'] = True
    cross = compare(txid, probe=True)
    if cross.get('state') != 'MATCHING_TRANSACTION' or cross.get('matching_transaction') is not True:
        report['state'] = 'CROSS_PROVIDER_' + str(cross.get('state', 'UNAVAILABLE'))[:70]
        return report
    report['matching_transaction'] = True
    try:
        endpoint = os.getenv('BCHFLOW_V26_PROVIDER_A_URL', '').strip()
        if not endpoint:
            report['state'] = 'BLOCKBOOK_NOT_CONFIGURED'; return report
        book = book_factory('blockbook_a', endpoint, api_key=os.getenv('BCHFLOW_V26_PROVIDER_A_KEY', ''))
        tx = book._get('/api/v2/tx/' + txid.lower())
        if not isinstance(tx, dict) or tx.get('txid', '').lower() != txid.lower():
            report['state'] = 'INVALID_TRANSACTION'; return report
        normalized = _outputs(tx, source='blockbook')
        rows = tx.get('vout')
        total = 0
        matched = []
        for index, row in enumerate(rows):
            if _address_match(row, address):
                total += normalized[index][0]
                matched.append(index)
        confirmations = tx.get('confirmations')
        if type(confirmations) is int and 0 <= confirmations <= 10000000:
            report['confirmations_reported'] = confirmations
        report['observed_satoshis'] = total
        report['matched_output_indexes'] = matched
        report['address_output_observed'] = bool(matched)
        report['state'] = 'ADDRESS_OUTPUT_OBSERVED' if matched else 'NO_ADDRESS_OUTPUT'
    except Exception:
        report['state'] = 'EVIDENCE_UNAVAILABLE_OR_INVALID'
    return report
