"""Server-side adapter; never signs, stores seeds, or broadcasts on wallet connection."""
from app_bch_flow.financial import service
from .requests import build_sign_request
from .validation import validate_withdrawal


def request_authorization(actor, withdrawal):
    service.membership(actor, withdrawal.account.organization_id, service.APPROVE_ROLES)
    validate_withdrawal(actor, withdrawal)
    withdrawal = service.prepare_signing(actor, withdrawal)
    return build_sign_request(actor, withdrawal)
