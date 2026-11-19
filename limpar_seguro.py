import os
import shutil

IGNORAR_PASTAS = {".git", ".venv", "venv", "env", "node_modules", "__pycache__"}
EXTENSOES_PROTEGIDAS = {".py", ".html", ".css", ".js", ".ts", ".md", ".txt", ".po", ".mo"}
EXTENSOES_BACKUP = {".bak", ".backup", ".old", ".tmp", ".orig"}
PADROES_PASTAS_BACKUP = ["backup", "autofill_v4", "cross_crypto_v5"]
ARQUIVOS_LIXO_EXATOS = {"= [", "py.py"}

def varrer_e_limpar(modo_teste=True):
    raiz = os.getcwd()
    itens_encontrados = 0

    for pasta_atual, subpastas, arquivos in os.walk(raiz, topdown=False):
        partes_caminho = set(pasta_atual.split(os.sep))
        if partes_caminho.intersection(IGNORAR_PASTAS):
            continue

        for arq in arquivos:
            nome_lower = arq.lower()
            _, extensao = os.path.splitext(nome_lower)
            eh_lixo_exato = arq in ARQUIVOS_LIXO_EXATOS
            eh_extensao_backup = extensao in EXTENSOES_BACKUP
            eh_oculto_backup = nome_lower.startswith(".") and "backup" in nome_lower and extensao not in EXTENSOES_PROTEGIDAS

            if eh_lixo_exato or eh_extensao_backup or eh_oculto_backup:
                caminho_arq = os.path.join(pasta_atual, arq)
                itens_encontrados += 1
                if modo_teste:
                    print(f"[SIMULAÇÃO - ARQUIVO] {caminho_arq}")
                else:
                    try:
                        os.remove(caminho_arq)
                        print(f"[APAGADO - ARQUIVO] {caminho_arq}")
                    except Exception as e:
                        print(f"[ERRO] {caminho_arq}: {e}")

        for sub in subpastas:
            if sub in IGNORAR_PASTAS:
                continue
            nome_lower = sub.lower()
            if any(padrao in nome_lower for padrao in PADROES_PASTAS_BACKUP):
                caminho_pasta = os.path.join(pasta_atual, sub)
                if os.path.exists(caminho_pasta):
                    itens_encontrados += 1
                    if modo_teste:
                        print(f"[SIMULAÇÃO - PASTA]   {caminho_pasta}")
                    else:
                        try:
                            shutil.rmtree(caminho_pasta)
                            print(f"[APAGADA - PASTA]   {caminho_pasta}")
                        except Exception as e:
                            print(f"[ERRO] {caminho_pasta}: {e}")

    return itens_encontrados

if __name__ == "__main__":
    print("=== MODO SIMULAÇÃO (NADA SERÁ APAGADO AINDA) ===")
    total = varrer_e_limpar(modo_teste=True)

    if total == 0:
        print("\nNenhum arquivo ou pasta de backup encontrado!")
    else:
        print(f"\nTotal encontrado: {total} itens.")
        resp = input("Confira a lista acima. Deseja APAGAR todos eles? (s/n): ")
        if resp.lower() == "s":
            print("\n=== EXECUTANDO LIMPEZA ===")
            varrer_e_limpar(modo_teste=False)
            print("\nLimpeza concluída com segurança!")
        else:
            print("Operação cancelada.")
