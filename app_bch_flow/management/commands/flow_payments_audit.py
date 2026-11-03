from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from app_bch_flow.models import FlowAccount


class Command(BaseCommand):
    help = "Compare account snapshots to immutable balanced journal movements; freeze divergences."

    def handle(self, *args, **options):
        failures = 0
        for identifier in FlowAccount.objects.values_list("pk", flat=True).iterator():
            with transaction.atomic():
                account = FlowAccount.objects.select_for_update().get(pk=identifier)
                computed = {"available": 0, "reserved": 0, "external": 0}
                for movement in account.journal.all().iterator():
                    computed[movement.debit] += movement.amount_units
                    computed[movement.credit] -= movement.amount_units
                if (
                    computed["available"] != account.available_units
                    or computed["reserved"] != account.reserved_units
                ):
                    account.frozen = True
                    account.save(update_fields=["frozen"])
                    failures += 1
        if failures:
            raise CommandError(
                f"{failures} account(s) diverged and were frozen. Investigate; do not edit journal history."
            )
        self.stdout.write(
            self.style.SUCCESS("Account snapshots match the immutable journal.")
        )
