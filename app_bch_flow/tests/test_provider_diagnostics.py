"""Provider diagnostics expose useful categories without exposing credentials."""

from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import Request
from django.test import SimpleTestCase
from app_bch_flow.financial.providers import _read_json
from app_bch_flow.financial.amounts import ProviderUnavailable


class ProviderDiagnosticsTests(SimpleTestCase):
    def setUp(self):
        self.request = Request(
            "https://btc.nownodes.io",
            data=b"{}",
            headers={"api-key": "private-fixture-key"},
        )

    def test_http_status_and_endpoint_are_visible_without_raw_error_body(self):
        for status in (401, 403, 404, 429, 503):
            with self.subTest(status=status):
                error = HTTPError(
                    self.request.full_url,
                    status,
                    "private-fixture-key",
                    {},
                    BytesIO(b"private-fixture-key"),
                )
                with patch("app_bch_flow.financial.providers.build_opener") as opener:
                    opener.return_value.open.side_effect = error
                    with self.assertRaises(ProviderUnavailable) as raised:
                        _read_json(self.request, provider_label="NOWNodes RPC")
                message = str(raised.exception)
                self.assertIn(f"HTTP {status}", message)
                self.assertIn("btc.nownodes.io", message)
                self.assertNotIn("private-fixture-key", message)

    def test_timeout_and_network_failures_do_not_expose_exception_details(self):
        for error, expected in [
            (TimeoutError("private-fixture-key"), "timeout"),
            (URLError("private-fixture-key"), "could not reach"),
        ]:
            with self.subTest(error=type(error).__name__):
                with patch("app_bch_flow.financial.providers.build_opener") as opener:
                    opener.return_value.open.side_effect = error
                    with self.assertRaises(ProviderUnavailable) as raised:
                        _read_json(self.request, provider_label="NOWNodes RPC")
                self.assertIn(expected, str(raised.exception))
                self.assertNotIn("private-fixture-key", str(raised.exception))

    def test_invalid_response_has_safe_diagnostic(self):
        with patch("app_bch_flow.financial.providers.build_opener") as opener:
            opener.return_value.open.return_value.__enter__.return_value.read.return_value = b"private-fixture-key"
            with self.assertRaises(ProviderUnavailable) as raised:
                _read_json(self.request, provider_label="NOWNodes RPC")
        self.assertIn("JSON", str(raised.exception))
        self.assertNotIn("private-fixture-key", str(raised.exception))
