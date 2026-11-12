#!/usr/bin/env python3
"""BCH Flow: separa configuração de nós BTC/BCH de provedores PIX.
Uso: python py.py --dry-run; python py.py
Somente arquivos locais; nunca transmite transações ou altera o banco.
"""
from __future__ import annotations
import argparse
import ast
import hashlib
import shutil
from datetime import datetime, timezone
from pathlib import Path

OLD_GUARD = 'settings, "FLOW_PAYMENTS_ALLOW_LIVE", True'
NEW_GUARD = 'settings, "FLOW_PAYMENTS_ALLOW_LIVE", False'
OLD_CONFIG = '''    configs = getattr(settings, "FLOW_PAYMENT_PROVIDERS", {})
    config = (
        configs.get(str(account.organization_id), {})
        .get(account.asset, {})
        .get(account.environment)
    )'''
NEW_CONFIG = '''    # BTC/BCH use blockchain nodes, never payment-provider credentials.
    # Configuration is server-owned, scoped by organization, asset and network.
    if account.asset in ("BTC", "BCH"):
        configs = getattr(settings, "FLOW_BLOCKCHAIN_NODES", {})
    else:
        configs = getattr(settings, "FLOW_PAYMENT_PROVIDERS", {})
    config = (
        configs.get(str(account.organization_id), {})
        .get(account.asset, {})
        .get(account.environment)
    )'''
OLD_ISOLATION = '''        configs = getattr(settings, "FLOW_PAYMENT_PROVIDERS", {})
        for organization, assets in configs.items():'''
NEW_ISOLATION = '''        configs = getattr(settings, "FLOW_BLOCKCHAIN_NODES", {})
        for organization, assets in configs.items():'''


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count == 0 and new in source:
        raise RuntimeError(f'{label}: já aplicado; nenhuma alteração realizada')
    if count != 1:
        raise RuntimeError(f'{label}: esperado 1 trecho, encontrados {count}; abortando')
    return source.replace(old, new, 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    target = root / 'app_bch_flow/financial/providers.py'
    if not (root / 'manage.py').is_file() or not target.is_file():
        raise SystemExit('ABORTADO: projeto Django local não encontrado; use --root')
    original = target.read_bytes()
    try:
        source = original.decode('utf-8')
        ast.parse(source)
        modified = source if NEW_GUARD in source and OLD_GUARD not in source else replace_once(source, OLD_GUARD, NEW_GUARD, 'live fail-closed')
        modified = replace_once(modified, OLD_CONFIG, NEW_CONFIG, 'separação BTC/BCH/PIX')
        modified = replace_once(modified, OLD_ISOLATION, NEW_ISOLATION, 'isolamento de nós')
        ast.parse(modified)
    except (UnicodeError, SyntaxError, RuntimeError) as exc:
        raise SystemExit(f'ABORTADO sem alterar arquivos: {exc}')
    print('Projeto:', root)
    print('Arquivo:', target.relative_to(root))
    print('SHA256 antes:', hashlib.sha256(original).hexdigest())
    print('SHA256 depois:', hashlib.sha256(modified.encode()).hexdigest())
    if args.dry_run:
        print('DRY-RUN OK. Nenhum arquivo alterado.')
        return
    backups = root / '_installer_backups' / ('blockchain_pix_split_' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup = backups / 'app_bch_flow/financial/providers.py'
    backup.parent.mkdir(parents=True, exist_ok=False)
    shutil.copy2(target, backup)
    target.write_text(modified, encoding='utf-8')
    print('ALTERADO COM SUCESSO. Backup:', backup)
    print('Próximo passo: configurar FLOW_BLOCKCHAIN_NODES e executar testes antes do deploy.')


if __name__ == '__main__':
    main()
