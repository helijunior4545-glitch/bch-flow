"""HTTP client regression coverage for the successful requests production probe."""

from decimal import Decimal
from unittest.mock import MagicMock, patch
import requests
from django.test import SimpleTestCase
from app_bch_flow.financial.node_http import read_json, MAX_RESPONSE_BYTES
from app_bch_flow.financial.amounts import ProviderUnavailable


class NodeHTTPTests(SimpleTestCase):
    key = "private-test-fixture-key"
    url = "https://btc.nownodes.io"
    payload = {
        "jsonrpc": "2.0",
        "id": "flow",
        "method": "getblockchaininfo",
        "params": [],
    }

    def response(self, status=200, chunks=None):
        response = MagicMock()
        response.status_code = status
        response.iter_content.return_value = (
            chunks if chunks is not None else [b'{"result":{"chain":"main"}}']
        )
        response.__enter__.return_value = response
        return response

    def test_rpc_uses_the_successful_requests_shape_and_preserves_default_trust(self):
        response = self.response()
        with patch(
            "app_bch_flow.financial.node_http.requests.post", return_value=response
        ) as post:
            result = read_json(self.url, api_key=self.key, payload=self.payload)
        self.assertEqual(result["result"]["chain"], "main")
        post.assert_called_once_with(
            self.url,
            json=self.payload,
            headers={"api-key": self.key},
            timeout=20,
            allow_redirects=False,
            stream=True,
        )
        self.assertNotIn("verify", post.call_args.kwargs)
        self.assertNotIn("proxies", post.call_args.kwargs)
        response.__exit__.assert_called_once()

    def test_blockbook_uses_get_and_supports_arrays_and_exact_decimal_values(self):
        with patch(
            "app_bch_flow.financial.node_http.requests.get",
            return_value=self.response(chunks=[b'[{"value":0.12345678}]']),
        ) as get:
            result = read_json(
                "https://btcbook.nownodes.io/api/v2/utxo/address",
                api_key=self.key,
                allow_list=True,
            )
        self.assertEqual(result[0]["value"], Decimal("0.12345678"))
        self.assertEqual(
            get.call_args.kwargs["headers"],
            {"api-key": self.key, "Accept": "application/json"},
        )

    def test_http_denial_preserves_diagnostics_without_reading_or_exposing_error_body(
        self,
    ):
        for status in (401, 403, 404, 429, 503):
            with self.subTest(status=status):
                response = self.response(status, [self.key.encode()])
                with patch(
                    "app_bch_flow.financial.node_http.requests.post",
                    return_value=response,
                ):
                    with self.assertRaises(ProviderUnavailable) as raised:
                        read_json(
                            self.url,
                            api_key=self.key,
                            payload=self.payload,
                            provider_label="NOWNodes RPC",
                        )
                self.assertIn(f"HTTP {status}", str(raised.exception))
                self.assertNotIn(self.key, str(raised.exception))
                response.iter_content.assert_not_called()

    def test_redirect_is_rejected_without_forwarding_credentials(self):
        response = self.response(302)
        response.headers = {"Location": "https://another.example"}
        with patch(
            "app_bch_flow.financial.node_http.requests.post", return_value=response
        ) as post:
            with self.assertRaisesRegex(ProviderUnavailable, "redirect"):
                read_json(self.url, api_key=self.key, payload=self.payload)
        self.assertEqual(post.call_count, 1)
        self.assertFalse(post.call_args.kwargs["allow_redirects"])

    def test_timeout_or_network_error_never_retries_a_broadcast(self):
        for error in (requests.Timeout(self.key), requests.ConnectionError(self.key)):
            with self.subTest(error=type(error).__name__):
                with patch(
                    "app_bch_flow.financial.node_http.requests.post", side_effect=error
                ) as post:
                    with self.assertRaises(ProviderUnavailable) as raised:
                        read_json(
                            self.url,
                            api_key=self.key,
                            payload={"method": "sendrawtransaction", "params": ["00"]},
                        )
                self.assertEqual(post.call_count, 1)
                self.assertNotIn(self.key, str(raised.exception))

    def test_invalid_or_oversized_json_is_rejected(self):
        for chunks in (
            [b"<html>blocked</html>"],
            [b"null"],
            [b"x" * MAX_RESPONSE_BYTES, b"x"],
        ):
            with self.subTest(size=sum(map(len, chunks))):
                with patch(
                    "app_bch_flow.financial.node_http.requests.post",
                    return_value=self.response(chunks=chunks),
                ):
                    with self.assertRaisesRegex(ProviderUnavailable, "JSON"):
                        read_json(self.url, api_key=self.key, payload=self.payload)

    def test_credentials_cannot_be_sent_to_unapproved_destinations(self):
        for url in (
            "http://btc.nownodes.io",
            "https://another.example",
            "https://btc.nownodes.io@another.example",
            "https://btc.nownodes.io:8443",
        ):
            with self.subTest(url=url):
                with patch("app_bch_flow.financial.node_http.requests.post") as post:
                    with self.assertRaises(ProviderUnavailable):
                        read_json(url, api_key=self.key, payload=self.payload)
                    post.assert_not_called()
