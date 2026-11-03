"""BCH Flow V4.0 simulated end-to-end observer: DB test isolation, no external API."""
import os
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from app_bch_flow.models import BCHInvoice, BCHOrganization, BCHPayment, BCHTransaction
from app_bch_flow.blockchain.v33_engine import OutputEvidence
from app_bch_flow.blockchain.v40_payment_observer import observe_invoice_txid, ObservationError

ADDRESS = 'bitcoincash:qzrjshsrha097j5j8v8xxc0lchujc7jtpu3chu7ftd'  # public fixture; no ownership claimed
OTHER = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'  # unrelated fixture
TXID = 'a' * 64
HASH = 'b' * 64

class FakeProvider:
    def __init__(self, outputs):
        self.outputs = tuple(outputs)
        self.calls = []
    def outputs_for_address(self, *, network, address):
        self.calls.append((network, address))
        return self.outputs

class SimulatedPaymentFlowTests(TestCase):
    databases = {'default'}

    @classmethod
    def setUpTestData(cls):
        cls.org = BCHOrganization.objects.using('default').create(name='SIMULATION ONLY', slug='v40-simulated', is_active=True)
        cls.invoice = BCHInvoice.objects.using('default').create(
            organization=cls.org, external_reference='SIMULATED-NO-FUNDS',
            description='Test-only invoice, no blockchain payment', amount_satoshis=10000,
            receiving_cashaddr=ADDRESS, network='mainnet', status='created',
            expires_at=timezone.now() + timedelta(hours=24))

    def output(self, satoshis=10000, confirmations=2, address=ADDRESS, txid=TXID, vout=0, network='mainnet'):
        return OutputEvidence(txid=txid, vout=vout, address=address,
            satoshis=satoshis, network=network, confirmations=confirmations,
            block_hash=HASH if confirmations else '')

    def observe(self, outputs, txid=TXID, threshold=2):
        provider = FakeProvider(outputs)
        with patch.dict(os.environ, {'BCHFLOW_V40_ENABLE_OBSERVATION': '1'}):
            result = observe_invoice_txid(str(self.invoice.pk), txid,
                min_confirmations=threshold, provider=provider)
        self.assertEqual(provider.calls, [('mainnet', ADDRESS)])
        self.invoice.refresh_from_db(using='default')
        self.assertEqual(self.invoice.status, 'created')
        self.assertIsNone(self.invoice.paid_at)
        self.assertEqual(BCHPayment.objects.using('default').count(), 0)
        self.assertEqual(BCHTransaction.objects.using('default').count(), 0)
        return result

    def test_exact_confirmed_amount_remains_unattributed(self):
        r = self.observe([self.output()])
        self.assertEqual(r.status, 'unattributed')
        self.assertEqual((r.observed_satoshis, r.confirmed_satoshis, r.output_count), (10000, 10000, 1))

    def test_partial_payment_is_not_paid(self):
        r = self.observe([self.output(satoshis=4000)])
        self.assertEqual((r.status, r.observed_satoshis, r.confirmed_satoshis), ('unattributed', 4000, 4000))

    def test_unconfirmed_payment_is_not_paid(self):
        r = self.observe([self.output(confirmations=0)])
        self.assertEqual((r.status, r.observed_satoshis, r.confirmed_satoshis), ('unattributed', 10000, 0))

    def test_insufficient_confirmations_is_not_paid(self):
        r = self.observe([self.output(confirmations=1)])
        self.assertEqual((r.status, r.confirmed_satoshis), ('unattributed', 0))

    def test_wrong_txid_is_ignored(self):
        r = self.observe([self.output()], txid='c'*64)
        self.assertEqual((r.observed_satoshis, r.output_count), (0, 0))

    def test_wrong_address_is_ignored(self):
        r = self.observe([self.output(address=OTHER)])
        self.assertEqual((r.observed_satoshis, r.output_count), (0, 0))

    def test_wrong_network_is_ignored(self):
        r = self.observe([self.output(network='chipnet')])
        self.assertEqual((r.observed_satoshis, r.output_count), (0, 0))

    def test_multiple_outputs_same_txid_are_summed_but_not_paid(self):
        r = self.observe([self.output(satoshis=3000, vout=0), self.output(satoshis=7000, vout=1)])
        self.assertEqual((r.observed_satoshis, r.confirmed_satoshis, r.output_count), (10000, 10000, 2))

    def test_other_txid_outputs_are_ignored(self):
        r = self.observe([self.output(satoshis=4000), self.output(satoshis=10000, txid='c'*64, vout=1)])
        self.assertEqual((r.observed_satoshis, r.output_count), (4000, 1))

    def test_duplicate_output_fails_closed(self):
        output = self.output()
        with self.assertRaises(ValueError):
            self.observe([output, output])
        self.invoice.refresh_from_db(using='default')
        self.assertEqual(self.invoice.status, 'created')

    def test_opt_in_required_before_provider_use(self):
        provider = FakeProvider([self.output()])
        with patch.dict(os.environ, {'BCHFLOW_V40_ENABLE_OBSERVATION': '0'}):
            with self.assertRaises(ObservationError):
                observe_invoice_txid(str(self.invoice.pk), TXID, provider=provider)
        self.assertEqual(provider.calls, [])

    def test_chipnet_invoice_rejected(self):
        self.invoice.network = 'chipnet'
        self.invoice.save(update_fields=['network'])
        provider = FakeProvider([self.output()])
        with patch.dict(os.environ, {'BCHFLOW_V40_ENABLE_OBSERVATION': '1'}):
            with self.assertRaises(ObservationError):
                observe_invoice_txid(str(self.invoice.pk), TXID, provider=provider)
        self.assertEqual(provider.calls, [])

    def test_unknown_invoice_rejected(self):
        import uuid
        provider = FakeProvider([self.output()])
        with patch.dict(os.environ, {'BCHFLOW_V40_ENABLE_OBSERVATION': '1'}):
            with self.assertRaises(ObservationError):
                observe_invoice_txid(str(uuid.uuid4()), TXID, provider=provider)
        self.assertEqual(provider.calls, [])
