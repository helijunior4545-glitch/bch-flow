"""Feature flags default to fail-closed."""
FEATURE_STATUS = {
    "identity": "SCAFFOLDED",
    "tenancy": "SCAFFOLDED",
    "directory": "SCAFFOLDED",
    "wallet_connect": "PLANNED",
    "mainnet_payment": "PLANNED",
    "invoice_reconciliation": "PLANNED",
    "merchant_api": "SCAFFOLDED",
    "design_system": "SCAFFOLDED",
}

def live_payments_enabled():
    return False
