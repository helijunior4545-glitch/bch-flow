BCH Flow — Rodada 2 / 120 testes de segurança de evidência financeira.
120 testes: 20 formatos inválidos; 20 outpoints duplicados; 20 sem exclusividade;
20 sem confirmações; 20 endereços/redes alheios; 20 limites de provedor.
Os testes exercitam o motor V3.3 existente; NÃO implementam proteção transacional
de concorrência, unicidade global de atribuição, independência de provedores ou
liquidação. Nenhum estado financeiro é alterado. Todos os 120 testes passaram
isoladamente contra o código V3.3 extraído da auditoria disponibilizada.
Meta de regressão completa: 653 + 120 = 773 testes.
