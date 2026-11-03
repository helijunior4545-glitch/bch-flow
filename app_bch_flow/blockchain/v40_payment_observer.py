"""V4.0 explicit-TXID invoice observer. External evidence, never settlement."""
import os
import re
from dataclasses import dataclass
from app_bch_flow.models import BCHInvoice
from .v33_engine import evaluate_invoice
from .v34_blockbook import NetworkReadError
from .v39_nownodes import NOWNodesBCHProvider

_TXID = re.compile(r"[0-9a-fA-F]{64}\Z")

class ObservationError(ValueError):
    pass

@dataclass(frozen=True)
class PaymentCandidate:
    invoice_id: str
    txid: str
    status: str
    observed_satoshis: int
    confirmed_satoshis: int
    required_satoshis: int
    confirmations_required: int
    output_count: int
    source: str = 'external_unverified'
    warning: str = 'NOT SETTLEMENT; not independently verified; address exclusivity not proven'


def observe_invoice_txid(invoice_id, txid, *, min_confirmations=2, provider=None):
    """Read invoice, fetch COMPLETE address evidence, restrict to explicit TXID.

    Caller-supplied TXID is not a payment proof. Historic transactions, reused
    addresses and other invoices may make attribution impossible. Always returns
    unattributed unless a separate audited exclusivity process is implemented.
    No database writes; no automatic payment transitions.
    """
    if os.getenv('BCHFLOW_V40_ENABLE_OBSERVATION') != '1':
        raise ObservationError('V4.0 observation disabled; explicit opt-in required')
    if not isinstance(txid, str) or not _TXID.fullmatch(txid):
        raise ObservationError('Invalid TXID')
    if type(min_confirmations) is not int or not 1 <= min_confirmations <= 100:
        raise ObservationError('Invalid confirmation threshold')
    try:
        invoice = BCHInvoice.objects.using('default').get(pk=invoice_id)
    except (BCHInvoice.DoesNotExist, TypeError, ValueError) as exc:
        raise ObservationError('Invoice not found') from exc
    if invoice.network != 'mainnet':
        raise ObservationError('Only BCH mainnet supported')
    if not invoice.receiving_cashaddr or not invoice.amount_satoshis:
        raise ObservationError('Invoice missing address or satoshi amount')
    if provider is None:
        provider = NOWNodesBCHProvider(network='mainnet', max_pages=10, page_size=100)
    # Fail closed if provider cannot retrieve entire address history.
    outputs = provider.outputs_for_address(network='mainnet', address=invoice.receiving_cashaddr)
    matches = tuple(item for item in outputs if item.txid == txid.lower())
    # Explicitly disallow attribution without a proven, audited exclusivity policy.
    result = evaluate_invoice(invoice_address=invoice.receiving_cashaddr,
        network='mainnet', required_satoshis=invoice.amount_satoshis,
        outputs=matches, min_confirmations=min_confirmations, address_exclusive=False)
    return PaymentCandidate(str(invoice.pk), txid.lower(), result.status,
        result.observed_satoshis, result.confirmed_satoshis,
        result.required_satoshis, min_confirmations, result.matched_outputs)
