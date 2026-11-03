import ast
from pathlib import Path
from unittest import TestCase
class V1SourceContracts(TestCase):
    root=Path(__file__).resolve().parents[2]
    def test_sources_parse(self):
        for path in (self.root/'models').glob('*.py'):
            ast.parse(path.read_text(encoding='utf-8'))
    def test_no_host_user_model(self):
        for path in (self.root/'models').glob('*.py'):
            content=path.read_text(encoding='utf-8')
            self.assertFalse(
            any(host_auth_reference(node) for node in ast.walk(ast.parse(content))),
            'Standalone identity must not reference host AUTH_USER_MODEL',
        )
    def test_fail_closed_payments(self):
        self.assertIn('PaymentUnavailable',(self.root/'payments'/'service.py').read_text())


def host_auth_reference(node):
    if isinstance(node, ast.Name) and node.id == 'AUTH_USER_MODEL':
        return True
    if isinstance(node, ast.Attribute) and node.attr == 'AUTH_USER_MODEL':
        return True
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        return any(alias.name == 'AUTH_USER_MODEL' for alias in node.names)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in ('getattr', 'setattr', 'hasattr', 'delattr'):
        return len(node.args) >= 2 and isinstance(node.args[1], ast.Constant) and node.args[1].value == 'AUTH_USER_MODEL'
    if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Constant) and node.slice.value == 'AUTH_USER_MODEL':
        return True
    return False
