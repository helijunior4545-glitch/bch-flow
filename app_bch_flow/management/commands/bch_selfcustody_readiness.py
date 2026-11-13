"""Diagnóstico SOMENTE LEITURA da fase 1 de autocustódia."""
from django.core.management.base import BaseCommand
from app_bch_flow.wallet.selfcustody.readiness import REQUIRED_EVIDENCE, evaluate_live_gate

class Command(BaseCommand):
    help = "Lista barreiras pendentes; não libera pagamentos nem acessa segredos."

    def handle(self, *args, **options):
        # Nunca inferir comprovação a partir de configuração ou existência de código.
        evidence = {name: False for name in REQUIRED_EVIDENCE}
        result = evaluate_live_gate(evidence, network="mainnet", explicitly_enabled=False)
        self.stdout.write("BCH FLOW — AUTOCUSTÓDIA: MAINNET BLOQUEADA")
        for item in result.missing:
            self.stdout.write("[PENDENTE] " + item)
        self.stdout.write("Nenhuma operação financeira foi realizada.")
