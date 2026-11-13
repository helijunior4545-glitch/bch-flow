# BCH Flow — carteira própria, fase 1

## O que foi instalado

- Política independente e conservadora de evidências para Mainnet.
- Comando Django `python manage.py bch_selfcustody_readiness` (somente leitura).
- Testes unitários de negação por padrão.

## O que NÃO foi instalado

- Gerador de seed/chaves, cofre criptográfico ou carteira móvel/desktop.
- Derivação HD, construção/assinatura BCH ou conexão real com CoreNode.
- Migrações, alterações de rotas, banco, configuração ou transações.

## Antes de receber/enviar dinheiro real

1. Escolher biblioteca BCH auditada e padrões interoperáveis de derivação.
2. Implementar cofre local e backup/recuperação com proteção contra perda de fundos.
3. Provar propriedade e exclusividade dos endereços por organização/cobrança.
4. Corrigir endereços de troco, taxas, reservas e recuperação de UTXOs.
5. Integrar assinatura local e broadcast no Chipnet com nó real.
6. Testar confirmação, reorg, timeout, repetição e concorrência.
7. Auditoria independente e ativação gradual em Mainnet.

IMPORTANTE: o módulo de barreiras NÃO está conectado às rotas financeiras
existentes. Não deve ser tratado como proteção efetiva dessas rotas.
Não configure `FLOW_PAYMENTS_ALLOW_LIVE=True` com base nesta instalação.
