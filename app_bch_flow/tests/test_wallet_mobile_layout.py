"""Wallet first paint and responsive drawer checks; all data is disposable."""
import json
import os
from pathlib import Path
import subprocess
from unittest import skipUnless
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test import TestCase, override_settings
from django.urls import reverse
from app_bch_flow.identity.services import register_identity, create_organization
from app_bch_flow.identity.sessions import create_session, COOKIE_NAME


class WalletLayoutFixture:
    def setUp(self):
        self.owner=register_identity('mobile-wallet@fixture.invalid','mobile-wallet-password-123')
        self.org=create_organization(self.owner,'Mobile financial organization with a long name','mobile-wallet-layout')
        self.token,_session=create_session(self.owner)
        self.client.cookies[COOKIE_NAME]=self.token
        self.path=reverse('bch_flow:financial_home',args=[self.org.pk])


class WalletInitialLayoutTests(WalletLayoutFixture,TestCase):
    def test_environment_and_signing_slot_are_already_in_the_final_dock(self):
        response=self.client.get(self.path+'?asset=BTC&environment=sandbox')
        self.assertEqual(response.status_code,200)
        self.assertContains(response,'data-bfr-environment-dock',count=1)
        self.assertContains(response,'data-financial-environment',count=1)
        self.assertContains(response,'class="bfr-wizard-standby"',count=1)
        self.assertNotContains(response,'class="premium-controls"')
        self.assertNotContains(response,'signing-env-row-v24.js')
        self.assertContains(response,'id="bfr-eu-sidebar"',count=1)
        self.assertContains(response,'class="bfr-eu-close"',count=1)

    def test_live_bch_connector_is_rendered_once_in_the_dock(self):
        response=self.client.get(self.path+'?asset=BCH&environment=live')
        self.assertEqual(response.status_code,200)
        self.assertContains(response,'data-wizardconnect ',count=1)
        self.assertNotContains(response,'class="bfr-wizard-standby"')
        html=response.content.decode()
        self.assertLess(html.index('data-bfr-environment-dock'),html.index('data-wizardconnect '))
        self.assertLess(html.index('data-wizardconnect '),html.index('id="operations"'))


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS')=='1','Enable Chromium with FLOW_BROWSER_TESTS=1.')
@override_settings(DEBUG=True,MEDIA_URL='/media/',FLOW_PAYMENTS_SANDBOX_ENABLED=True)
class WalletMobileBrowserTests(WalletLayoutFixture,StaticLiveServerTestCase):
    def test_responsive_drawer_initial_render_and_currency_navigation(self):
        data={'base':self.live_server_url,'path':self.path,'cookie':COOKIE_NAME,'token':self.token}
        result=subprocess.run(['node',str(Path(__file__).with_name('wallet-mobile-layout.cjs'))],
            env={**os.environ,'WALLET_LAYOUT_INPUT':json.dumps(data)},capture_output=True,text=True,timeout=100)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout.strip())
