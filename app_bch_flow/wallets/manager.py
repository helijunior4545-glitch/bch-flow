"""Wallet authorization is mandatory and happens in the user's external wallet."""
from app_bch_flow.core.exceptions import PaymentUnavailable


def request_payment_authorization(actor, withdrawal, provider='wizardconnect'):
    if provider == 'wizardconnect':
        from .wizardconnect.adapter import request_authorization
        return request_authorization(actor, withdrawal)
    raise PaymentUnavailable('This wallet connector is not implemented.')
