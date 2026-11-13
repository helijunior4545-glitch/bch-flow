"""V5.6 regression guards for real existing state machine and settlement policy.
No DB or network. These tests cannot certify end-to-end financial readiness.
"""
from dataclasses import FrozenInstanceError
from django.test import SimpleTestCase
from app_bch_flow.payments.state_machine import ALLOWED, transition
from app_bch_flow.blockchain.v45_settlement_policy import SettlementPolicyAssessment
from app_bch_flow import v56_guard_inventory

class V56FinancialGuards(SimpleTestCase):
    def test_01_created_cannot_jump_to_confirmed(self):
        with self.assertRaises(ValueError): transition('created','confirmed')

    def test_02_detected_cannot_jump_to_confirmed(self):
        with self.assertRaises(ValueError): transition('detected','confirmed')

    def test_03_unknown_state_cannot_confirm(self):
        with self.assertRaises(ValueError): transition('unknown','confirmed')

    def test_04_expired_cannot_reactivate(self):
        with self.assertRaises(ValueError): transition('expired','confirming')

    def test_05_cancelled_cannot_reactivate(self):
        with self.assertRaises(ValueError): transition('cancelled','awaiting_payment')

    def test_06_legal_transition_is_not_settlement(self):
        self.assertEqual(transition('confirming','confirmed'),'confirmed')
        # This proves a lifecycle transition exists, NOT that it is safe to persist.
        self.assertIn('confirmed',ALLOWED['confirming'])

    def test_07_assessment_defaults_to_no_settlement(self):
        a=SettlementPolicyAssessment('test','manual_review_ready',(),1,1)
        self.assertFalse(a.settlement_authorized)

    def test_08_assessment_is_immutable(self):
        a=SettlementPolicyAssessment('test','blocked',(),0,0)
        with self.assertRaises(FrozenInstanceError): a.settlement_authorized=True

    def test_09_source_inventory_does_not_authorize(self):
        report=v56_guard_inventory.inspect()
        self.assertFalse(report['settlement_authorized'])
        self.assertFalse(report['database_access'])
        self.assertEqual(next(c['status'] for c in report['checks'] if c['id']=='settlement_release'),'BLOCKED')

    def test_10_expected_source_modules_present(self):
        report=v56_guard_inventory.inspect()
        self.assertTrue(all(c['status']=='PRESENT' for c in report['checks'] if c['id'] in ('machine','finance','policy','chain','reservation','reconciliation','evidence','workspace')))
