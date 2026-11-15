"""Read-only indicative market rates. Never used to settle or calculate invoices."""
import json
import logging
from decimal import Decimal, InvalidOperation
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.http import require_GET

LOG = logging.getLogger(__name__)
FIAT = ("usd", "brl", "eur", "gbp", "jpy", "cad", "aud", "mxn", "ars", "clp", "cop")
KEY = "bchflow_public_market_rates_v1"

@require_GET
def rates(request):
    data = cache.get(KEY)
    if data is None:
        url = ("https://api.coingecko.com/api/v3/simple/price"
               "?ids=bitcoin,bitcoin-cash&vs_currencies=" + ",".join(FIAT)
               + "&include_last_updated_at=true")
        try:
            req = Request(url, headers={"Accept":"application/json",
                                       "User-Agent":"BCHFlow-MarketConverter/1.0"})
            with urlopen(req, timeout=5) as response:
                if response.status != 200:
                    raise ValueError("Price provider returned non-200 status")
                raw = response.read(16384)
            payload = json.loads(raw)
            result = {}
            for asset, key in (("BTC","bitcoin"),("BCH","bitcoin-cash")):
                source = payload[key]
                ts = int(source["last_updated_at"])
                if ts <= 0: raise ValueError("Invalid provider timestamp")
                prices = {}
                for currency in FIAT:
                    value = Decimal(str(source[currency]))
                    if not value.is_finite() or value <= 0:
                        raise ValueError("Invalid market price")
                    prices[currency.upper()] = str(value)
                result[asset] = {"prices": prices, "updated_at": ts}
            data = result
            cache.set(KEY, data, 60)
        except (URLError, HTTPError, ValueError, KeyError, TypeError, InvalidOperation,
                TimeoutError, json.JSONDecodeError) as exc:
            LOG.warning("Market conversion unavailable: %s", type(exc).__name__)
            response = JsonResponse({"available": False,
                                     "message": "Live rates temporarily unavailable."}, status=503)
            response["Cache-Control"] = "no-store"
            return response
    response = JsonResponse({"available": True, "source": "CoinGecko",
                             "indicative_only": True, "rates": data})
    response["Cache-Control"] = "public, max-age=30"
    return response
