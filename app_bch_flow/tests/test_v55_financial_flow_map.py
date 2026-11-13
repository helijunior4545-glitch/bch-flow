"""Pure unit checks for V5.5 mapper. No database access."""
import unittest
from app_bch_flow import v55_financial_flow_map as m


class V55MapSafety(unittest.TestCase):
    def test_01_no_settlement_authorization(self):
        report = m.audit()
        self.assertFalse(report['settlement_authorized'])
        self.assertFalse(report['database_access'])
        self.assertTrue(report['read_only'])

    def test_02_fail_closed_findings(self):
        report = m.audit()
        self.assertEqual(next(f for f in report['findings'] if f['id'] == 'settlement_release')['status'], 'BLOCKED')

    def test_03_sources_discovered(self):
        report = m.audit()
        self.assertGreater(report['counts']['functions'], 0)

    def test_04_dotted_ast(self):
        import ast
        self.assertEqual(m.dotted(ast.parse('payment.objects.update()').body[0].value.func), 'payment.objects.update')
