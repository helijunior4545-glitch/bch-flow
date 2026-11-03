"""Concrete adapters. Configuration is server-owned and scoped to one organization.

No generic user-supplied URLs, signing keys, or credentials in database records.
"""

from django.utils.translation import gettext as _


import base64
import hashlib
import hmac
import json
import os
import re
import time
from decimal import Decimal
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import URLError, HTTPError
from django.conf import settings
from .amounts import PaymentError, ProviderUnavailable, units, display
from .assets import SANDBOX_ONLY


def provider_config(account):
    if account.environment == "sandbox":
        return {}
    if account.environment == "live" and not getattr(
        settings, "FLOW_PAYMENTS_ALLOW_LIVE", False
    ):
        raise ProviderUnavailable(
            _(
                "Production is disabled. Configure and validate the integration before enabling it."
            )
        )
    if account.environment == "live" and (
        settings.DEBUG
        or not getattr(settings, "SESSION_COOKIE_SECURE", False)
        or not getattr(settings, "CSRF_COOKIE_SECURE", False)
    ):
        raise ProviderUnavailable(
            _("Production requires HTTPS, secure cookies and DEBUG disabled.")
        )
    if account.asset in SANDBOX_ONLY:
        raise ProviderUnavailable(
            _("USD and EUR payments require a supported fiat provider.")
        )
    if account.asset == "BRL":
        from .integrations import connection_credentials

        managed = connection_credentials(account.organization_id, account.environment)
        if managed is not None:
            return {**managed, "_managed_connection": True}
    configs = getattr(settings, "FLOW_PAYMENT_PROVIDERS", {})
    config = (
        configs.get(str(account.organization_id), {})
        .get(account.asset, {})
        .get(account.environment)
    )
    if not isinstance(config, dict):
        raise ProviderUnavailable(
            _("No provider is configured for this organization, asset and environment.")
        )
    return config


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ProviderUnavailable(_("Unexpected provider redirect."))


def _read_json(request):
    try:
        with build_opener(_NoRedirect()).open(request, timeout=15) as response:
            body = response.read(2_000_001)
            if len(body) > 2_000_000:
                raise ValueError
            result = json.loads(body, parse_float=Decimal)
            if not isinstance(result, dict):
                raise ValueError
            return result
    except (URLError, HTTPError, TimeoutError, OSError, ValueError):
        raise ProviderUnavailable(
            _(
                "The provider did not confirm the operation. Check its status before retrying."
            )
        ) from None


def local_secret(config, name):
    # Secret files are used only to authenticate configured operations, never
    # inspected for discovery or written to application records/logs.
    if config.get("_managed_connection") and name in config:
        return config[name]
    filename = config.get(name + "_file")
    if filename:
        try:
            with open(filename, encoding="utf-8") as stream:
                value = stream.read(4097).strip()
            if len(value) > 4096:
                raise ValueError
            return value
        except (OSError, ValueError):
            raise ProviderUnavailable(
                _("The local authentication secret is unavailable.")
            ) from None
    return os.environ.get(config.get(name + "_env", ""), "")


