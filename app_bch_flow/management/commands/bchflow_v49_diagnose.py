"""Read-only command: bchflow_v49_diagnose TXID [--output /path/report.json]."""
import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v49_real_transaction import inspect_transaction, DiagnosticError

class Command(BaseCommand):
    help = "Read-only mainnet BCH transaction diagnostic via NOWNodes (opt-in)."

    def add_arguments(self, parser):
        parser.add_argument("txid")
        parser.add_argument("--output", default=None, help="Create a JSON report; refuses to overwrite existing files")

    def handle(self, *args, **options):
        try:
            report = inspect_transaction(options["txid"])
            content = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
            if options["output"]:
                path = Path(options["output"]).expanduser()
                path.parent.mkdir(parents=True, exist_ok=True)
                with path.open("x", encoding="utf-8") as stream:
                    stream.write(content)
                self.stdout.write("Report created: " + str(path))
            else:
                self.stdout.write(content)
        except (DiagnosticError, OSError) as exc:
            raise CommandError(str(exc)) from exc
