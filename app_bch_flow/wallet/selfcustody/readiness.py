"""Barreiras conservadoras para habilitar operações financeiras reais.

Este módulo NÃO cria, armazena ou assina chaves. Nunca use o resultado
como substituto de testes de integração com nó BCH e hardware/dispositivo.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Mapping

REQUIRED_EVIDENCE = (
    "client_key_generation_audited",
    "client_seed_backup_restore_tested",
    "client_bch_signer_interoperability_tested",
    "wallet_address_ownership_verified",
    "unique_invoice_address_enforced",
    "dedicated_change_address_enforced",
    "chain_utxo_reconciliation_tested",
    "chipnet_real_receive_send_confirmed",
    "reorg_and_double_spend_recovery_tested",
    "independent_security_review_passed",
)

@dataclass(frozen=True)
class GateResult:
    allowed: bool
    missing: tuple[str, ...]
    reason: str


def evaluate_live_gate(evidence: Mapping[str, object], *, network: str,
                       explicitly_enabled: bool = False) -> GateResult:
    """Fail-closed: somente evidência booleana True, nunca valores truthy."""
    missing = tuple(name for name in REQUIRED_EVIDENCE if evidence.get(name) is not True)
    if network != "mainnet":
        return GateResult(False, missing, "Esta barreira avalia exclusivamente mainnet.")
    if not explicitly_enabled:
        return GateResult(False, missing, "Ativação explícita de mainnet ausente.")
    if missing:
        return GateResult(False, missing, "Evidências obrigatórias não verificadas.")
    return GateResult(True, (), "Pré-requisitos declarados; ainda requer auditoria operacional.")


def assert_live_gate(evidence: Mapping[str, object], *, network: str,
                     explicitly_enabled: bool = False) -> None:
    result = evaluate_live_gate(evidence, network=network,
                                explicitly_enabled=explicitly_enabled)
    if not result.allowed:
        raise RuntimeError(result.reason + " Pendências: " + ", ".join(result.missing))
