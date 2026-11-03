"""Compare two previously acquired JSON observations, without database access."""
import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v51_corroboration import corroborate, CorroborationError

class Command(BaseCommand):
    help = 'V5.1 offline read-only evidence comparison (NOT settlement verification)'

    def add_arguments(self, parser):
        parser.add_argument('txid')
        parser.add_argument('primary_json')
        parser.add_argument('secondary_json')

    def handle(self, *args, **opts):
        if os.getenv('BCHFLOW_V51_ENABLE_COMPARISON') != '1':
            raise CommandError('v51_comparison_disabled')
        observations = []
        for label in ('primary_json', 'secondary_json'):
            path = Path(opts[label])
            try:
                if not path.is_file() or path.stat().st_size > 512000:
                    raise ValueError('invalid_file_size')
                with path.open('r', encoding='utf-8') as stream:
                    obs = json.load(stream)
                observations.append(obs)
            except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as exc:
                raise CommandError(label + '_invalid') from exc
        try:
            result = corroborate(*observations, expected_txid=opts['txid'])
        except CorroborationError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(json.dumps(result, sort_keys=True, indent=2))
