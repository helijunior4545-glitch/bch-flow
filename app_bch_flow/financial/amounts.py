from decimal import Decimal, InvalidOperation
from app_bch_flow.models.payment_core import MAX_UNITS


class PaymentError(ValueError):
    """A user-safe failure, without provider credentials or raw remote responses."""


class ProviderUnavailable(PaymentError):
    pass


def units(value, asset):
    if asset not in ("BTC", "BCH", "BRL"):
        raise PaymentError("Ativo não suportado.")
    try:
        amount = Decimal(str(value))
        scale = 100 if asset == "BRL" else 100_000_000
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
            "Informe um valor positivo com até 2 casas em reais ou 8 em cripto."
        ) from None


def display(value, asset):
    scale = Decimal(100 if asset == "BRL" else 100_000_000)
    return format(Decimal(value) / scale, ".2f" if asset == "BRL" else ".8f")
