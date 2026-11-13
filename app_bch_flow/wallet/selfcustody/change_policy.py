"""BCH Flow change-address policy, intentionally fail-closed."""

class UnsafeChangeAddress(RuntimeError):
    pass


def require_dedicated_change_address(*, change_address, invoice_addresses, destination):
    """Reject invoice reuse, absent change, or change equal to destination.

    Does not establish ownership of a proposed address; that requires a separate
    verified derivation/ownership registry and blockchain integration.
    """
    if not isinstance(change_address, str) or not change_address.strip():
        raise UnsafeChangeAddress("A dedicated wallet-owned change address is required")
    if change_address in set(invoice_addresses):
        raise UnsafeChangeAddress("Invoice addresses cannot be reused for change")
    if change_address == destination:
        raise UnsafeChangeAddress("Change and payment destination must differ")
    return change_address


def require_bch_signer_ready(account):
    """Temporary hard stop: no audited client signer/change registry exists yet."""
    if getattr(account, "asset", None) == "BCH":
        raise UnsafeChangeAddress(
            "BCH self-custody signing is blocked until a dedicated change "
            "registry, local signer and Chipnet verification are integrated"
        )