class MercadoPago:
    """Checkout API /v1/payments. Payouts are intentionally not assumed available."""

    def __init__(self, account):
        self.account = account
        self.config = dict(provider_config(account))
        self.token = local_secret(self.config, "access_token")
        self.config["collector_id"] = self.config.get("collector_id") or os.environ.get(
            self.config.get("collector_id_env", ""), ""
        )
        if not self.token or not str(self.config.get("collector_id", "")).isdigit():
            raise ProviderUnavailable(
                _("Mercado Pago credentials and merchant ID are required.")
            )

        for organization, assets in getattr(
            settings, "FLOW_PAYMENT_PROVIDERS", {}
        ).items():
            if organization == str(account.organization_id):
                continue
            for candidate in assets.get("BRL", {}).values():
                other = candidate.get("collector_id") or os.environ.get(
                    candidate.get("collector_id_env", ""), ""
                )
                if str(other) == str(self.config["collector_id"]):
                    raise ProviderUnavailable(
                        _(
                            "A Mercado Pago account cannot be shared between organizations."
                        )
                    )

    def call(self, path, payload=None, key=None):
        if not re.fullmatch(r"/v1/payments(?:/[0-9]+)?", path):
            raise PaymentError(_("Invalid provider resource."))
        headers = {
            "Authorization": "Bearer " + self.token,
            "Content-Type": "application/json",
        }
        if key:
            headers["X-Idempotency-Key"] = key
        # Preserve cents exactly when encoding the numeric transaction_amount.
        data = None
        if payload is not None:
            body = dict(payload)
            amount = body.pop("transaction_amount")
            if not isinstance(amount, str) or not re.fullmatch(
                r"[0-9]+\.[0-9]{2}", amount
            ):
                raise PaymentError(_("Invalid Pix amount."))
            data = (
                '{"transaction_amount":' + amount + "," + json.dumps(body)[1:]
            ).encode()
        return _read_json(
            Request("https://api.mercadopago.com" + path, data=data, headers=headers)
        )

    def create(self, request, payer_email):
        if not payer_email:
            raise PaymentError(_("Payer email is required to create a Pix request."))
        result = self.call(
            "/v1/payments",
            {
                "transaction_amount": display(request.amount_units, "BRL"),
                "description": request.description or "Payment request BCH Flow",
                "payment_method_id": "pix",
                "external_reference": str(request.pk),
                "date_of_expiration": request.expires_at.isoformat(
                    timespec="milliseconds"
                ),
                "payer": {"email": payer_email},
            },
            key=str(request.pk),
        )
        self.validate(result, request, require_approved=False)
        qr = (
            result.get("point_of_interaction", {})
            .get("transaction_data", {})
            .get("qr_code", "")
        )
        if not isinstance(qr, str) or not 1 <= len(qr) <= 5000:
            raise ProviderUnavailable(
                _("No Pix code was returned. Retry with the same operation key.")
            )
        return str(result["id"]), qr

    def get(self, resource_id):
        if not re.fullmatch(r"[0-9]{1,80}", str(resource_id)):
            raise PaymentError(_("Invalid payment identifier."))
        return self.call("/v1/payments/" + str(resource_id))

    def validate(self, data, request, require_approved=True):
        expected_live = self.account.environment == "live"
        if (
            data.get("live_mode") is not expected_live
            or str(data.get("collector_id")) != str(self.config["collector_id"])
            or data.get("currency_id") != "BRL"
            or data.get("payment_method_id") != "pix"
            or data.get("external_reference") != str(request.pk)
            or units(data.get("transaction_amount"), "BRL") != request.amount_units
            or not str(data.get("id", "")).isdigit()
            or (
                require_approved
                and (data.get("status") != "approved" or not data.get("date_approved"))
            )
            or (
                require_approved
                and Decimal(str(data.get("transaction_amount_refunded", 0))) != 0
            )
        ):
            raise PaymentError(
                _(
                    "The payment does not match the request, merchant or expected environment."
                )
            )


def validate_mp_signature(signature, request_id, resource_id, secret, now=None):
    """HMAC manifest documented by the official Mercado Pago webhook validator.

    Source: github.com/mercadopago/sdk-python, mercadopago/webhook/validator.py.
    Require all components for this payment-only endpoint; reject stale messages.
    """
    if (
        not secret
        or not request_id
        or len(request_id) > 200
        or not re.fullmatch(r"[0-9]{1,80}", resource_id or "")
    ):
        raise PaymentError(_("Unauthenticated notification."))
    try:
        parts = dict(part.strip().split("=", 1) for part in signature.split(","))
        ts, digest = parts["ts"], parts["v1"]
        if not re.fullmatch(r"[0-9]{1,16}", ts) or not re.fullmatch(
            r"[a-fA-F0-9]{64}", digest
        ):
            raise ValueError
        if abs((time.time() if now is None else now) - int(ts)) > 300:
            raise ValueError
        manifest = f"id:{resource_id};request-id:{request_id};ts:{ts};"
        expected = hmac.new(
            secret.encode(), manifest.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, digest):
            raise ValueError
    except (ValueError, KeyError, AttributeError):
        raise PaymentError(_("Invalid signature or expired notification.")) from None


