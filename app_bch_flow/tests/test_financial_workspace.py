"""Wallet presentation must not weaken financial scoping or settlement evidence."""
import io
import json
import os
from pathlib import Path
import subprocess
from unittest import skipUnless
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test import TestCase, override_settings
from app_bch_flow.tests.test_payment_core import PaymentFixture
from app_bch_flow.financial import service
from app_bch_flow.financial.workspace import workspace_context
from app_bch_flow.models import FlowAccount, FlowReceipt
from django.urls import reverse
from django.utils import timezone
from app_bch_flow.identity.sessions import COOKIE_NAME


class FinancialWorkspaceTests(PaymentFixture):
    def test_page_uses_one_workspace_stylesheet_and_no_legacy_stack(self):
        response=self.client.get(reverse('bch_flow:financial_home',args=[self.org.pk])+'?environment=sandbox')
        self.assertEqual(response.status_code,200)
        self.assertContains(response,'financial-workspace.css')
        self.assertNotContains(response,'financial-rebuild-v11.css')
        self.assertContains(response,'data-chart-reset')
        self.assertContains(response,'data-review-transfer')

    def test_pix_chart_uses_only_credited_receipts_in_selected_account(self):
        account=FlowAccount.objects.create(organization=self.org,asset='BRL',environment='sandbox')
        charge=service.create_request(self.owner,account,1000,'Pix','workspace-pix-request')
        FlowReceipt.objects.create(request=charge,source_key='pix:credited',amount_units=1000,status='credited',credited_at=timezone.now())
        FlowReceipt.objects.create(request=charge,source_key='pix:observed',amount_units=9000,status='observed')
        context=workspace_context(self.org.pk,'sandbox',account)
        self.assertEqual(sum(row['value'] for row in context['pix_chart']),10)
        self.assertEqual(workspace_context(self.foreign.pk,'sandbox',None)['pix_chart'],[])

    def test_live_pix_does_not_offer_send_action(self):
        response=self.client.get(reverse('bch_flow:financial_home',args=[self.org.pk])+'?asset=BRL&environment=live')
        self.assertNotContains(response,'data-open-dialog="send-dialog"')
        self.assertContains(response,'Pix payouts require')

    def test_readonly_role_cannot_open_financial_forms(self):
        from app_bch_flow.models import BCHMembership
        BCHMembership.objects.filter(organization=self.org,identity=self.owner).update(role='viewer')
        response=self.client.get(reverse('bch_flow:financial_home',args=[self.org.pk])+'?environment=sandbox')
        self.assertNotContains(response,'data-open-dialog="receive-dialog"')
        self.assertNotContains(response,'data-open-dialog="send-dialog"')


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS')=='1','Enable FLOW_BROWSER_TESTS for Chromium checks.')
@override_settings(FLOW_PAYMENTS_SANDBOX_ENABLED=True, PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class FinancialWorkspaceBrowserTests(StaticLiveServerTestCase):
    def setUp(self):
        PaymentFixture.setUp(self)

    def test_chart_interaction_dialog_review_and_mobile_navigation(self):
        data={'base':self.live_server_url,'url':reverse('bch_flow:financial_home',args=[self.org.pk])+'?environment=sandbox',
            'cookie':self.client.cookies[COOKIE_NAME].value,'cookieName':COOKIE_NAME,
            'artifacts':os.environ.get('FLOW_BROWSER_ARTIFACTS','/tmp/bch-wallet-browser')}
        result=subprocess.run(['node',str(Path(__file__).with_name('financial-workspace-browser.cjs'))],
            env={**os.environ,'WALLET_BROWSER_INPUT':json.dumps(data)},capture_output=True,text=True,timeout=90)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout)
