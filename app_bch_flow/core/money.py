"""Exact satoshi and fiat amounts. Never use float for money."""
from decimal import Decimal, InvalidOperation, ROUND_DOWN
SATOSHIS_PER_BCH = 100_000_000

def bch_to_satoshis(value):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Invalid BCH amount") from exc
    if not amount.is_finite() or amount <= 0:
        raise ValueError("Amount must be positive and finite")
    sats = amount * SATOSHIS_PER_BCH
    if sats != sats.to_integral_value():
        raise ValueError("BCH amount exceeds eight decimal places")
    return int(sats)

def satoshis_to_bch(satoshis):
    if type(satoshis) is not int or satoshis < 0:
        raise ValueError("Satoshis must be a nonnegative integer")
    return Decimal(satoshis) / Decimal(SATOSHIS_PER_BCH)

def fiat_to_bch_satoshis(fiat_amount, fiat_per_bch):
    fiat, rate = Decimal(str(fiat_amount)), Decimal(str(fiat_per_bch))
    if not fiat.is_finite() or not rate.is_finite() or fiat <= 0 or rate <= 0:
        raise ValueError("Invalid fiat amount or exchange rate")
    return int(((fiat / rate) * SATOSHIS_PER_BCH).to_integral_value(rounding=ROUND_DOWN))
