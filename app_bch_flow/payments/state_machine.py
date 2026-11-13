"""Conservative payment lifecycle; never treat observed as final."""
ALLOWED = {
    "created": frozenset({"awaiting_payment", "expired", "cancelled"}),
    "awaiting_payment": frozenset({"detected", "expired", "cancelled"}),
    "detected": frozenset({"confirming", "underpaid", "disputed"}),
    "confirming": frozenset({"confirmed", "disputed", "underpaid"}),
    "underpaid": frozenset({"confirming", "expired", "disputed"}),
    "confirmed": frozenset({"disputed"}),
    "disputed": frozenset({"confirming", "confirmed"}),
    "expired": frozenset(),
    "cancelled": frozenset(),
}

def transition(current, target):
    if target not in ALLOWED.get(current, frozenset()):
        raise ValueError(f"Invalid payment state transition: {current} -> {target}")
    return target
