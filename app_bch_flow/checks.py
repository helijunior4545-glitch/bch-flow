"""Django checks: no claim of a verified live integration."""
from django.core.checks import Warning, register

@register()
def bchflow_readiness_check(app_configs, **kwargs):
    return [Warning("BCH Flow blockchain/wallet integration is NOT verified; do not enable live payments.", id="bchflow.W001")]
