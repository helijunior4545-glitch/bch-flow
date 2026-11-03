"""Application credential encryption, with rotation and no SECRET_KEY fallback."""

from django.views.decorators.debug import sensitive_variables


from cryptography.fernet import Fernet, MultiFernet, InvalidToken
from django.conf import settings
from django.utils.translation import gettext as _
from .amounts import ProviderUnavailable


@sensitive_variables()
def cipher():
    keys = getattr(settings, "FLOW_CREDENTIAL_ENCRYPTION_KEYS", [])
    filename = getattr(settings, "FLOW_CREDENTIAL_KEY_FILE", "")
    if not keys and filename:
        try:
            with open(filename, encoding="ascii") as source:
                text = source.read(8193)
            if len(text) > 8192:
                raise ValueError
            keys = [line.strip() for line in text.splitlines() if line.strip()]
        except (OSError, ValueError, UnicodeError):
            raise ProviderUnavailable(
                _("Credential encryption is not configured. Contact the administrator.")
            ) from None
    if not keys:
        raise ProviderUnavailable(
            _("Credential encryption is not configured. Contact the administrator.")
        )
    try:
        return MultiFernet(
            [Fernet(key.encode() if isinstance(key, str) else key) for key in keys]
        )
    except (ValueError, TypeError):
        raise ProviderUnavailable(
            _("The credential encryption key is invalid.")
        ) from None


@sensitive_variables()
def seal(value):
    return cipher().encrypt(value.encode()).decode()


@sensitive_variables()
def unseal(value):
    try:
        return cipher().decrypt(value.encode()).decode()
    except (InvalidToken, ValueError, UnicodeError):
        raise ProviderUnavailable(
            _("The stored credential cannot be decrypted. Reconnect the account.")
        ) from None
