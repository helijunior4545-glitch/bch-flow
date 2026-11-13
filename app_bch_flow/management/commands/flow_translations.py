"""Compile committed catalogs and report untranslated BCH Flow messages."""
import ast
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from babel.messages.pofile import read_po
from babel.messages.mofile import write_mo


def source_messages(root):
    messages = set()
    for path in (root / 'templates').rglob('*.html'):
        messages.update(m.group(2) for m in re.finditer(
            r'''{%\s*(?:trans|translate)\s+(['"])(.*?)\1''', path.read_text(), re.S))
    for folder in ('financial', 'forms', 'views', 'identity'):
        for path in (root / folder).rglob('*.py'):
            for node in ast.walk(ast.parse(path.read_text())):
                if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                        and node.func.id in ('_', 'gettext', 'gettext_lazy') and node.args
                        and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str)):
                    messages.add(node.args[0].value)
    return messages


class Command(BaseCommand):
    help = 'Audit BCH Flow catalog coverage; optionally compile .po files without system gettext.'

    def add_arguments(self, parser):
        parser.add_argument('--compile', action='store_true')
        parser.add_argument('--list-missing', action='store_true')

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[2]
        source = source_messages(root)
        self.stdout.write(f'{len(source)} distinct marked source messages (English source).')
        for locale in ('pt_BR', 'es', 'fr', 'de'):
            path = root / 'locale' / locale / 'LC_MESSAGES' / 'django.po'
            with path.open('rb') as stream:
                catalog = read_po(stream, locale=locale)
            if options['compile']:
                with path.with_suffix('.mo').open('wb') as stream:
                    write_mo(stream, catalog)
            translated = {message.id for message in catalog if message.string and not message.fuzzy}
            missing = source - translated
            self.stdout.write(f'{locale}: {len(source & translated)}/{len(source)} translated; {len(missing)} fall back to English.')
            if options['list_missing']:
                for message in sorted(missing):
                    self.stdout.write(f'  {message}')
