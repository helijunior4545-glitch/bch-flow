"""Bounded NOWNodes transport using the requests client verified in production.

Keep TLS verification and inherited proxy settings. No automatic retries or
redirects: a lost broadcast response must remain recoverable by expected TXID.
"""

import json
from decimal import Decimal
from urllib.parse import urlsplit
import requests
from django.utils.translation import gettext as _
from django.views.decorators.debug import sensitive_variables
from .amounts import ProviderUnavailable
from .providers import _provider_failure

ALLOWED_HOSTS = frozenset(
    {
        "btc.nownodes.io",
        "btcbook.nownodes.io",
        "bch.nownodes.io",
        "bchbook.nownodes.io",
    }
)
MAX_RESPONSE_BYTES = 2_000_000


@sensitive_variables()
def read_json(
    url, *, api_key, payload=None, allow_list=False, provider_label="NOWNodes"
):
    try:
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in ALLOWED_HOSTS
            or parsed.port not in (None, 443)
            or parsed.username
            or parsed.password
            or parsed.fragment
        ):
            raise ValueError
    except (ValueError, TypeError):
        raise ProviderUnavailable(
            _("Invalid NOWNodes authentication destination.")
        ) from None
    # Preserve the lowercase header used by the successful production probe.
    # requests supplies its normal User-Agent and JSON Content-Type for POSTs.
    headers = {"api-key": api_key}
    options = {
        "headers": headers,
        "timeout": 20,
        "allow_redirects": False,
        "stream": True,
    }
    try:
        if payload is None:
            headers["Accept"] = "application/json"
            response = requests.get(url, **options)
        else:
            response = requests.post(url, json=payload, **options)
        with response:
            status = response.status_code
            if 300 <= status < 400:
                raise ProviderUnavailable(
                    f"{provider_label} · {parsed.hostname} · HTTP {status}: "
                    + str(_("Unexpected provider redirect."))
                )
            if not 200 <= status < 300:
                reason = (
                    "access"
                    if status in (401, 403)
                    else "rate"
                    if status == 429
                    else "endpoint"
                    if status == 404
                    else "service"
                )
                raise _provider_failure(url, provider_label, reason, status)
            body = bytearray()
            for chunk in response.iter_content(chunk_size=65536):
                if len(body) + len(chunk) > MAX_RESPONSE_BYTES:
                    raise ValueError
                body.extend(chunk)
            result = json.loads(body, parse_float=Decimal)
            if not isinstance(result, (dict, list) if allow_list else dict):
                raise ValueError
            return result
    except ProviderUnavailable:
        raise
    except requests.Timeout:
        raise _provider_failure(url, provider_label, "timeout") from None
    except requests.RequestException:
        raise _provider_failure(url, provider_label, "network") from None
    except (ValueError, UnicodeError):
        raise _provider_failure(url, provider_label, "response") from None
