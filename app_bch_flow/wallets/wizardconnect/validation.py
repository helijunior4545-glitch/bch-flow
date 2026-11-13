"""Boundary checks before handing a reserved payment to an external wallet."""
from django.utils import timezone
from app_bch_flow.financial.amounts import PaymentError


def validate_withdrawal(actor, withdrawal):
    account = withdrawal.account
    if (account.asset != 'BCH' or account.environment != 'live'
            or not account.wallet_id or account.wallet.provider != 'nownodes'
            or account.wallet.archived_at or account.frozen):
        raise PaymentError('WizardConnect signing requires an active NOWNodes BCH mainnet wallet.')
    if (withdrawal.status != 'approved' or withdrawal.approved_by_id != actor.pk
            or not withdrawal.approved_until or withdrawal.approved_until <= timezone.now()):
        raise PaymentError('Authorize this withdrawal before requesting a wallet signature.')
