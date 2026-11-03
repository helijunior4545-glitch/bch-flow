import time
from django.core.management.base import BaseCommand
from app_bch_flow.financial.worker import process_inbox, sync_accounts, poll_pix


class Command(BaseCommand):
    help = "Process signed Mercado Pago notifications and synchronize isolated BTC/BCH wallets."

    def add_arguments(self, parser):
        parser.add_argument("--watch", action="store_true")
        parser.add_argument("--interval", type=int, default=15)

    def handle(self, *args, **options):
        while True:
            done, failed = process_inbox()
            chain_done, chain_failed = sync_accounts()
            pix_done, pix_failed = poll_pix()
            self.stdout.write(
                f"Webhook jobs: {done} complete, {failed} pending/failing. Chain observations: {chain_done}, account failures: {chain_failed}. Pix polls: {pix_done}, failures: {pix_failed}."
            )
            if not options["watch"]:
                if failed or chain_failed or pix_failed:
                    from django.core.management.base import CommandError

                    raise CommandError(
                        "Provider prerequisites or payment verification need attention; no credential values logged."
                    )
                return
            try:
                time.sleep(max(2, min(options["interval"], 60)))
            except KeyboardInterrupt:
                return
