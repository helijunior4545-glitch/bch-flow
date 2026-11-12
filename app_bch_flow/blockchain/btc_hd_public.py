"""Read-only BIP84 mainnet address derivation. No signing or secrets."""
from __future__ import annotations

import re
from embit import bip32, networks, script


class PublicWalletError(ValueError):
    pass


def derive_bip84_mainnet_address(account_xpub: str, index: int) -> str:
    """Derive m/0/index relative to a BIP84 account-level mainnet xpub.

    An xpub cannot prove its own parent derivation path. Verify account path,
    seed backup and signer ownership independently before accepting deposits.
    """
    if not isinstance(account_xpub, str) or not re.fullmatch(
        r"xpub[1-9A-HJ-NP-Za-km-z]{100,120}", account_xpub
    ):
        raise PublicWalletError("Expected a mainnet account-level xpub")
    if type(index) is not int or not 0 <= index < 2**31:
        raise PublicWalletError("Invalid unhardened address index")
    try:
        key = bip32.HDKey.from_base58(account_xpub)
        if key.is_private or key.depth != 3 or key.child_number < 2**31:
            raise PublicWalletError("Expected a public BIP84 account-level key")
        child = key.derive([0, index])
        address = script.p2wpkh(child).address(networks.NETWORKS["main"])
    except PublicWalletError:
        raise
    except Exception as exc:
        raise PublicWalletError("Invalid extended public key or derivation") from exc
    if not re.fullmatch(r"bc1q[023456789acdefghjklmnpqrstuvwxyz]{38,90}", address):
        raise PublicWalletError("Unexpected BTC mainnet address")
    return address
