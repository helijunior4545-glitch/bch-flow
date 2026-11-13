# Estabilidade do CSS e da primeira pintura

Auditoria local da landing, login e cadastro, em Chromium (1366 × 900), com
150 ms de atraso nas respostas dos assets e 500 ms nos scripts. Os arquivos
foram servidos a partir do checkout, sem serviços de pagamento nem credenciais.
Esses resultados não substituem uma medição na instalação publicada.

## Problemas reproduzidos e corrigidos

1. **Reveal iniciado depois da primeira pintura.** O bloco principal já aparecia
   com opacidade 1; após os scripts diferidos, o IntersectionObserver adicionava
   `is-revealed` e a animação o levava de volta a opacidade .35 e translateY(12px)
   durante 450 ms. Agora os blocos que já estão no viewport não repetem a entrada;
   os demais mantêm o efeito ao aparecer durante a rolagem. Sem JavaScript,
   o conteúdo continua visível.
2. **Ícones sem espaço antes da hidratação.** O `<i data-lucide>` tinha largura e
   altura zero e passava a SVG de 14–28 px. Os placeholders agora compartilham
   as dimensões e o alinhamento dos SVGs. Os seletores `:is(svg,i:where([data-lucide]))`
   preservam a especificidade do seletor de tipo original e não afetam outros `<i>`.
3. **CSS de página no corpo.** Carteira, diagnósticos, formulários de organização/
   cobrança e checkout carregavam folhas de layout dentro do conteúdo. O novo
   bloco `content_styles`, após `flow-polish`, antecipa essas folhas para o head
   mantendo sua ordem de cascata. WizardConnect é carregado pelo head dos seus
   consumidores; na carteira, somente quando o widget realmente será renderizado.
4. **Sintaxe inválida na landing.** O começo de `pages/landing.css` continha um
   fragmento remanescente de URL de fonte (`500;600;700&family=...`). O fragmento
   foi removido; não foi introduzida nenhuma fonte externa.

## Resultado observado

| Página | Deslocamentos acumulados antes | Depois |
|---|---:|---:|
| Landing | 0,000373 | 0 |
| Login | 0,000023 | 0 |
| Cadastro | 0,000071 | 0 |

O CLS anterior já era pequeno: a piscada de opacidade/transform não é bem
representada por essa métrica. A gravação dos frames da landing mostrava
`opacity:1 → .35 → 1`; depois da correção permanece `opacity:1`, sem translate
no bloco inicialmente visível. Os ícones já têm espaço no primeiro frame.

As 42 folhas CSS foram analisadas com PostCSS sem erro de sintaxe após a correção.
Os testes de renderização cobrem 12 páginas, ausência de folhas de layout no body,
URLs não duplicadas, ordem da cascata e presença condicional do CSS do widget.

```sh
python manage.py test app_bch_flow.tests.test_css_delivery \
  app_bch_flow.tests.test_v3_invoices app_bch_flow.tests.test_wizardconnect \
  --settings=app_bch_flow.tests.django_settings --keepdb --noinput
```

Usar somente PostgreSQL local/de testes no perfil acima.

## CSS sem uso e arquivos antigos

A cobertura de carregamento inicial da landing não exerceu regras de
`flow-refinement.css` e usou apenas uma pequena parte de `flow-polish.css`.
Essas folhas também atendem autenticação, cadastro e páginas internas. Cobertura
por página não comprova que uma regra possa ser apagada: estados de hover,
modais, mobile, rolagem e outras rotas precisam ser exercitados antes da extração.

Foram encontrados 27 arquivos sem referência direta nos templates/JS/CSS atuais
**dentro de app_bch_flow**, incluindo versões antigas de wallet, landing e tema.
Não foram removidos: é necessário conferir consumidores fora do app, temas e
referências dinâmicas. Eles não foram solicitados nas três páginas medidas, então
sua simples presença no repositório não explica a piscada observada.

A próxima otimização possível é separar regras globais por família de páginas,
com comparação visual de estados e mobile. Esta correção não faz uma limpeza
indiscriminada de seletores nem altera operações financeiras.

## Implantação

Não há migração nova. Publicar templates, JavaScript e CSS juntos e executar
`python manage.py collectstatic --noinput`. Se houver cache de assets no proxy/CDN,
atualizá-lo pelo procedimento normal da instalação.
