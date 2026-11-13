"""A txid alone is NOT proof of payment."""
from app_bch_flow.core.exceptions import PaymentUnavailable

def verify_invoice_payment(*args, **kwargs):
    raise PaymentUnavailable("On-chain invoice matching is not implemented")
