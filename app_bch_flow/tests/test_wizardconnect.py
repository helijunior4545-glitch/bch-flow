"""Real test-key BCH signatures, provider fixtures, no mainnet broadcast."""
import json
import os
from pathlib import Path
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.utils import timezone
from cryptography.fernet import Fernet
from embit import transaction as tx
from app_bch_flow.tests import test_nownodes_payments as fixtures
from app_bch_flow.financial import service
from app_bch_flow.identity.sessions import COOKIE_NAME, create_session
from app_bch_flow.identity.services import register_identity
from app_bch_flow.models import BCHMembership
from app_bch_flow.wallets.wizardconnect.adapter import request_authorization
from app_bch_flow.financial.amounts import PaymentError


@override_settings(DEBUG=False, SESSION_COOKIE_SECURE=True,CSRF_COOKIE_SECURE=True,FLOW_PAYMENTS_ALLOW_LIVE=True,FLOW_CREDENTIAL_ENCRYPTION_KEYS=[Fernet.generate_key().decode()])
class WizardConnectTests(TestCase):
    password='test-wallet-password-12345'
    rpc=fixtures.NOWNodesPaymentsTests.rpc
    connect=fixtures.NOWNodesPaymentsTests.connect
    fund=fixtures.NOWNodesPaymentsTests.fund

    def setUp(self):
        fixtures.NOWNodesPaymentsTests.setUp(self)
        self.connect('BCH')
        self.fund()
        token,_session=create_session(self.owner)
        self.client.cookies[COOKIE_NAME]=token
        from app_bch_flow.wallet.v53b_cashaddr import compressed_pubkey_to_cashaddr
        self.destination=compressed_pubkey_to_cashaddr(self.master.derive('m/1/7').key.get_public_key().sec())
        self.withdrawal=service.create_withdrawal(self.owner,self.account,self.destination,40000,1000,'wizard-withdraw-001')
        self.url=reverse('bch_flow:wizardconnect_sign_request',args=[self.org.pk,self.withdrawal.pk])

    def approve(self):
        service.approve_withdrawal(self.owner,self.withdrawal,self.password)
        self.withdrawal.refresh_from_db()

    def test_authorization_required_and_csrf_enforced(self):
        self.assertEqual(self.client.get(self.url).status_code,405)
        self.assertEqual(Client(enforce_csrf_checks=True).post(self.url,secure=True).status_code,403)
        self.assertEqual(self.client.post(self.url,secure=True).status_code,400)
        self.assertFalse(self.sent)

    def test_request_and_signed_transaction_use_existing_bch_validation(self):
        self.approve()
        response=self.client.post(self.url,secure=True)
        self.assertEqual(response.status_code,200,response.content)
        plan=response.json()
        self.assertFalse(plan['broadcast'])
        self.assertEqual(plan['inputPaths'],[[0,'receive',0]])
        self.assertEqual(plan['publicKeys'],[self.private.derive([0,0]).key.get_public_key().sec().hex()])
        self.assertEqual(plan['sourceOutputs'][0]['valueSatoshis'],'100000')
        self.assertNotIn('test-api-key-not-real',response.content.decode())
        self.assertFalse(self.sent)
        from app_bch_flow.wallet.selfcustody.offline_bch_signer import sign_unsigned_p2pkh,hash160
        key=self.private.derive([0,0]).key
        unsigned=tx.Transaction.parse(bytes.fromhex(plan['transaction']))
        raw=sign_unsigned_p2pkh(unsigned_hex=plan['transaction'],prevouts=[{'txid':self.funding_id,'vout':0,'amount_sats':100000,'pubkey_hash':hash160(key.get_public_key().sec()).hex()}],private_keys=[key.secret],expected_outputs=[{'amount_sats':out.value,'script_pubkey':out.script_pubkey.data.hex()} for out in unsigned.vout],max_fee_sats=1000)
        self.withdrawal.refresh_from_db()
        service.submit_withdrawal(self.owner,self.withdrawal,raw)
        self.assertEqual(len(self.sent),1)
        # Optional public-only fixture for the official SDK interoperability test.
        if os.environ.get('FLOW_WIZARD_FIXTURE_PATH'):
            Path(os.environ['FLOW_WIZARD_FIXTURE_PATH']).write_text(json.dumps({'plan':plan,'signed':raw,'paths':{'0':self.private.derive([0]).to_public().to_base58(),'1':self.private.derive([1]).to_public().to_base58(),'7':self.private.derive([7]).to_public().to_base58()}}))

    def test_foreign_organization_and_read_only_members_cannot_request_signatures(self):
        other=register_identity('foreign@test.invalid','another-test-password-123')
        token,_session=create_session(other)
        self.client.cookies[COOKIE_NAME]=token
        self.assertEqual(self.client.post(self.url,secure=True).status_code,404)
        BCHMembership.objects.create(identity=other,organization=self.org,role='viewer')
        self.assertEqual(self.client.post(self.url,secure=True).status_code,403)
        self.assertFalse(self.sent)

    def test_expired_approval_and_wrong_asset_fail_closed(self):
        self.approve()
        self.withdrawal.approved_until=timezone.now()
        self.withdrawal.save(update_fields=['approved_until'])
        self.assertEqual(self.client.post(self.url,secure=True).status_code,400)
        self.withdrawal.approved_until=timezone.now()+__import__('datetime').timedelta(minutes=3)
        self.withdrawal.save(update_fields=['approved_until'])
        self.account.asset='BTC'
        self.account.save(update_fields=['asset'])
        self.assertEqual(self.client.post(self.url,secure=True).status_code,400)
        self.assertFalse(self.sent)

    def test_tampered_source_script_is_refused_without_broadcast(self):
        self.approve()
        service.prepare_signing(self.owner,self.withdrawal)
        self.withdrawal.refresh_from_db()
        self.withdrawal.signing_payload['inputs'][0]['script_pubkey']='00'
        self.withdrawal.save(update_fields=['signing_payload'])
        self.assertEqual(self.client.post(self.url,secure=True).status_code,400)
        self.assertFalse(self.sent)

    def test_repeated_request_preserves_reserved_package(self):
        self.approve()
        first=self.client.post(self.url,secure=True).json()
        second=self.client.post(self.url,secure=True).json()
        self.assertEqual(first,second)
        self.withdrawal.refresh_from_db()
        self.assertEqual(self.withdrawal.status,'approved')
        self.assertFalse(self.sent)

    @override_settings(DEBUG=False,FLOW_WIZARDCONNECT_RELAYS=['ws://127.0.0.1:18762','https://example.invalid','wss://user:test@relay.example','wss://relay.riften.net:443'])
    def test_production_relays_exclude_insecure_urls_and_credentials(self):
        from app_bch_flow.wallets.wizardconnect.protocol import relay_urls
        self.assertEqual(relay_urls(),['wss://relay.riften.net:443'])

    @override_settings(DEBUG=True,FLOW_WIZARDCONNECT_RELAYS=['ws://127.0.0.1:18762','ws://example.invalid:8080'])
    def test_plain_websocket_allowed_only_for_local_debug_tests(self):
        from app_bch_flow.wallets.wizardconnect.protocol import relay_urls
        self.assertEqual(relay_urls(),['ws://127.0.0.1:18762'])
