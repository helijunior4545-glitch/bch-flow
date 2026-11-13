"""Currency metadata; display language never changes base units or converts funds."""

from django.utils.translation import gettext_lazy as _

ASSET_INFO = {
    "BTC": {"name": _("Bitcoin"), "decimals": 8, "icon": "bitcoin", "kind": "crypto"},
    "BCH": {
        "name": _("Bitcoin Cash"),
        "decimals": 8,
        "icon": "bitcoin",
        "kind": "crypto",
    },
    "BRL": {
        "name": _("Brazilian real / Pix"),
        "decimals": 2,
        "icon": "scan-line",
        "kind": "fiat",
    },
    "USD": {
        "name": _("US dollar"),
        "decimals": 2,
        "icon": "dollar-sign",
        "kind": "fiat",
    },
    "EUR": {"name": _("Euro"), "decimals": 2, "icon": "euro", "kind": "fiat"},
}
FIAT_ASSETS = frozenset(
    code for code, meta in ASSET_INFO.items() if meta["kind"] == "fiat"
)
SANDBOX_ONLY = frozenset(("USD", "EUR"))
