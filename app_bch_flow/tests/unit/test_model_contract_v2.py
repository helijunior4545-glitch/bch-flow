"""Pure schema contract tests; run with Django settings configured."""
from django.test import SimpleTestCase
from django.apps import apps
from django.db import models

class BCHFlowSchemaV2Tests(SimpleTestCase):
    def test_models_discovered(self):
        expected = {'BCHIdentity', 'BCHSession', 'BCHOrganization', 'BCHMembership', 'BCHPaymentAlias', 'BCHWalletConnection', 'BCHWalletChallenge', 'BCHInvoice', 'BCHPayment', 'BCHTransfer', 'BCHTransaction', 'BCHExchangeRateSnapshot', 'BCHIdempotencyKey', 'BCHMerchant', 'BCHAuditEvent', 'BCHFinancialEvent', 'BCHOutpointReservation'}
        actual = {m.__name__ for m in apps.get_app_config('app_bch_flow').get_models()}
        self.assertEqual(expected, actual)
    def test_no_foreign_keys_to_host_models(self):
        for model in apps.get_app_config('app_bch_flow').get_models():
            for field in model._meta.get_fields():
                if isinstance(field, (models.ForeignKey, models.OneToOneField)):
                    self.assertEqual(field.remote_field.model._meta.app_label, 'app_bch_flow', (model.__name__,field.name))
    def test_payment_has_integrity_constraints(self):
        model = apps.get_model('app_bch_flow','BCHPayment')
        names = {c.name for c in model._meta.constraints}
        self.assertIn('bch_payment_tx_output_pair', names)
        self.assertIn('bchflow_unique_payment_output', names)
    def test_no_private_key_fields(self):
        for model in apps.get_app_config('app_bch_flow').get_models():
            for field in model._meta.local_fields:
                self.assertNotIn('private_key', field.name)
                self.assertNotIn('seed_phrase', field.name)
