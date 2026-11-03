"""V2.7 read-only wiring regression tests; no network, database or credentials."""
from unittest.mock import patch
from django.test import SimpleTestCase
from app_bch_flow.blockchain.engine_v25.contracts import Result
from app_bch_flow.views import wallet_v24

class WalletEvidenceV27Tests(SimpleTestCase):
    def test_engine_entrypoint_is_used(self):
        self.assertIs(wallet_v24.observe_configured.__module__.startswith('app_bch_flow.blockchain.engine_v25'), True)

    def test_template_renders_disabled_without_legacy_reader(self):
        from django.template.loader import get_template
        from django.template import Context
        template = get_template('app_bch_flow/wallet_v41/evidence_v24.html')
        self.assertIsNotNone(template)
        from pathlib import Path
        from django.conf import settings
        source = Path(settings.BASE_DIR, 'app_bch_flow/templates/app_bch_flow/wallet_v41/evidence_v24.html').read_text()
        self.assertIn('engine_result.state', source)
        self.assertNotIn('observation.utxos', source)
        self.assertIn('NOT VERIFIED', source)

    def test_disabled_contract_does_not_authorize_payment(self):
        result = Result('DISABLED', 'bitcoincash:example', 'mainnet', (), (), ())
        self.assertFalse(result.verified_payment)
        self.assertFalse(result.settlement_authorized)
