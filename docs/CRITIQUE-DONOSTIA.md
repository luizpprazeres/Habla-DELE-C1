# Critique — La Concha + motivação no Meu dia

Data: 2026-10-06. Escopo: `public/app.js` (diff de `renderToday`/`journeySummaryHTML`), `public/style.css` (diff), `public/motivation.js`, `public/donostia.svg`, `docs/MOTIVACAO.md`, `tests/motivation.test.js`. Revisão somente leitura; o único arquivo escrito foi este.

> Atenção: `public/motivation.js` e `tests/motivation.test.js` mudaram durante a revisão (10:39). Este relatório avalia a versão atual: `review-reescrever` só para escrita e rascunho com ações por tipo.

## Checks executados

| Check | Resultado |
|---|---|
| `node ~/.claude/skills/impeccable/bin/cli.js detect --json --fast public` | exit 2; 3 achados `side-tab` em `style.css:173`, `:174`, `:288`, todos **anteriores** a este ajuste (citação do feedback, frase melhorada, `.celebration-note`). Nada no diff. |
| `npm test` | 63/63 passam |
| `npm run check` | OK (inclui `public/motivation.js`) |
| Script node: `motivationFor` × {escrita, fala, leitura, escuta, null, desconhecido} × {novo, revisão, rascunho} × 10 dias × 2 perfis | determinística no mesmo dia; Luiz ≠ Alana em todos os conjuntos; rascunho > revisão > habilidade; revisão oral não recebe “Reescrever” |
| Contraste WCAG calculado | legenda `--sub` sobre `#050505` 9.43:1; ação `--sub` sobre `--accent-soft` 8.09:1; linha `--ink` sobre `--accent-soft` 15.52:1; laranja sobre `#050505` 7.81:1. Silhuetas do SVG: Igueldo/Urgull sobre o céu 1.10–1.14:1, Santa Clara sobre o mar 1.04:1 |
| `grep` por viagem/mudança/Espanha/aprovação/nota/elogio em `motivation.js` e no diff | nenhuma ocorrência |
| Leitura de `artifacts/donostia-local-mobile.png` (390×844, captura já existente) | cidade legível pelo arco, ilha, poste e balaustrada; CTA “Continuar diagnóstico” termina ≈ 640 px |
| Avaliação LLM independente (subagente isolado, sem ver o detector; leu código, captura, rodou testes e cálculo de dobra aritmético) | 29/40; achados integrados abaixo |

**Não executado:** nenhum teste em navegador, nenhuma interação física, nenhuma medição em 320 px ou com `prefers-reduced-motion` ativo. As afirmações sobre 320 px abaixo são estimativas pelo CSS.

## Veredito

Nenhum P1. O ajuste é contido: SVG próprio de 4,4 KB, sem animação nem dependência; seleção pura, estável e escapada; nenhuma escrita em storage e nenhuma mudança no engine de tarefas ou rascunhos (o diff em `app.js` só lê `hasDraft`). O humor em geral é sobre a língua e passa no crivo da Alana. Restam dois P2 de hierarquia/dobra e três frases de autoajuda que destoam. Nielsen (avaliação independente): **29/40**. Slop: não.

## P2

1. **A frase motivacional pesa mais que o status real e, na revisão, parece diagnóstico.** `.nudge-line` (`style.css:212`) usa `--ink` 600/16px, enquanto o status factual (“N de 4 habilidades…”, “Seu rascunho está pronto…”) fica em `.sub`. No painel de revisão (`app.js:53`) não há linha factual nenhuma: logo abaixo do título da tentativa aparece “Um erro que aparece duas vezes já merece nome próprio.” (`motivation.js:19`), que soa como se o sistema tivesse detectado repetição. Não detectou.
   **Correção:** rebaixar `.nudge-line` (peso 500 e/ou `--sub`, ou micro-rótulo “Dica de linguagem”) abaixo do status; no painel de revisão, recolocar uma linha factual curta (“Correção disponível.”); reescrever `review-nome` sem afirmar repetição (“Dar nome a um erro ajuda a reconhecê-lo na próxima resposta.”). *Detector e LLM: só a avaliação LLM pegou isso.*

2. **CTA provavelmente abaixo da dobra em telas baixas (estimativa, não medido).** Em 390×844 a captura mostra o botão em ≈ 640 px, ok. Em 375×667 a soma (topo 129 + 20 + figura com legenda ≈ 107 + saudação/prazo ≈ 65 + painel de diagnóstico ≈ 350) dá ≈ 670 px contra ≈ 606 úteis acima da nav; em 320×568, ≈ 770 px. O ajuste acrescentou ≈ 140 px acima do botão e removeu só o eyebrow. `docs/MOTIVACAO.md:21` cobre apenas 390×844.
   **Correção:** `@media (max-height:700px)` escondendo o `figcaption` e reduzindo a faixa (≈ 56 px, `object-fit:cover`), ou nudge após o botão nessas alturas. Confirmar em 375×667 e 320×568 no browser.

## P3 (úteis)