class CoreNode:
    """Bitcoin Core / BCH Node, isolated watch-only wallet, externally signed sends."""

    def __init__(self, account):
        self.account = account
        self.config = provider_config(account)
        self.url = self.config.get("url", "")
        parsed = urlsplit(self.url)
        if (
            parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or "/wallet/" not in parsed.path
            or not (
                parsed.scheme == "https"
                or (
                    parsed.scheme == "http"
                    and parsed.hostname in ("localhost", "127.0.0.1")
                )
            )
        ):
            raise ProviderUnavailable(
                _("Configure an isolated watch-only wallet HTTPS RPC endpoint.")
            )
        configs = getattr(settings, "FLOW_PAYMENT_PROVIDERS", {})
        for organization, assets in configs.items():
            if organization != str(account.organization_id):
                for environments in assets.values():
                    if any(
                        c.get("url") == self.url
                        for c in environments.values()
                        if isinstance(c, dict)
                    ):
                        raise ProviderUnavailable(
                            _("An RPC wallet cannot be shared between organizations.")
                        )
        user = os.environ.get(self.config.get("username_env", ""), "")
        password = local_secret(self.config, "password")
        if not user or not password:
            raise ProviderUnavailable(
                _("RPC credentials are not configured for this organization.")
            )
        self.authorization = (
            "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()
        )
        required = self.config.get("confirmations", 3)
        if type(required) is not int or not 1 <= required <= 100:
            raise ProviderUnavailable(_("Invalid confirmation policy."))
        self.confirmations = required

    def rpc(self, method, *params):
        data = json.dumps(
            {"jsonrpc": "1.0", "id": "flow", "method": method, "params": params}
        ).encode()
        result = _read_json(
            Request(
                self.url,
                data=data,
                headers={
                    "Authorization": self.authorization,
                    "Content-Type": "application/json",
                },
            )
        )
        if result.get("error") is not None or "result" not in result:
            raise ProviderUnavailable(_("The node rejected the request or operation."))
        return result["result"]

    def ready(self):
        info = self.rpc("getblockchaininfo")
        wallet = self.rpc("getwalletinfo")
        expected = self.config.get("chain")
        if (
            not expected
            or info.get("chain") != expected
            or info.get("initialblockdownload") is not False
            or (self.account.environment == "live") != (expected == "main")
            or wallet.get("private_keys_enabled") is not False
        ):
            raise ProviderUnavailable(
                _(
                    "The node is not synchronized, the network is incorrect or the wallet is not watch-only."
                )
            )

    def validate_address(self, address):
        info = self.rpc("validateaddress", address)
        if info.get("isvalid") is not True:
            raise PaymentError(_("Invalid address for this account network."))
        return info.get("address", address)

    def new_address(self):
        self.ready()
        address = self.rpc("getnewaddress", "BCH Flow request")
        return self.validate_address(address)

    def outputs(self, txid):
        if not re.fullmatch(r"[a-fA-F0-9]{64}", txid or ""):
            raise PaymentError(_("Invalid TXID."))
        self.ready()
        # gettransaction is wallet-scoped; never accept a browser's claimed amount.
        tx = self.rpc("gettransaction", txid, True)
        confirmations = tx.get("confirmations", 0)
        if type(confirmations) is not int:
            raise PaymentError(_("Invalid confirmation response."))
        decoded = self.rpc("decoderawtransaction", tx["hex"])
        if decoded.get("txid") != txid.lower():
            raise PaymentError(_("The returned transaction does not match the TXID."))
        return confirmations, decoded["vout"]

    @staticmethod
    def output_address(output):
        script = output.get("scriptPubKey", {})
        address = script.get("address")
        if not address:
            addresses = script.get("addresses", [])
            address = addresses[0] if len(addresses) == 1 else None
        return address

    def inspect_signed(self, withdrawal, raw):
        from app_bch_flow.models import FlowReceipt, FlowRequest, FlowWithdrawal

        if not re.fullmatch(r"[a-fA-F0-9]{2,1000000}", raw or "") or len(raw) % 2:
            raise PaymentError(_("Invalid signed transaction."))
        self.ready()
        decoded = self.rpc("decoderawtransaction", raw)
        txid = decoded.get("txid", "")
        if not re.fullmatch(r"[a-f0-9]{64}", txid):
            raise PaymentError(_("Invalid returned TXID."))
        inputs = decoded.get("vin", [])
        if not 1 <= len(inputs) <= 100 or len(
            {(i.get("txid"), i.get("vout")) for i in inputs}
        ) != len(inputs):
            raise PaymentError(_("Invalid or duplicate transaction inputs."))
        planned = (
            set(withdrawal.inputs.values_list("txid", "vout"))
            if withdrawal.pk
            else set()
        )
        if planned and planned != {(i.get("txid"), i.get("vout")) for i in inputs}:
            raise PaymentError(_("Inputs do not match the reserved signing package."))
        unspent = {
            (u["txid"], u["vout"]): u
            for u in self.rpc("listunspent", self.confirmations)
        }
        total = 0
        change_addresses = set(
            FlowRequest.objects.filter(account=self.account).values_list(
                "address", flat=True
            )
        )
        for item in inputs:
            key = (item.get("txid"), item.get("vout"))
            source = (
                f"{self.account.asset}:{self.account.environment}:{key[0]}:{key[1]}"
            )
            receipt = FlowReceipt.objects.filter(
                request__account=self.account, source_key=source, status="credited"
            ).first()
            change = FlowWithdrawal.objects.filter(
                account=self.account, txid=key[0], status="submitted"
            ).exists()
            owned_change = (
                change and unspent.get(key, {}).get("address") in change_addresses
            )
            if key not in unspent or (receipt is None and not owned_change):
                raise PaymentError(
                    _(
                        "Inputs do not belong to available receipts for this organization."
                    )
                )
            input_amount = units(unspent[key]["amount"], self.account.asset)
            if receipt is not None and receipt.amount_units != input_amount:
                raise PaymentError(_("Input amount differs from the recorded receipt."))
            total += input_amount
        change_addresses = set(
            FlowRequest.objects.filter(account=self.account).values_list(
                "address", flat=True
            )
        )
        if withdrawal.destination in change_addresses:
            raise PaymentError(
                _("Use an external wallet as the withdrawal destination.")
            )
        sent, output_total = 0, 0
        for output in decoded.get("vout", []):
            value = units(output.get("value"), self.account.asset)
            address = self.output_address(output)
            if address == withdrawal.destination:
                sent += value
            elif address not in change_addresses:
                raise PaymentError(
                    _(
                        "The transaction contains an unauthorized destination or change address."
                    )
                )
            output_total += value
        fee = total - output_total
        if (
            sent != withdrawal.amount_units
            or not 0 <= fee <= withdrawal.fee_limit_units
        ):
            raise PaymentError(_("The amount or fee differs from the authorization."))
        accepted = self.rpc("testmempoolaccept", [raw])
        if (
            not isinstance(accepted, list)
            or not accepted
            or accepted[0].get("allowed") is not True
        ):
            raise PaymentError(
                _("The node did not accept the signed transaction for broadcast.")
            )
        return txid, fee, inputs

    def prepare_unsigned(self, withdrawal):
        from app_bch_flow.models import (
            FlowReceipt,
            FlowRequest,
            FlowWithdrawal,
            FlowSpend,
        )

        self.ready()
        change_addresses = set(
            FlowRequest.objects.filter(account=self.account)
            .exclude(address__startswith="pending:")
            .values_list("address", flat=True)
        )
        if not change_addresses or withdrawal.destination in change_addresses:
            raise PaymentError(
                _(
                    "An account-owned change address and external destination are required."
                )
            )
        selected, total = [], 0
        target = withdrawal.amount_units + withdrawal.fee_limit_units
        for coin in self.rpc("listunspent", self.confirmations):
            txid, vout = coin["txid"], coin["vout"]
            if (
                FlowSpend.objects.filter(
                    asset=self.account.asset,
                    environment=self.account.environment,
                    txid=txid,
                    vout=vout,
                )
                .exclude(withdrawal=withdrawal)
                .exists()
            ):
                continue
            source = f"{self.account.asset}:{self.account.environment}:{txid}:{vout}"
            amount = units(coin["amount"], self.account.asset)
            credited = FlowReceipt.objects.filter(
                request__account=self.account,
                source_key=source,
                amount_units=amount,
                status="credited",
            ).exists()
            own_change = (
                coin.get("address") in change_addresses
                and FlowWithdrawal.objects.filter(
                    account=self.account, txid=txid, status="submitted"
                ).exists()
            )
            if not (credited or own_change):
                continue
            total += amount
            selected.append(
                {
                    "txid": txid,
                    "vout": vout,
                    "amount": display(amount, self.account.asset),
                }
            )
            change = total - target
            if change == 0 or change >= 546:
                break
            if len(selected) >= 100:
                raise PaymentError(
                    _(
                        "Too many inputs. Consolidate your external wallet before continuing."
                    )
                )
        change = total - target
        if change < 0 or 0 < change < 546:
            raise PaymentError(
                _("Not enough confirmed inputs for the amount, fee and usable change.")
            )
        outputs = {
            withdrawal.destination: display(withdrawal.amount_units, self.account.asset)
        }
        if change:
            outputs[sorted(change_addresses)[0]] = display(change, self.account.asset)
        inputs = [{"txid": item["txid"], "vout": item["vout"]} for item in selected]
        raw = self.rpc("createrawtransaction", inputs, outputs)
        if (
            not isinstance(raw, str)
            or not re.fullmatch(r"[a-fA-F0-9]{2,1000000}", raw)
            or len(raw) % 2
        ):
            raise ProviderUnavailable(
                _("The node did not return a valid unsigned transaction.")
            )
        return {
            "asset": self.account.asset,
            "environment": self.account.environment,
            "chain": self.config["chain"],
            "withdrawal": str(withdrawal.pk),
            "inputs": selected,
            "outputs": outputs,
            "fee": display(withdrawal.fee_limit_units, self.account.asset),
            "unsigned_transaction": raw,
            "notice": "Sign only in your external wallet. Verify outputs, network and fee. Never provide private keys to BCH Flow.",
        }
