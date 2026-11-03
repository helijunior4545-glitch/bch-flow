"""Wallet authorization is mandatory and must happen in the user's wallet."""
from app_bch_flow.core.exceptions import PaymentUnavailable

def request_payment_authorization(*args, **kwargs):
    raise PaymentUnavailable("WizardConnect/XO integration not implemented")
