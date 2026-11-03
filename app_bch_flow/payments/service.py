"""Financial operations remain disabled until verified wallet and network integration."""
from app_bch_flow.core.exceptions import PaymentUnavailable

def create_live_payment(*args, **kwargs):
    raise PaymentUnavailable("Live BCH payment processing is not implemented")