- **Autoajuda genérica, fora do critério 1 do próprio doc** (“frase sobre a língua”): `general-foco` “Um foco pequeno rende mais que uma intenção enorme.”, `draft-pequeno` “Retomar fica mais leve…”, `draft-existe` “Um rascunho tem uma vantagem: você já começou.” Como rascunho tem prioridade no Meu dia, essas aparecem com frequência. Trocar por frases no estilo de `general-registro`/`writing-paragrafo`. *As duas avaliações apontaram.*
- **Escuta na revisão:** `review-evidencia` diz “localize a frase que decidia a questão” e “Uma boa pista costuma estar uma frase depois…”. A correção objetiva já mostra a evidência em `<blockquote>` (`app.js:222`), então não há transcrição a vasculhar, mas o verbo “localize” e a imagem de “frase seguinte” são de leitura. Para escuta: “Abra a correção, leia a evidência citada e anote a expressão que decidia.”
- **Dicas de prova apresentadas como regra:** “Um ‘pero’… A resposta costuma estar logo depois” (`reading-pero`) e “uma frase depois” (`review-evidencia`) são heurísticas sem base declarada; nos distratores do DELE C1 o contraste também engana. Suavizar para “confira o que vem depois” sem prometer onde está a resposta.
- **Imprecisões que a Alana notaria:** “Ninguém diz ‘discrepo’…” (`listening-habria`) exagera; “discrepo” é recurso legítimo no oral C1. Melhor: “Na conversa, ‘discrepo’ costuma virar ‘bueno, habría que verlo’.” `listening-enunciado` (“O enunciado é a única parte do áudio que dá para ler duas vezes”) mistura enunciado e áudio, e no DELE o áudio toca duas vezes. `listening-ya-ya` pede atenção ao tom, mas o áudio é sintético (`app.js:62`) e o gerador exige itens resolvíveis sem prosódia sutil; prefira pistas lexicais.
- **Ação morta:** `review-reescrever.action.speaking` (`motivation.js:17`) ficou inalcançável depois de `kinds:['writing']`; remover. O fallback de `actionFor` (`:76`) cai em ação de escrita para tipo desconhecido; usar uma ação neutra.
- **Variante ignorada:** “Em carta formal…” pode aparecer em mediação ou artigo; “nomeie a atitude do autor” numa leitura de léxico. Passar a variante do `payload` resolveria.
- **SVG:** silhuetas a 1,04–1,14:1 contra céu e mar; o reconhecimento depende de traços laranja a 0,32–0,5 de opacidade (≈ 0,5 px em 320 px) e da balaustrada (6,78:1). Ao sol, sobram grade e poste. Clarear os montes (≈ `#2a2724`) e subir os traços para 0,6–0,7. A estilização é adequada; não se pede precisão fotográfica.
- **Leitor de tela:** o alt longo é lido antes do h1 e repete a legenda. Encurtar (“Ilustração estilizada da baía de La Concha”) ou `alt=""` com a legenda visível.
- **Data repetida:** “Recife, 14/11” repete o chip “DELE C1 · 14 nov” a menos de 200 px.
- **Detector:** os 3 `side-tab` (`style.css:173`, `:174`, `:288`) são anteriores e marcam citação/evidência no feedback; aceitáveis semanticamente, fora deste escopo.
- **Doc desatualizado:** `docs/MOTIVACAO.md:48` ainda diz “rascunho 3, revisão 4”. Agora os conjuntos são filtrados por tipo (rascunho 3/2, revisão 3/2).

## Conferido sem problema

- **Seleção por contexto:**
  - Escrita, fala, leitura e escuta novas recebem o conjunto do próprio tipo; sem tipo, o geral.
  - Rascunho tem prioridade sobre revisão, e revisão sobre tarefa nova.
  - Rascunho de leitura, escuta ou fala não recebe “parágrafo/reescreva”.
  - Revisão oral não recebe “Reescrever” e manda anotar expressão ou dar nome ao ponto.
  - Escuta antes da resposta não pede evidência no áudio nem na transcrição.
- **Sem promessas:** nenhuma promessa, nota, elogio, streak, viagem ou mudança para a Espanha em `motivation.js` ou no diff.
- **Estabilidade:** a mensagem é a mesma em re-renders do mesmo dia (America/Maceio). Luiz e Alana recebem frases diferentes. Data inválida cai no dia 0 sem erro.
- **Escape:** linha, ação e id passam por `esc()`.
- **Movimento:** nenhuma animação nova; a regra global de `prefers-reduced-motion` continua.
- **Contraste do texto:** todo o texto novo fica ≥ 8:1.

## Para o root

Ordem sugerida:

1. P2-1: rebaixar o nudge, restaurar a linha factual da revisão, reescrever `review-nome`.
2. Trocar as três frases de autoajuda e as imprecisões de escuta.
3. P2-2: regra `max-height` e verificação em 375×667 e 320×568 via Cua.
4. Contraste do SVG e alt curto.


## Resolução central após a crítica

P2-1: a motivação foi colocada depois do botão principal, com peso tipográfico menor; a revisão ganhou “Correção disponível para retomar”. A frase de repetição de erros foi substituída por orientação sem alegar um diagnóstico.

P2-2: o layout de telas baixas ganhou paisagem de 44 px, título e espaçamentos compactos; a legenda San Sebastián permanece visível. Navegação real em Chrome confirmou botão principal alcançável por hit test, sem overflow horizontal e sem alvos visíveis abaixo de 44 px em 320×568, 375×667, 390×844, 430×932 e 1280×844 no diagnóstico de Alana. Em 320×568, o rascunho de Luiz com título longo também passou (botão até 466 px). Não é uma garantia para títulos de comprimento arbitrário.

A revisão central também substituiu as frases genéricas de foco e rascunho, retirou generalizações sobre conectores/distratores, adaptou a revisão de escuta à evidência citada e removeu dependência de prosódia sutil do áudio sintético. Dicas de carta formal, mediação e atitude ficaram condicionadas à tarefa. O fallback de revisão é neutro, a ação oral inalcançável foi removida, e o alt foi encurtado. Silhuetas e contornos da paisagem ficaram mais visíveis. O score acima e os cálculos de contraste descrevem o snapshot anterior; não foram recalculados.

A navegação entre Meu dia e Evolução manteve a mensagem do dia. Abrir o rascunho de Luiz conservou o texto; a paisagem não entrou na tela de produção. 63 testes e sintaxe passaram após os ajustes. Sem teste físico/Safari.
