"""PostgreSQL payment lifecycle with real test-key signatures and mocked node I/O.
No external requests, real credentials, or mainnet funds are used.
"""

from unittest.mock import patch
from django.test import TestCase, override_settings
from django.urls import reverse
from cryptography.fernet import Fernet
from embit import bip32, networks, transaction as tx, script
from app_bch_flow.financial import service
from app_bch_flow.financial.nodes import (
    connect_nownodes,
    blockchain_node,
    allocate_address,
    public_wallet,
    derive_address,
)
from app_bch_flow.financial.nownodes import NOWNodes
from app_bch_flow.financial.amounts import PaymentError, ProviderUnavailable, display
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME
from app_bch_flow.models import (
    FlowAccount,
    FlowDerivedAddress,
    FlowJournal,
)


@override_settings(
    DEBUG=False,
    SESSION_COOKIE_SECURE=True,
    CSRF_COOKIE_SECURE=True,
    FLOW_PAYMENTS_ALLOW_LIVE=True,
    FLOW_CREDENTIAL_ENCRYPTION_KEYS=[Fernet.generate_key().decode()],
)
class NOWNodesPaymentsTests(TestCase):
    password = "test-wallet-password-12345"

    def setUp(self):
        self.owner = register_identity("node-owner@test.invalid", self.password)
        self.org = create_organization(self.owner, "Public wallet", "public-wallet")
        self.master = bip32.HDKey.from_seed(bytes(range(64)))  # TEST ONLY
        self.chain = {}
        self.sent = []
        self.rpc_patch = patch.object(
            NOWNodes, "chain_rpc", autospec=True, side_effect=self.rpc
        )
        self.rpc_patch.start()
        self.addCleanup(self.rpc_patch.stop)

    def rpc(self, node, method, *params):
        if method == "getblockchaininfo":
            return {
                "chain": "main",
                "initialblockdownload": False,
                "bestblockhash": "a" * 64,
            }
        if method == "getrawtransaction":
            raw = self.chain.get(params[0])
            if raw is None:
                raise ProviderUnavailable("fixture: transaction not found")
            return {"txid": params[0], "hex": raw, "confirmations": 3}
        if method == "decoderawtransaction":
            parsed = tx.Transaction.parse(bytes.fromhex(params[0]))
            return {
                "txid": parsed.txid().hex(),
                "vin": [{"txid": c.txid.hex(), "vout": c.vout} for c in parsed.vin],
                "vout": [],
            }
        if method == "testmempoolaccept":
            raw = params[0][0]
            return [
                {
                    "allowed": True,
                    "txid": tx.Transaction.parse(bytes.fromhex(raw)).txid().hex(),
                }
            ]
        if method == "sendrawtransaction":
            parsed = tx.Transaction.parse(bytes.fromhex(params[0]))
            self.sent.append(parsed.txid().hex())
            self.chain[parsed.txid().hex()] = params[0]
            return parsed.txid().hex()
        raise AssertionError(method)

    def connect(self, asset="BTC"):
        self.private = self.master.derive(
            "m/84h/0h/0h" if asset == "BTC" else "m/44h/145h/0h"
        )
        xpub = self.private.to_public().to_base58()
        connection = connect_nownodes(
            self.owner,
            self.org.pk,
            asset,
            "test-api-key-not-real",
            xpub,
            3,
            self.password,
        )
        self.account = FlowAccount.objects.get(
            organization=self.org, asset=asset, environment="live"
        )
        self.node = blockchain_node(self.account)
        return connection

    def fund(self):
        charge = service.create_request(
            self.owner, self.account, 100000, "Test invoice", "test-receive-key-001"
        )
        charge = service.prepare_request(charge)
        raw = tx.Transaction(
            vin=[tx.TransactionInput(bytes.fromhex("1" * 64), 0)],
            vout=[
                tx.TransactionOutput(100000, self.node.address_script(charge.address))
            ],
        )
        self.funding_id = raw.txid().hex()
        self.chain[self.funding_id] = raw.serialize().hex()
        service.reconcile_request(charge, self.funding_id)
        service.reconcile_request(charge, self.funding_id)
        self.coin = {
            "txid": self.funding_id,
            "vout": 0,
            "amount": display(100000, self.account.asset),
            "address": charge.address,
        }
        self.unspent_patch = patch.object(NOWNodes, "unspent", return_value=[self.coin])
        self.unspent_patch.start()
        self.addCleanup(self.unspent_patch.stop)
        self.charge = charge
        return charge

    def lifecycle(self, asset, timeout=False):
        connection = self.connect(asset)
        self.assertNotIn("test-api-key-not-real", connection.api_ciphertext)
        self.assertEqual(service.provider_config(self.account)["provider"], "nownodes")
        charge = self.fund()
        self.account.refresh_from_db()
        self.assertEqual(self.account.available_units, 100000)
        self.assertEqual(charge.receipts.count(), 1)  # Replay never double-credits.
        destination_key = self.master.derive("m/1/7").key.get_public_key()
        if asset == "BTC":
            destination = script.p2wpkh(destination_key).address(
                networks.NETWORKS["main"]
            )
        else:
            from app_bch_flow.wallet.v53b_cashaddr import compressed_pubkey_to_cashaddr

            destination = compressed_pubkey_to_cashaddr(destination_key.sec())
        withdrawal = service.create_withdrawal(
            self.owner, self.account, destination, 40000, 1000, "test-withdraw-key-001"
        )
        withdrawal = service.prepare_signing(self.owner, withdrawal)
        package = withdrawal.signing_payload
        self.assertNotEqual(package["change_address"], charge.address)
        self.assertTrue(
            FlowDerivedAddress.objects.filter(
                address=package["change_address"], branch=1
            ).exists()
        )
        unsigned = tx.Transaction.parse(bytes.fromhex(package["unsigned_transaction"]))
        key = self.private.derive([0, 0]).key
        if asset == "BTC":
            digest = unsigned.sighash_segwit(
                0, script.p2pkh(key.get_public_key()), 100000
            )
            signature = key.sign(digest)
            self.assertTrue(key.get_public_key().verify(signature, digest))
            unsigned.vin[0].witness = tx.Witness(
                [signature.serialize() + b"\x01", key.get_public_key().sec()]
            )
            raw = unsigned.serialize().hex()
        else:
            from app_bch_flow.wallet.selfcustody.offline_bch_signer import (
                sign_unsigned_p2pkh,
                hash160,
            )

            raw = sign_unsigned_p2pkh(
                unsigned_hex=package["unsigned_transaction"],
                prevouts=[
                    {
                        "txid": self.funding_id,
                        "vout": 0,
                        "amount_sats": 100000,
                        "pubkey_hash": hash160(key.get_public_key().sec()).hex(),
                    }
                ],
                private_keys=[key.secret],
                expected_outputs=[
                    {
                        "amount_sats": output.value,
                        "script_pubkey": output.script_pubkey.data.hex(),
                    }
                    for output in unsigned.vout
                ],
                max_fee_sats=1000,
            )
        service.approve_withdrawal(self.owner, withdrawal, self.password)
        if timeout:
            original_rpc = self.rpc

            def timeout_after_broadcast(node, method, *params):
                result = original_rpc(node, method, *params)
                if method == "sendrawtransaction":
                    raise ProviderUnavailable(
                        "fixture: response lost after node accepted transaction"
                    )
                return result

            self.rpc_patch.stop()
            with patch.object(
                NOWNodes,
                "chain_rpc",
                autospec=True,
                side_effect=timeout_after_broadcast,
            ):
                with self.assertRaises(ProviderUnavailable):
                    service.submit_withdrawal(self.owner, withdrawal, raw)
            self.rpc_patch.start()
            withdrawal.refresh_from_db()
            self.account.refresh_from_db()
            self.assertEqual(withdrawal.status, "unknown")
            self.assertEqual(self.account.reserved_units, 41000)
            with self.assertRaises(PaymentError):
                service.cancel_withdrawal(self.owner, withdrawal)
            withdrawal = service.recover_withdrawal(self.owner, withdrawal)
        else:
            withdrawal = service.submit_withdrawal(self.owner, withdrawal, raw)
        self.account.refresh_from_db()
        self.assertEqual(withdrawal.status, "submitted")
        self.assertEqual(self.sent, [withdrawal.txid])
        self.assertEqual(
            (self.account.available_units, self.account.reserved_units), (59000, 0)
        )
        self.assertEqual(
            FlowJournal.objects.filter(
                account=self.account, key__startswith="submit:"
            ).count(),
            1,
        )
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        response = self.client.get(
            reverse("bch_flow:financial_receipt", args=[self.org.pk, charge.pk]),
            secure=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Payment receipt")
        return withdrawal, raw

    def test_btc_receive_sign_broadcast_and_receipt(self):
        self.lifecycle("BTC")

    def test_bch_receive_sign_broadcast_and_receipt(self):
        self.lifecycle("BCH")

    def test_wallet_cannot_be_shared_and_new_wallet_does_not_replace_it(self):
        original = self.connect()
        other = register_identity("node-other@test.invalid", self.password)
        foreign = create_organization(other, "Other", "other-node-org")
        with self.assertRaisesRegex(PaymentError, "already registered"):
            connect_nownodes(
                other,
                foreign.pk,
                "BTC",
                "test-api-key-not-real",
                self.private.to_public().to_base58(),
                3,
                self.password,
            )
        second = connect_nownodes(
            self.owner,
            self.org.pk,
            "BTC",
            "test-api-key-not-real",
            self.master.derive("m/84h/0h/1h").to_public().to_base58(),
            3,
            self.password,
        )
        original.refresh_from_db()
        self.assertNotEqual(second.pk, original.pk)
        self.assertNotEqual(second.account.pk, original.account.pk)
        self.assertEqual(original.public_key, self.private.to_public().to_base58())

    def test_private_key_and_wrong_network_are_rejected(self):
        with self.assertRaises(PaymentError):
            public_wallet(self.master.derive("m/84h/0h/0h").to_base58())
        with self.assertRaises(PaymentError):
            public_wallet(self.master.to_public().to_base58())
        self.connect()
        with self.assertRaises(PaymentError):
            self.node.validate_address(
                script.p2wpkh(self.master.key.get_public_key()).address(
                    networks.NETWORKS["test"]
                )
            )

    def test_derivation_branches_are_unique_and_indexes_are_checked(self):
        connection = self.connect()
        addresses = [allocate_address(connection, b) for b in [0, 0, 1]]
        self.assertEqual(len(set(addresses)), 3)
        for bad in [-1, True, 2**31]:
            with self.assertRaises(PaymentError):
                derive_address(connection.public_key, "BTC", 0, bad)

    def test_signed_output_tampering_and_excess_fee_are_rejected(self):
        self.connect()
        self.fund()
        destination = derive_address(self.private.to_public().to_base58(), "BTC", 0, 7)
        withdrawal = service.create_withdrawal(
            self.owner, self.account, destination, 40000, 1000, "test-withdraw-key-001"
        )
        withdrawal = service.prepare_signing(self.owner, withdrawal)
        raw = tx.Transaction.parse(
            bytes.fromhex(withdrawal.signing_payload["unsigned_transaction"])
        )
        raw.vout[0].value += 1
        with self.assertRaisesRegex(PaymentError, "Signed outputs"):
            self.node.inspect_signed(withdrawal, raw.serialize().hex())
        self.assertEqual(self.sent, [])

    def test_unconfirmed_receipt_never_creates_printable_success(self):
        self.connect()
        charge = service.prepare_request(
            service.create_request(
                self.owner, self.account, 100000, "Unpaid", "test-receive-key-002"
            )
        )
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        response = self.client.get(
            reverse("bch_flow:financial_receipt", args=[self.org.pk, charge.pk]),
            secure=True,
        )
        self.assertContains(response, "Payment not confirmed")
        self.assertNotContains(response, "<h1>Payment receipt</h1>")

    def test_nownodes_rejects_wrong_chain_and_unsupported_environments(self):
        with patch.object(
            NOWNodes,
            "chain_rpc",
            return_value={"chain": "test", "initialblockdownload": False},
        ):
            with self.assertRaises(ProviderUnavailable):
                self.connect()
        with self.assertRaises(ProviderUnavailable):
            NOWNodes(
                FlowAccount(organization=self.org, asset="BTC", environment="testnet"),
                {},
            )

    def test_nownodes_timeout_recovers_without_duplicate_broadcast(self):
        self.lifecycle("BTC", timeout=True)

    def test_internal_change_is_spendable_without_becoming_a_new_receipt(self):
        withdrawal, raw = self.lifecycle("BTC")
        parsed = tx.Transaction.parse(bytes.fromhex(raw))
        address = withdrawal.signing_payload["change_address"]
        index = next(
            i
            for i, output in enumerate(parsed.vout)
            if output.script_pubkey == self.node.address_script(address)
        )
        self.unspent_patch.stop()
        coin = {
            "txid": withdrawal.txid,
            "vout": index,
            "amount": "0.00059000",
            "address": address,
        }
        with patch.object(NOWNodes, "unspent", return_value=[coin]):
            destination = derive_address(
                self.private.to_public().to_base58(), "BTC", 0, 9
            )
            second = service.create_withdrawal(
                self.owner,
                self.account,
                destination,
                10000,
                1000,
                "test-withdraw-key-002",
            )
            second = service.prepare_signing(self.owner, second)
            self.assertEqual(
                second.signing_payload["inputs"][0]["txid"], withdrawal.txid
            )
            with self.assertRaises(PaymentError):
                service.reconcile_request(self.charge, withdrawal.txid)
        self.assertEqual(self.charge.receipts.count(), 1)

    def test_provider_transport_has_fixed_endpoints_and_header_authentication(self):
        from app_bch_flow.financial.nownodes import HOSTS

        self.rpc_patch.stop()
        # Constructor performs no network I/O; the HTTP boundary is tested here.
        xpub = self.master.derive("m/84h/0h/0h").to_public().to_base58()
        for asset, (endpoint, book) in HOSTS.items():
            node = NOWNodes(
                FlowAccount(organization=self.org, asset=asset, environment="live"),
                {"api_key": "test-key", "public_key": xpub},
            )
            with patch(
                "app_bch_flow.financial.nownodes._read_json",
                return_value={"result": {"chain": "main"}, "error": None},
            ) as transport:
                node.chain_rpc("getblockchaininfo")
                self.assertEqual(transport.call_args.args[0], endpoint)
                self.assertEqual(transport.call_args.kwargs["api_key"], "test-key")
                self.assertEqual(
                    transport.call_args.kwargs["payload"],
                    {
                        "jsonrpc": "2.0",
                        "id": "flow",
                        "method": "getblockchaininfo",
                        "params": [],
                    },
                )
                self.assertNotIn("test-key", endpoint)
            with self.assertRaises(PaymentError):
                node.chain_rpc("getnewaddress")

    def test_unspent_and_history_reject_ambiguous_provider_evidence(self):
        self.connect()
        allocate_address(self.node.connection)
        with patch.object(NOWNodes, "book_get", return_value=[{"txid": "bad"}]):
            with self.assertRaises(ProviderUnavailable):
                self.node.unspent()
        with patch.object(
            NOWNodes,
            "book_get",
            return_value={"address": "other-wallet", "totalPages": 1, "txids": []},
        ):
            with self.assertRaises(ProviderUnavailable):
                self.node.discover()

    def test_request_can_discover_receipts_without_entering_a_txid(self):
        self.connect()
        charge = self.fund()
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        url = reverse("bch_flow:financial_request", args=[self.org.pk, charge.pk])
        with patch(
            "app_bch_flow.financial.worker.sync_crypto", return_value=1
        ) as scanner:
            response = self.client.post(url, {"action": "refresh"}, secure=True)
        self.assertEqual(response.status_code, 302)
        scanner.assert_called_once()
        self.assertEqual(scanner.call_args.args[0].pk, self.account.pk)

    def test_active_home_qr_uses_the_actual_request(self):
        self.connect()
        charge = service.prepare_request(
            service.create_request(
                self.owner,
                self.account,
                100000,
                "Active request",
                "test-receive-key-003",
            )
        )
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        response = self.client.get(
            reverse("bch_flow:financial_home", args=[self.org.pk])
            + "?asset=BTC&environment=live",
            secure=True,
        )
        self.assertContains(response, "premium-qr-active")
        self.assertEqual(response.context["active_request"].pk, charge.pk)
        from django.core import signing

        self.assertEqual(
            signing.loads(
                response.context["active_request"].checkout_token,
                salt="flow-payment-checkout-v1",
            )["request"],
            str(charge.pk),
        )

    def test_external_wallet_spend_is_detected_from_real_previous_output_scripts(self):
        self.connect()
        self.fund()
        from app_bch_flow.financial.worker import sync_crypto

        outgoing = tx.Transaction(
            vin=[tx.TransactionInput(bytes.fromhex(self.funding_id), 0)],
            vout=[
                tx.TransactionOutput(
                    99000,
                    self.node.address_script(
                        derive_address(
                            self.private.to_public().to_base58(), "BTC", 0, 19
                        )
                    ),
                )
            ],
        )
        external_txid = outgoing.txid().hex()
        self.chain[external_txid] = outgoing.serialize().hex()
        address = self.charge.address
        # No provider input-address labels are trusted to identify the spend.
        with patch.object(
            NOWNodes,
            "book_get",
            return_value={
                "address": address,
                "totalPages": 1,
                "txids": [external_txid],
            },
        ):
            with self.assertRaisesRegex(
                PaymentError, "unreconciled external withdrawal"
            ):
                sync_crypto(self.account)
        self.account.refresh_from_db()
        self.assertTrue(self.account.frozen)

    def test_disconnected_btc_public_key_cannot_be_registered_as_bch(self):
        from app_bch_flow.models import FlowNodeConnection

        connection = self.connect()
        connection.api_ciphertext = ""
        connection.save(update_fields=["api_ciphertext"])
        original_id = connection.pk
        with self.assertRaisesRegex(PaymentError, "another asset or organization"):
            connect_nownodes(
                self.owner,
                self.org.pk,
                "BCH",
                "test-api-key-not-real",
                self.private.to_public().to_base58(),
                3,
                self.password,
            )
        self.assertEqual(FlowNodeConnection.objects.get(pk=original_id).asset, "BTC")
        self.assertFalse(
            FlowAccount.objects.filter(organization=self.org, asset="BCH").exists()
        )

    def test_bch_form_reports_wallet_conflict_instead_of_merchant_conflict(self):
        self.connect()
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        response = self.client.post(
            reverse("bch_flow:merchant_integrations", args=[self.org.pk]),
            {
                "action": "node",
                "node-provider": "nownodes",
                "node-asset": "BCH",
                "node-api_key": "test-api-key-not-real",
                "node-public_key": self.private.to_public().to_base58(),
                "node-confirmations": 3,
                "node-password": self.password,
            },
            secure=True,
        )
        self.assertContains(
            response, "public wallet is already registered", status_code=400
        )
        self.assertNotContains(
            response, "This merchant is already linked elsewhere", status_code=400
        )
        self.assertNotContains(response, "test-api-key-not-real", status_code=400)

    def test_node_database_race_uses_wallet_specific_message(self):
        from django.db import IntegrityError

        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        with patch(
            "app_bch_flow.financial.nodes.connect_nownodes",
            side_effect=IntegrityError("fixture conflict"),
        ):
            response = self.client.post(
                reverse("bch_flow:merchant_integrations", args=[self.org.pk]),
                {
                    "action": "node",
                    "node-provider": "nownodes",
                    "node-asset": "BCH",
                    "node-api_key": "test-api-key-not-real",
                    "node-public_key": "public-key-fixture",
                    "node-confirmations": 3,
                    "node-password": self.password,
                },
                secure=True,
            )
        self.assertContains(response, "wallet connection conflicts", status_code=400)
        self.assertNotContains(
            response, "This merchant is already linked elsewhere", status_code=400
        )

    def test_integrations_default_to_bch_and_keep_btc_available(self):
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        response = self.client.get(
            reverse("bch_flow:merchant_integrations", args=[self.org.pk]), secure=True
        )
        self.assertEqual(response.context["node_form"]["asset"].value(), "BCH")
        self.assertContains(response, "Bitcoin Cash (BCH)")
        self.assertContains(response, "Bitcoin (BTC)")

    def test_bch_connection_does_not_replace_existing_btc_wallet(self):
        from app_bch_flow.models import FlowNodeConnection

        btc = self.connect("BTC")
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        bch_xpub = self.master.derive("m/44h/145h/0h").to_public().to_base58()
        response = self.client.post(
            reverse("bch_flow:merchant_integrations", args=[self.org.pk]),
            {
                "action": "node",
                "node-provider": "nownodes",
                "node-asset": "BCH",
                "node-api_key": "test-api-key-not-real",
                "node-public_key": bch_xpub,
                "node-confirmations": 3,
                "node-password": self.password,
            },
            secure=True,
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            FlowNodeConnection.objects.get(pk=btc.pk).public_key, btc.public_key
        )
        self.assertEqual(
            FlowNodeConnection.objects.get(
                organization=self.org, asset="BCH"
            ).public_key,
            bch_xpub,
        )

    def test_second_btc_wallet_form_preserves_original_wallet(self):
        from app_bch_flow.models import FlowNodeConnection

        btc = self.connect("BTC")
        token, _ = create_session(self.owner)
        self.client.cookies[COOKIE_NAME] = token
        response = self.client.post(
            reverse("bch_flow:merchant_integrations", args=[self.org.pk]),
            {
                "action": "node",
                "node-provider": "nownodes",
                "node-asset": "BTC",
                "node-api_key": "test-api-key-not-real",
                "node-public_key": self.master.derive("m/84h/0h/1h")
                .to_public()
                .to_base58(),
                "node-confirmations": 3,
                "node-password": self.password,
            },
            secure=True,
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            FlowNodeConnection.objects.filter(
                organization=self.org, asset="BTC"
            ).count(),
            2,
        )
        self.assertEqual(
            FlowNodeConnection.objects.get(pk=btc.pk).public_key, btc.public_key
        )
        self.assertFalse(
            FlowNodeConnection.objects.filter(
                organization=self.org, asset="BCH"
            ).exists()
        )
