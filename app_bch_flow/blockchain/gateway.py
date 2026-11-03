"""No fake broadcast or verification; mainnet integration must be explicit."""
from app_bch_flow.core.exceptions import PaymentUnavailable

class BCHGateway:
    def broadcast(self, signed_transaction):
        raise PaymentUnavailable("BCH broadcaster not configured")

    def lookup(self, txid):
        raise PaymentUnavailable("BCH transaction verifier not configured")
