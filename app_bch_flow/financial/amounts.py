from django.utils.translation import gettext as _
from decimal import Decimal, InvalidOperation
from .assets import ASSET_INFO, FIAT_ASSETS
from app_bch_flow.models.payment_core import MAX_UNITS


class PaymentError(ValueError):
    """A user-safe failure, without provider credentials or raw remote responses."""


class ProviderUnavailable(PaymentError):
    pass


def units(value, asset):
    if asset not in ASSET_INFO:
        raise PaymentError(_("Unsupported asset."))
    try:
        amount = Decimal(str(value))
        scale = 100 if asset in FIAT_ASSETS else 100_000_000
        result = amount * scale
        if (
            not result.is_finite()
            or result != result.to_integral_value()
            or not 0 < result <= MAX_UNITS
        ):
            raise ValueError
        return int(result)
    except (InvalidOperation, ValueError, TypeError, OverflowError):
        raise PaymentError(
            _(
                "Enter a positive amount with up to 2 decimal places for fiat or 8 for crypto."
            )
        ) from None


def display(value, asset):
    if asset not in ASSET_INFO:
        raise PaymentError(_("Unsupported asset."))
    scale = Decimal(100 if asset in FIAT_ASSETS else 100_000_000)
    return format(Decimal(value) / scale, ".2f" if asset in FIAT_ASSETS else ".8f")
