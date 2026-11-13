"""WizardConnect hdwalletv1; transport is implemented by the official browser SDK."""
PROTOCOL = 'hdwalletv1'
SDK_CORE_VERSION = '0.2.5'
SDK_DAPP_VERSION = '0.2.2'


def relay_urls():
    from django.conf import settings
    from urllib.parse import urlsplit
    defaults = ['wss://relay.riften.net:443', 'wss://relay.cauldron.quest:443']
    configured = getattr(settings, 'FLOW_WIZARDCONNECT_RELAYS', defaults)
    if isinstance(configured, str):
        configured = configured.split(',')
    if not isinstance(configured, (list, tuple)):
        configured = defaults
    valid = []
    for value in configured[:4]:
        try:
            url = urlsplit(value.strip())
            local_test = settings.DEBUG and url.scheme == 'ws' and url.hostname in ('localhost', '127.0.0.1')
            if ((url.scheme == 'wss' or local_test) and url.hostname and url.username is None
                    and url.password is None and url.path in ('', '/') and not url.query and not url.fragment):
                if url.port is not None and not 1 <= url.port <= 65535:
                    continue
                valid.append(value.strip())
        except (ValueError, AttributeError):
            continue
    return valid or defaults
