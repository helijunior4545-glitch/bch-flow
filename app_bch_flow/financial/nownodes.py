"""NOWNodes mainnet adapter: public derivation, Blockbook discovery, Core RPC broadcast.

Wallet methods are implemented locally over a public-address registry. No hosted
wallet API, seed, or private key is assumed. All spending requires external signing.
"""

import re
from urllib.parse import quote
from embit import script, networks, transaction as bitcoin_tx
from embit.base import EmbitError
from app_bch_flow.models import (
    FlowDerivedAddress,
    FlowNodeConnection,
    FlowReceipt,
    FlowWithdrawal,
    FlowSpend,
)
from .amounts import PaymentError, ProviderUnavailable, units, display
from .providers import CoreNode
from .node_http import read_json as _read_json
from .nodes import allocate_address, public_wallet

HOSTS = {
    "BTC": ("https://btc.nownodes.io", "https://btcbook.nownodes.io"),
    "BCH": ("https://bch.nownodes.io", "https://bchbook.nownodes.io"),
}


class NOWNodes(CoreNode):
    def __init__(self, account, config):
        if account.asset not in HOSTS or account.environment != "live":
            raise ProviderUnavailable(
                "NOWNodes is configured for BTC/BCH mainnet only. Use an explicitly configured testnet node for tests."
            )
        self.account, self.config = account, dict(config)
        self.config["chain"] = "main"
        self.confirmations = config.get("confirmations", 3)
        if type(self.confirmations) is not int or not 1 <= self.confirmations <= 100:
            raise ProviderUnavailable("Invalid confirmation policy.")
        self.api_key = config.get("api_key", "")
        if not self.api_key:
            raise ProviderUnavailable(
                "Configure your NOWNodes API key in Integrations."
            )
        public_wallet(config.get("public_key", ""))
        self.url, self.book = HOSTS[account.asset]

    @property
    def connection(self):
        try:
            return FlowNodeConnection.objects.get(
                pk=self.config.get("connection_id"),
                account__pk=self.account.pk,
                organization_id=self.account.organization_id,
                asset=self.account.asset,
                environment=self.account.environment,
            )
        except FlowNodeConnection.DoesNotExist:
            raise ProviderUnavailable(
                "Save and verify the public wallet connection first."
            ) from None

    def chain_rpc(self, method, *params):
        allowed = {
            "getblockchaininfo",
            "getrawtransaction",
            "decoderawtransaction",
            "testmempoolaccept",
            "sendrawtransaction",
        }
        if method not in allowed:
            raise PaymentError("Unsupported node operation.")
        result = _read_json(
            self.url,
            api_key=self.api_key,
            payload={
                "jsonrpc": "2.0",
                "id": "flow",
                "method": method,
                "params": list(params),
            },
            provider_label="NOWNodes RPC",
        )
        if result.get("error") is not None or "result" not in result:
            raise ProviderUnavailable(
                "NOWNodes did not confirm the operation. Check its status before retrying."
            )
        return result["result"]

    def book_get(self, path, allow_list=False):
        return _read_json(
            self.book + "/api/v2/" + path,
            api_key=self.api_key,
            allow_list=allow_list,
            provider_label="NOWNodes Blockbook",
        )

    def ready(self):
        info = self.chain_rpc("getblockchaininfo")
        if (
            not isinstance(info, dict)
            or info.get("chain") != "main"
            or info.get("initialblockdownload") is not False
        ):
            raise ProviderUnavailable(
                "NOWNodes is not synchronized on the expected mainnet."
            )

    def registry(self):
        return FlowDerivedAddress.objects.filter(connection=self.connection)

    def validate_address(self, address):
        if not isinstance(address, str) or len(address) > 180:
            raise PaymentError("Invalid destination address.")
        if self.account.asset == "BTC":
            try:
                parsed = script.address_to_scriptpubkey(address)
                if parsed.address(networks.NETWORKS["main"]) != address:
                    raise ValueError
                return address
            except Exception:
                raise PaymentError("Use a valid Bitcoin mainnet address.") from None
        self.address_script(address)
        return address

    def address_script(self, address):
        if self.account.asset == "BTC":
            self.validate_address(address)
            return script.address_to_scriptpubkey(address)
        from app_bch_flow.wallet.v53b_cashaddr import (
            _ALPHABET,
            _prefix_expand,
            _polymod,
            _convertbits,
        )

        try:
            if not address.startswith("bitcoincash:") or address != address.lower():
                raise ValueError
            values = [_ALPHABET.index(c) for c in address.split(":")[1]]
            if len(values) != 42 or _polymod(_prefix_expand("bitcoincash") + values):
                raise ValueError
            data = bytes(_convertbits(values[:-8], 5, 8, pad=False))
            if len(data) != 21 or data[0] not in (0, 8):
                raise ValueError
            return script.Script(
                (b"\x76\xa9\x14" + data[1:] + b"\x88\xac")
                if data[0] == 0
                else (b"\xa9\x14" + data[1:] + b"\x87")
            )
        except (ValueError, AttributeError, IndexError):
            raise PaymentError(
                "Use a valid Bitcoin Cash mainnet CashAddr destination."
            ) from None

    def new_address(self):
        self.ready()
        return allocate_address(self.connection, 0)

    def btc_change_address(self, invoice_addresses, destination):
        address = allocate_address(self.connection, 1)
        if address in invoice_addresses or address == destination:
            raise PaymentError("Change must use a dedicated internal address.")
        return address

    def outputs(self, txid):
        if not re.fullmatch("[a-f0-9]{64}", txid or ""):
            raise PaymentError("Invalid TXID.")
        self.ready()
        tx = self.chain_rpc("getrawtransaction", txid, True)
        if (
            not isinstance(tx, dict)
            or tx.get("txid") != txid
            or type(tx.get("confirmations", 0)) is not int
        ):
            raise PaymentError("The transaction does not match the requested TXID.")
        # Require the raw bytes to agree with the provider's decoded identity.
        try:
            data = bytes.fromhex(tx["hex"])
            if len(data) > 1_000_000:
                raise ValueError
            raw = bitcoin_tx.Transaction.parse(data)
            if raw.serialize() != data:
                raise ValueError
            if raw.txid().hex() != txid:
                raise ValueError
        except (EmbitError, KeyError, ValueError, TypeError, IndexError):
            raise PaymentError("Invalid transaction bytes returned by node.") from None
        outputs = []
        from app_bch_flow.wallet.v53b_cashaddr import encode_p2pkh_hash160

        for index, output in enumerate(raw.vout):
            data = output.script_pubkey.data
            address = None
            if self.account.asset == "BTC":
                address = output.script_pubkey.address(networks.NETWORKS["main"])
            elif (
                len(data) == 25
                and data[:3] == b"\x76\xa9\x14"
                and data[-2:] == b"\x88\xac"
            ):
                address = encode_p2pkh_hash160(data[3:23])
            outputs.append(
                {
                    "n": index,
                    "value": display(output.value, self.account.asset),
                    "scriptPubKey": {"hex": data.hex(), "address": address},
                }
            )
        return tx.get("confirmations", 0), outputs

    def unspent(self):
        result = []
        seen = set()
        for address in self.registry().values_list("address", flat=True):
            coins = self.book_get(
                "utxo/" + quote(address, safe="") + "?confirmed=true", allow_list=True
            )
            if not isinstance(coins, list) or len(coins) > 1000:
                raise ProviderUnavailable("UTXO response exceeds safe limits.")
            for coin in coins:
                if not isinstance(coin, dict):
                    raise ProviderUnavailable("Invalid UTXO evidence.")
                txid, vout, value, confirmations = (
                    coin.get("txid"),
                    coin.get("vout"),
                    coin.get("value"),
                    coin.get("confirmations"),
                )
                if (
                    not re.fullmatch("[a-f0-9]{64}", txid or "")
                    or type(vout) is not int
                    or vout < 0
                    or type(confirmations) is not int
                    or not isinstance(value, (int, str))
                    or isinstance(value, bool)
                    or not re.fullmatch(r"[0-9]{1,16}", str(value))
                ):
                    raise ProviderUnavailable("Invalid UTXO evidence.")
                amount = int(value)
                if not 0 < amount <= 2100000000000000 or (txid, vout) in seen:
                    raise ProviderUnavailable("Invalid or duplicate UTXO evidence.")
                seen.add((txid, vout))
                if confirmations >= self.confirmations:
                    result.append(
                        {
                            "txid": txid,
                            "vout": vout,
                            "amount": display(amount, self.account.asset),
                            "address": address,
                        }
                    )
        return result

    def discover(self):
        txids = set()
        addresses = set(self.registry().values_list("address", flat=True))
        events = []
        for address in addresses:
            for page in range(1, 6):
                data = self.book_get(
                    "address/"
                    + quote(address, safe="")
                    + "?details=txids&pageSize=100&page="
                    + str(page)
                )
                if (
                    data.get("address") != address
                    or type(data.get("totalPages")) is not int
                ):
                    raise ProviderUnavailable(
                        "Address history does not match the wallet."
                    )
                if data["totalPages"] > 5:
                    raise ProviderUnavailable(
                        "Address history exceeds the current scan limit; configure an indexed provider before continuing."
                    )
                entries = data.get("txids", [])
                if not isinstance(entries, list) or any(
                    not isinstance(t, str) or not re.fullmatch("[a-f0-9]{64}", t)
                    for t in entries
                ):
                    raise ProviderUnavailable("Invalid transaction history.")
                txids.update(entries)
                if page >= data["totalPages"]:
                    break
        transactions = {}

        def parsed_transaction(txid):
            if txid not in transactions:
                if len(transactions) >= 2000:
                    raise ProviderUnavailable(
                        "Transaction scan exceeds safe limits; configure an incremental indexer."
                    )
                evidence = self.rpc("gettransaction", txid, True)
                transactions[txid] = bitcoin_tx.Transaction.parse(
                    bytes.fromhex(evidence["hex"])
                )
            return transactions[txid]

        wallet_scripts = {self.address_script(address).data for address in addresses}
        for txid in sorted(txids):
            parsed = parsed_transaction(txid)
            if len(parsed.vin) > 100:
                raise ProviderUnavailable("Transaction input scan exceeds safe limits.")
            outgoing = False
            for vin in parsed.vin:
                if vin.txid == bytes(32) and vin.vout == 0xFFFFFFFF:
                    continue  # Coinbase has no previous output.
                previous = parsed_transaction(vin.txid.hex())
                if vin.vout >= len(previous.vout):
                    raise ProviderUnavailable(
                        "Invalid previous output in transaction history."
                    )
                if previous.vout[vin.vout].script_pubkey.data in wallet_scripts:
                    outgoing = True
                    break
            events.append({"txid": txid, "category": "send" if outgoing else "receive"})
        return events

    def rpc(self, method, *params):
        if method == "gettransaction":
            evidence = self.chain_rpc("getrawtransaction", params[0], True)
            try:
                data = bytes.fromhex(evidence["hex"])
                if (
                    len(data) > 1_000_000
                    or type(evidence.get("confirmations", 0)) is not int
                ):
                    raise ValueError
                parsed = bitcoin_tx.Transaction.parse(data)
                if parsed.serialize() != data or parsed.txid().hex() != params[0]:
                    raise ValueError
            except (EmbitError, KeyError, ValueError, TypeError, IndexError):
                raise PaymentError("Transaction recovery identity mismatch.") from None
            evidence["confirmations"] = evidence.get("confirmations", 0)
            return evidence
        if method == "decoderawtransaction":
            parsed = bitcoin_tx.Transaction.parse(bytes.fromhex(params[0]))
            return {
                "txid": parsed.txid().hex(),
                "vin": [{"txid": i.txid.hex(), "vout": i.vout} for i in parsed.vin],
                "vout": [
                    {
                        "n": n,
                        "value": display(o.value, self.account.asset),
                        "scriptPubKey": {
                            "hex": o.script_pubkey.data.hex(),
                            "address": o.script_pubkey.address(
                                networks.NETWORKS["main"]
                            )
                            if self.account.asset == "BTC"
                            else None,
                        },
                    }
                    for n, o in enumerate(parsed.vout)
                ],
            }
        if method == "listunspent":
            return self.unspent()
        if method == "getaddressinfo":
            address = self.registry().filter(address=params[0]).first()
            return {
                "ismine": address is not None,
                "ischange": bool(address and address.branch == 1),
            }
        if method == "listsinceblock":
            info = self.chain_rpc("getblockchaininfo")
            return {
                "transactions": self.discover(),
                "removed": [],
                "lastblock": info["bestblockhash"],
            }
        return self.chain_rpc(method, *params)

    def eligible(self, coin):
        source = f"{self.account.asset}:{self.account.environment}:{coin['txid']}:{coin['vout']}"
        amount = units(coin["amount"], self.account.asset)
        receipt = FlowReceipt.objects.filter(
            request__account=self.account,
            source_key=source,
            amount_units=amount,
            status="credited",
        ).exists()
        if receipt:
            return True
        for withdrawal in FlowWithdrawal.objects.filter(
            account=self.account, txid=coin["txid"], status="submitted"
        ):
            package = withdrawal.signing_payload or {}
            if (
                package.get("change_address") != coin["address"]
                or not self.registry()
                .filter(address=coin["address"], branch=1)
                .exists()
            ):
                continue
            _, outputs = self.outputs(coin["txid"])
            return any(
                o.get("n") == coin["vout"]
                and self.output_address(o) == coin["address"]
                and units(o["value"], self.account.asset)
                == amount
                == units(package["outputs"][coin["address"]], self.account.asset)
                for o in outputs
            )
        return False

    def prepare_unsigned(self, withdrawal):
        self.ready()
        selected, total = [], 0
        target = withdrawal.amount_units + withdrawal.fee_limit_units
        for coin in sorted(self.unspent(), key=lambda c: (c["txid"], c["vout"])):
            if FlowSpend.objects.filter(
                asset=self.account.asset,
                environment=self.account.environment,
                txid=coin["txid"],
                vout=coin["vout"],
            ).exclude(withdrawal=withdrawal).exists() or not self.eligible(coin):
                continue
            selected.append(coin)
            total += units(coin["amount"], self.account.asset)
            if total >= target and (total == target or total - target >= 546):
                break
            if len(selected) >= 100:
                raise PaymentError("Too many inputs; consolidate your external wallet.")
        change = total - target
        if change < 0 or 0 < change < 546 or not selected:
            raise PaymentError(
                "Not enough confirmed inputs for amount, fee and usable change."
            )
        outputs = {
            withdrawal.destination: display(withdrawal.amount_units, self.account.asset)
        }
        change_address = None
        if change:
            change_address = self.btc_change_address(set(), withdrawal.destination)
            outputs[change_address] = display(change, self.account.asset)
        raw = (
            bitcoin_tx.Transaction(
                vin=[
                    bitcoin_tx.TransactionInput(bytes.fromhex(c["txid"]), c["vout"])
                    for c in selected
                ],
                vout=[
                    bitcoin_tx.TransactionOutput(
                        units(v, self.account.asset), self.address_script(a)
                    )
                    for a, v in outputs.items()
                ],
            )
            .serialize()
            .hex()
        )
        for coin in selected:
            derived = self.registry().get(address=coin["address"])
            coin["derivation"] = f"{derived.branch}/{derived.index}"
            coin["script_pubkey"] = self.address_script(coin["address"]).data.hex()
        return {
            "asset": self.account.asset,
            "environment": self.account.environment,
            "chain": "main",
            "provider": "nownodes",
            "withdrawal": str(withdrawal.pk),
            "inputs": selected,
            "outputs": outputs,
            "change_address": change_address,
            "fee": display(withdrawal.fee_limit_units, self.account.asset),
            "unsigned_transaction": raw,
            "notice": "Sign in your external wallet only. Independently verify inputs, outputs, network and fee. No private keys may be sent to BCH Flow.",
        }

    def inspect_signed(self, withdrawal, raw):
        if (
            not isinstance(raw, str)
            or not re.fullmatch("[a-fA-F0-9]{2,200000}", raw)
            or len(raw) % 2
        ):
            raise PaymentError("Invalid signed transaction.")
        self.ready()
        try:
            local = bitcoin_tx.Transaction.parse(bytes.fromhex(raw))
            if local.serialize().hex() != raw.lower():
                raise ValueError
        except Exception:
            raise PaymentError("Malformed transaction bytes.") from None
        decoded = self.rpc("decoderawtransaction", raw)
        if decoded.get("txid") != local.txid().hex():
            raise PaymentError("Signed transaction identity mismatch.")
        package = withdrawal.signing_payload or {}
        if (
            package.get("asset") != self.account.asset
            or package.get("environment") != self.account.environment
            or package.get("withdrawal") != str(withdrawal.pk)
        ):
            raise PaymentError("Missing authorized signing package.")
        inputs = decoded.get("vin", [])
        actual_inputs = {(i.get("txid"), i.get("vout")) for i in inputs}
        planned = {(i["txid"], i["vout"]) for i in package.get("inputs", [])}
        if (
            not 1 <= len(inputs) <= 100
            or len(actual_inputs) != len(inputs)
            or actual_inputs != planned
            or actual_inputs != set(withdrawal.inputs.values_list("txid", "vout"))
        ):
            raise PaymentError("Signed inputs differ from the reserved package.")
        expected_outputs = package.get("outputs", {})
        # Compare byte-level scripts and amounts; do not trust provider address labels.
        expected = sorted(
            (units(value, self.account.asset), self.address_script(address).data)
            for address, value in expected_outputs.items()
        )
        actual = sorted((out.value, out.script_pubkey.data) for out in local.vout)
        if (
            not expected
            or actual != expected
            or expected_outputs.get(withdrawal.destination)
            != display(withdrawal.amount_units, self.account.asset)
        ):
            raise PaymentError(
                "Signed outputs differ from the authorized destination and change."
            )
        change = package.get("change_address")
        if change and (
            change == withdrawal.destination
            or not self.registry().filter(address=change, branch=1).exists()
        ):
            raise PaymentError("Change is not a dedicated wallet-owned address.")
        total = 0
        unspent = {(c["txid"], c["vout"]): c for c in self.unspent()}
        for key in actual_inputs:
            coin = unspent.get(key)
            if not coin or not self.eligible(coin):
                raise PaymentError(
                    "Reserved input is unavailable or does not belong to this account."
                )
            confirmations, outputs = self.outputs(key[0])
            matching = [o for o in outputs if o.get("n") == key[1]]
            if (
                confirmations < self.confirmations
                or len(matching) != 1
                or units(matching[0]["value"], self.account.asset)
                != units(coin["amount"], self.account.asset)
                or matching[0].get("scriptPubKey", {}).get("hex")
                != self.address_script(coin["address"]).data.hex()
            ):
                raise PaymentError(
                    "UTXO does not match authoritative transaction evidence."
                )
            total += units(coin["amount"], self.account.asset)
        fee = total - sum(o.value for o in local.vout)
        if not 0 <= fee <= withdrawal.fee_limit_units:
            raise PaymentError("The fee exceeds the authorization.")
        accepted = self.chain_rpc("testmempoolaccept", [raw])
        if (
            not isinstance(accepted, list)
            or len(accepted) != 1
            or accepted[0].get("allowed") is not True
            or accepted[0].get("txid") != local.txid().hex()
        ):
            raise PaymentError("The node did not accept the signed transaction.")
        return local.txid().hex(), fee, inputs
