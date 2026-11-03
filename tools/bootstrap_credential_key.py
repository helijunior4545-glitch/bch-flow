#!/usr/bin/env python3
"""Create a local development encryption key without printing or replacing it.

Production keys belong in a secure secret mount, outside the checkout.
"""

import os
from pathlib import Path
from cryptography.fernet import Fernet


def bootstrap(path):
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        return False
    with os.fdopen(descriptor, "wb") as output:
        output.write(Fernet.generate_key() + b"\n")
    return True


if __name__ == "__main__":
    key_path = Path(__file__).resolve().parents[1] / ".merchant-encryption.key"
    created = bootstrap(key_path)
    print(
        "Created local credential key."
        if created
        else "Existing credential key preserved."
    )
    print("Set FLOW_CREDENTIAL_KEY_FILE to this local path:", key_path)
