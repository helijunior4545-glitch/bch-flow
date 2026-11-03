"""Read-only observation for BCHInvoice; no settlement, no transfers."""
from app_bch_flow.models import BCHInvoice
from .v33_engine import evaluate_invoice
from .v33_provider import DisabledProvider

def observe_invoice(invoice_id, *, provider=None, min_confirmations=1):
    invoice = BCHInvoice.objects.using('default').get(pk=invoice_id)
    source = provider if provider is not None else DisabledProvider()
    outputs = source.outputs_for_address(network=invoice.network, address=invoice.receiving_cashaddr)
    # No unique address allocation / ownership proof yet: intentionally unattributed.
    return evaluate_invoice(invoice_address=invoice.receiving_cashaddr, network=invoice.network,
                            required_satoshis=invoice.amount_satoshis, outputs=outputs,
                            min_confirmations=min_confirmations, address_exclusive=False)
