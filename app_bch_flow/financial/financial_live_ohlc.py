"""Read-only historical OHLC data for the BCH Flow finance UI.

Source: CoinGecko public OHLC API. This endpoint is NOT an account balance,
price oracle, settlement input, transaction confirmation or trading service.
"""
from __future__ import annotations

import json
import logging
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.http import require_GET

_LOG = logging.getLogger(__name__)
_IDS = {"BTC": "bitcoin", "BCH": "bitcoin-cash"}
_DAYS = {1, 7, 30, 90}


@require_GET
def candles(request):
    asset = (request.GET.get("asset") or "").upper()
    try:
        days = int(request.GET.get("days", "7"))
    except (ValueError, TypeError):
        days = -1
    if asset not in _IDS or days not in _DAYS:
        return JsonResponse({"available": False, "message": "Unsupported market or period."}, status=400)

    cache_key = f"bch_flow_v11_real_ohlc_{asset}_{days}"
    cached = cache.get(cache_key)
    if cached is None:
        url = f"https://api.coingecko.com/api/v3/coins/{_IDS[asset]}/ohlc?vs_currency=usd&days={days}"
        try:
            req = Request(url, headers={"Accept": "application/json", "User-Agent": "BCHFlow-Wallet-Market/1.0"})
            with urlopen(req, timeout=7) as response:
                if response.status != 200:
                    raise ValueError("HTTP status")
                raw = response.read(280000)
            payload = json.loads(raw)
            if not isinstance(payload, list):
                raise ValueError("Unexpected OHLC response")
            candles_list = []
            last_time = 0
            for entry in payload:
                if not isinstance(entry, list) or len(entry) != 5:
                    continue
                millis = int(entry[0])
                time = millis // 1000
                if time <= last_time or time <= 0:
                    continue
                values = [Decimal(str(item)) for item in entry[1:]]
                if not all(item.is_finite() and item > 0 for item in values):
                    continue
                opening, high, low, close = values
                if not (low <= opening <= high and low <= close <= high):
                    continue
                last_time = time
                candles_list.append({"time": time, "open": float(opening), "high": float(high), "low": float(low), "close": float(close)})
            if len(candles_list) < 2:
                raise ValueError("Not enough verified OHLC records")
            cached = candles_list[-400:]
            cache.set(cache_key, cached, 90)
        except (URLError, HTTPError, ValueError, TypeError, KeyError, InvalidOperation,
                TimeoutError, json.JSONDecodeError, OverflowError) as exc:
            _LOG.warning("Market candles unavailable for %s (%s days): %s", asset, days, type(exc).__name__)
            response = JsonResponse({"available": False, "message": "Real market candles are temporarily unavailable."}, status=503)
            response["Cache-Control"] = "no-store"
            return response
    response = JsonResponse({"available": True, "source": "CoinGecko", "asset": asset,
                             "quote": "USD", "days": days, "indicative_only": True,
                             "candles": cached})
    response["Cache-Control"] = "public, max-age=60"
    return response
