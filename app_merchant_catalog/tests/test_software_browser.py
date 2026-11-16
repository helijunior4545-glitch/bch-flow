"""Optional real Chromium checks: FLOW_BROWSER_TESTS=1 python manage.py test ..."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from unittest import skipUnless
from unittest.mock import patch
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.db import transaction
from django.test import override_settings
from app_bch_flow.identity.sessions import COOKIE_NAME
from app_bch_flow.financial import service
from app_bch_flow.models import FlowRequest
from app_merchant_catalog.models import SoftwareOrder
from . import test_software as fixtures


@skipUnless(os.environ.get('FLOW_BROWSER_TESTS') == '1', 'Set FLOW_BROWSER_TESTS=1 for Chromium UI checks.')
@override_settings(DEBUG=True, LANGUAGE_CODE='en', PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class SoftwareBrowserTests(StaticLiveServerTestCase):
    login = fixtures.SoftwareTests.login
    url = fixtures.SoftwareTests.url

    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.override = override_settings(MEDIA_ROOT=self.media.name)
        self.override.enable()
        self.addCleanup(self.override.disable)
        fixtures.SoftwareTests.setUp(self)

    def browser(self, data):
        env={**os.environ, 'SOFTWARE_BROWSER_INPUT':json.dumps(data)}
        result=subprocess.run(['node', str(Path(__file__).with_name('software-browser.cjs'))], env=env,
            text=True, capture_output=True, timeout=60)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout.strip())

    def test_purchase_confirmation_and_download_on_desktop_and_mobile(self):
        artifacts=Path(os.environ.get('FLOW_BROWSER_ARTIFACTS','/tmp/bch-software-browser'))
        artifacts.mkdir(parents=True,exist_ok=True)
        result=artifacts/'purchase-session.json'
        with patch('app_bch_flow.financial.service.prepare_request'):
            self.browser({'phase':'purchase','base':self.live_server_url,
                'product':self.url('software_product',self.product.pk),'artifacts':str(artifacts),
                'result':str(result),'cookieName':COOKIE_NAME})
        order=SoftwareOrder.objects.get()
        with transaction.atomic():
            charge=FlowRequest.objects.select_for_update().get(pk=order.payment_id)
            service._receipt(service._locked(charge.account_id),charge,'browser:fixture',1000,2,2)
        session=json.loads(result.read_text())
        self.browser({'phase':'download','base':self.live_server_url,'order':session['url'],
            'cookie':session['cookie'],'artifacts':str(artifacts)})
        result.unlink()
        self.assertEqual(hashlib.sha256((artifacts/'software-download.zip').read_bytes()).hexdigest(),self.release.sha256)
