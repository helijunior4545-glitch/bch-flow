"""BCH Flow V5.1: deterministic fail-closed receiving eligibility policy.

This is a policy boundary, not a wallet connection, payment processor or settlement.
The caller MUST obtain authoritative database counts and verified wallet proof.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class ReceivingEligibility:
    eligible: bool
    reasons: tuple
    can_mark_paid: bool = False
    can_settle: bool = False


def assess_receiving(*, network, address, amount_satoshis, invoice_count_for_address,
                     wallet_ownership_verified, wallet_active, invoice_active,
                     address_derived_from_wallet, address_exclusive_reservation,
                     provider_network_verified=False):
    """All flags are evidence requirements, never self-attestation by the browser.

    invoice_count_for_address MUST include historical invoices, all organizations,
    and all statuses for the same chain/address; obtain under transactional lock
    before reserving an address. This function does not reserve it.
    """
    reasons = []
    if network != 'mainnet':
        reasons.append('unsupported_network')
    try:
        from app_bch_flow.core.address_validation import validate_cashaddr
        if not isinstance(address, str) or validate_cashaddr(address, 'mainnet') != address:
            reasons.append('invalid_or_noncanonical_cashaddr')
    except (ValueError, TypeError, ImportError, AttributeError):
        reasons.append('invalid_or_noncanonical_cashaddr')
    if type(amount_satoshis) is not int or not 546 <= amount_satoshis <= 2100000000000000:
        reasons.append('invalid_amount')
    if type(invoice_count_for_address) is not int or invoice_count_for_address != 1:
        reasons.append('address_not_unique_across_all_invoices')
    requirements = {
        'wallet_ownership_not_verified': wallet_ownership_verified,
        'wallet_inactive': wallet_active,
        'invoice_inactive': invoice_active,
        'address_not_proven_derived_from_wallet': address_derived_from_wallet,
        'address_reservation_not_exclusive': address_exclusive_reservation,
        'provider_network_not_verified': provider_network_verified,
    }
    for reason, value in requirements.items():
        if value is not True:
            reasons.append(reason)
    return ReceivingEligibility(not reasons, tuple(reasons))
