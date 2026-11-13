#!/usr/bin/env python3
"""BCH Flow RPC settings installer V4.
Run from project root: python /path/to/bchflow_rpc_instalador_v4.txt --dry-run
Then: python /path/to/bchflow_rpc_instalador_v4.txt --apply
Changes ONLY config/settings.py. Does not enable live payments.
"""
import argparse
import hashlib
import os
import shutil
import stat
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

TARGET = Path('config/settings.py')
ANCHOR = 'FLOW_PAYMENT_PROVIDERS = {}'
INSERT = '''# BTC/BCH blockchain RPC config is separate from BRL/PIX payment providers.
# The optional JSON maps organization -> asset -> environment -> RPC metadata.
# Secrets must be referenced using *_env or *_file, not embedded in JSON.
FLOW_BLOCKCHAIN_NODES = {}
_blockchain_nodes_file = env('FLOW_BLOCKCHAIN_NODES_FILE', default='')
if _blockchain_nodes_file:
    with open(_blockchain_nodes_file, encoding='utf-8') as _blockchain_stream:
        FLOW_BLOCKCHAIN_NODES = _json.load(_blockchain_stream)
    if not isinstance(FLOW_BLOCKCHAIN_NODES, dict):
        raise ValueError('FLOW_BLOCKCHAIN_NODES_FILE must contain a JSON object')

'''

def digest(blob):
    return hashlib.sha256(blob).hexdigest()

def abort(message):
    raise SystemExit('ABORTADO sem alterar settings.py: ' + message)

def main():
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--dry-run', action='store_true')
    modes.add_argument('--apply', action='store_true')
    args = parser.parse_args()

    if not TARGET.is_file() or TARGET.is_symlink():
        abort('execute na raiz do projeto; config/settings.py ausente ou symlink')
    before = TARGET.read_bytes()
    try:
        source = before.decode('utf-8')
    except UnicodeDecodeError:
        abort('settings.py nao esta em UTF-8')
    if 'FLOW_BLOCKCHAIN_NODES =' in source or 'FLOW_BLOCKCHAIN_NODES_FILE' in source:
        abort('configuracao RPC ja existe; nenhuma duplicacao permitida')
    if source.count(ANCHOR) != 1:
        abort('ancora FLOW_PAYMENT_PROVIDERS nao encontrada exatamente uma vez')
    if 'import json as _json' not in source:
        abort('import JSON esperado nao encontrado')
    if "FLOW_PAYMENTS_ALLOW_LIVE = env.bool('FLOW_PAYMENTS_ALLOW_LIVE', default=False)" not in source:
        abort('trava de producao esperada nao encontrada')

    newline = '\r\n' if b'\r\n' in before else '\n'
    updated = source.replace(ANCHOR, INSERT.replace('\n', newline) + ANCHOR, 1)
    try:
        compile(updated, str(TARGET), 'exec')
    except SyntaxError as exc:
        abort('erro de sintaxe: ' + str(exc))
    proposed = updated.encode('utf-8')
    print('INSTALADOR: BCH Flow RPC V4 (nao e instalador de isolamento)')
    print('ARQUIVO ALVO:', TARGET)
    print('SHA256 atual:', digest(before))
    print('SHA256 proposto:', digest(proposed))
    print('LIVE: nao sera ativado')
    if args.dry_run:
        print('DRY-RUN OK: nenhuma alteracao realizada')
        return

    backup = TARGET.with_name(TARGET.name + '.backup_rpc_' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    if backup.exists():
        abort('backup ja existe')
    if TARGET.read_bytes() != before:
        abort('settings.py foi alterado durante a verificacao')
    shutil.copy2(TARGET, backup)
    if backup.read_bytes() != before:
        abort('backup nao confere')

    fd, temp = tempfile.mkstemp(prefix='.settings_rpc_', dir=str(TARGET.parent))
    try:
        with os.fdopen(fd, 'wb') as output:
            output.write(proposed)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temp, stat.S_IMODE(TARGET.stat().st_mode))
        if TARGET.read_bytes() != before:
            abort('settings.py foi alterado antes da substituicao')
        os.replace(temp, TARGET)
        if TARGET.read_bytes() != proposed:
            abort('hash final divergente; restaurar manualmente pelo backup: ' + str(backup))
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    print('APLICADO OK')
    print('BACKUP:', backup)
    print('SHA256 final:', digest(TARGET.read_bytes()))
    print('Proximo: python manage.py check')

if __name__ == '__main__':
    main()