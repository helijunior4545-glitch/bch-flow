"""Alias normalization. Confusable-name defenses require additional review."""
import re
ALIAS_RE = re.compile(r"^[a-z][a-z0-9_]{2,31}$")

def normalize_alias(value):
    if not isinstance(value, str):
        raise ValueError("Alias must be text")
    alias = value.strip().removeprefix("@").lower()
    if not ALIAS_RE.fullmatch(alias):
        raise ValueError("Alias must be 3-32 ASCII characters, beginning with a letter")
    return alias
