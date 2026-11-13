"""Credential encryption must work with a runtime secret, without host code edits."""

import os
import tempfile
from pathlib import Path
from unittest.mock import patch
from cryptography.fernet import Fernet
from django.test import SimpleTestCase, override_settings
from app_bch_flow.financial.secrets import seal, unseal
from app_bch_flow.financial.amounts import ProviderUnavailable


@override_settings(FLOW_CREDENTIAL_ENCRYPTION_KEYS=[], FLOW_CREDENTIAL_KEY_FILE="")
class CredentialEnvironmentTests(SimpleTestCase):
    def setUp(self):
        self.key = Fernet.generate_key().decode()
        self.environment = patch.dict(
            os.environ,
            {
                "FLOW_CREDENTIAL_ENCRYPTION_KEY": self.key,
                "FLOW_CREDENTIAL_KEY_FILE": "",
            },
        )
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_runtime_key_encrypts_and_decrypts(self):
        encrypted = seal("fixture-provider-token")
        self.assertNotIn("fixture-provider-token", encrypted)
        self.assertEqual(unseal(encrypted), "fixture-provider-token")
        self.assertEqual(
            Fernet(self.key.encode()).decrypt(encrypted.encode()),
            b"fixture-provider-token",
        )

    def test_missing_key_keeps_connections_blocked(self):
        with patch.dict(os.environ, {"FLOW_CREDENTIAL_ENCRYPTION_KEY": ""}):
            with self.assertRaises(ProviderUnavailable):
                seal("fixture")

    def test_invalid_key_is_rejected(self):
        with patch.dict(os.environ, {"FLOW_CREDENTIAL_ENCRYPTION_KEY": "invalid-key"}):
            with self.assertRaises(ProviderUnavailable):
                seal("fixture")

    def test_explicit_settings_take_precedence(self):
        configured = Fernet.generate_key()
        with override_settings(FLOW_CREDENTIAL_ENCRYPTION_KEYS=[configured]):
            encrypted = seal("fixture")
        self.assertEqual(Fernet(configured).decrypt(encrypted.encode()), b"fixture")

    def test_key_file_takes_precedence(self):
        configured = Fernet.generate_key()
        with tempfile.TemporaryDirectory() as directory:
            filename = Path(directory) / "keys"
            filename.write_bytes(configured + b"\n")
            with patch.dict(os.environ, {"FLOW_CREDENTIAL_KEY_FILE": str(filename)}):
                encrypted = seal("fixture")
        self.assertEqual(Fernet(configured).decrypt(encrypted.encode()), b"fixture")
