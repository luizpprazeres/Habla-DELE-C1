# Crítica final: Habla DELE C1 v0.3.0 (jornada a dois)

Data: 06/10/2026. Alvo: `public/` (markup, CSS e JS), mais `src/journey.js` e as rotas da jornada em `src/worker.js`.

**Versão avaliada.** `public/app.js` e `public/revision-draft.js` de 10:15, `public/style.css` de 10:13, `src/journey.js` de 10:07 e `src/worker.js` de 10:02. O root alterou o fluxo do histórico durante a revisão. Os números de linha abaixo valem para essa versão.

## Escopo e método

- **Avaliação A (LLM, independente).** Leitura de código e das capturas `artifacts/journey-local-mobile.png` e `artifacts/journey-local-progress.png`. A leu uma versão de `app.js` anterior às 10:15. Os achados dela foram reconferidos na versão atual.
- **Avaliação B (determinística, independente).** Detector `node ~/.claude/skills/impeccable/bin/cli.js detect --json --fast public`, mais conferência manual de contraste, tamanhos, motion e foco.
- **Revisão funcional (síntese).** Leitura de `app.js`, `revision-draft.js`, `journey.js` e `worker.js`. `npm test`: 56 de 56 testes passando.
- **Links oficiais.** Conferidos por requisição HTTP pública.
- **Não fiz:** não naveguei, não usei navegador, CDP nem injeção, não testei em aparelho físico, teclado móvel, Safari ou microfone. Não toquei em código, banco ou publicação. A inspeção real em Chrome (320, 390, 430 e 1280) é do root.

## Design Health Score

| # | Heurística | Nota | Problema-chave |
|---|---|---|---|
| 1 | Visibilidade do status | 3 | Busy com rótulo e `aria-busy`, skeleton, toasts. Faltam previsão de tempo na correção por IA e sinal de jornada desatualizada (`app.js:80-81`). |
| 2 | Sistema × mundo real | 3 | Português claro. Vazam "chamadas de IA", "banda estimada x/3" e "Aquecimento/C1". |
| 3 | Controle e liberdade | 3 | Voltar, pausar, rascunho e confirmações existem. Não dá para cancelar envio longo. Trocar de perfil no meio da tarefa sai dela sem aviso. |
| 4 | Consistência | 2 | "Triagem inicial" × "Diagnóstico inicial"; "Corrigir agora" × "Tentar correção novamente"; rótulo do botão do histórico não se atualiza depois da correção (P2-1). |
| 5 | Prevenção de erros | 3 | Validação antes do envio, id idempotente, autosave. O textarea continua editável durante "Salvando e corrigindo…". |
| 6 | Reconhecer em vez de lembrar | 3 | Melhorou com `revisionDraft`, que traz texto e prioridades. O objetivo da semana só é descrito na Evolução. |
| 7 | Flexibilidade e eficiência | 2 | Não há atalho para "a próxima tarefa" no Meu dia (P1-1), nem envio por teclado. |
| 8 | Estética e minimalismo | 2 | Meu dia com countdown, banner, jornada de cerca de 600 px e só então o treino. Slogans de landing page em todas as páginas. |
| 9 | Recuperação de erros | 3 | Trabalho sempre preservado, retry religado. Mensagens genéricas falam de "resposta no aparelho" em erros que não envolvem resposta (`app.js:22-23`). |
| 10 | Ajuda e documentação | 2 | Boas notas inline. Não explica o que conta como reescrita nem o que é "banda". |
| **Total** | | **26/40** | **Aceitável.** Base sólida; o Meu dia e os vínculos de reescrita pedem ajuste. |

**Carga cognitiva: 5 de 8 falhas no Meu dia e em Praticar** (foco único, agrupamento, hierarquia, mais de 4 escolhas, memória de trabalho). Na tela da tarefa, onde o estudo acontece: 1 de 8. O Meu dia tem mais de 10 alvos interativos antes do primeiro treino.

## Anti-padrões (AI slop)

**Avaliação do LLM.** Eu acreditaria que é de IA, mas de uma IA contida.

- **O que livra:** paleta disciplinada e pedida no briefing (#050505 e laranja), nenhum glow, glass ou gradiente em texto, motion quase nulo, a torre em traço fino e as colinas de La Concha em CSS.
- **O que denuncia:**
  - A fórmula eyebrow + h1 + slogan em todas as páginas ("Seu espanhol, em movimento", "Evidências, não promessas").
  - Layout de hero metric: countdown laranja de 48–64 px e os cartões "Respostas registradas / Habilidades praticadas".
  - Parede de cartões iguais em Praticar.
  - Seta "→" em quase todo CTA.
  - Faixas laterais de 2–3 px.

**Detector determinístico.** Exit 2, com **3 achados, todos `side-tab` em `public/style.css`** e todos **falsos positivos**:

| Linha | Seletor | Por que é falso positivo |
|---|---|---|
| 173 | `.feedback .priority>p[lang=es]:last-child` | É um marcador tipográfico da frase melhorada, não um cartão. |
| 174 | `.feedback blockquote` | Citação real. O modo DOM isenta `blockquote`; só a regex disparou. |
| 274 | `.celebration-note` | Artefato: 2 px sem raio. A janela de ±3 linhas pegou o `border-radius` de outro seletor. |

O detector **não pegou** dois casos: `.notice.action-error{box-shadow:inset 3px 0 0}` (`style.css:109`), que é o mesmo padrão feito com box-shadow, e a faixa no topo de `.feedback` (`style.css:166`). O LLM sinalizou ambos.

**Limites de cobertura do detector.**
- `index.html` tem 16 linhas. A interface real é montada em template strings de `app.js`, que o detector não renderiza.
- No modo jsdom, `/style.css` (caminho absoluto) não carrega e o erro é engolido.
- `.svg` fica fora do escopo.
- Conclusão: o "limpo" vale só para o esqueleto estático. O CSS foi varrido sozinho por regex, sem resolver `var()`.

**Conferência manual (B).**
- Todo texto passa AA. O pior caso em uso é `--muted` sobre `surface-2`, com 5,2:1. Laranja sobre preto dá 7,8:1, e preto sobre laranja também.
- **Verdadeiros:**
  - Contorno `--line-strong` dos botões secundários com 1,65–1,76:1 (WCAG 1.4.11 pede 3:1).
  - Navegação com `clamp(12px,3.75vw,15px)`, que fica abaixo de 14 px em 320–360 px.
  - Sublinhado do link da igreja (#3d3d3d), com cerca de 1,9:1.
- Alvos de 44 px ou mais, `prefers-reduced-motion` e `forced-colors` tratados, `outline:none` sempre com substituto.

## Impressão geral

A tela da tarefa é boa ferramenta de estudo no celular. A jornada é honestamente cooperativa: sem XP, streak, ranking ou alegação de nível. O maior problema não é estético. **No Meu dia, a jornada ocupa o lugar do treino.** Na captura de 390 px, "Seu próximo treino" só aparece no rodapé, depois do cartão da jornada inteiro, e mesmo assim como acordeão fechado. A maior oportunidade é um único painel "próxima tarefa" no topo, com a jornada compacta abaixo.

## O que funciona

1. **Tela da tarefa feita para o celular.**
   - Textarea alto, em 18 px.
   - A navegação some ao digitar e o toast fica acima do teclado (`--kb`).
   - Rascunho com fallback em memória e aviso honesto "Rascunho guardado só nesta aba" (`app.js:9-12,20`).
   - "Enviar áudio" agora é `<button>` com `<input type=file hidden>`, acessível por teclado.
2. **Jornada cooperativa e honesta.**
   - Os marcos registram prática ("Registra prática, não nível", `journey.js:14`). A Evolução avisa que não indicam prontidão.
   - As três mensagens são fixas, adultas e sem infantilizar (`journey.js:20-24`).
   - A celebração é idempotente no banco.
   - O erro da jornada não bloqueia o treino (`app.js:86`).
3. **Robustez de estado.**
   - Troca de perfil transacional: busca primeiro, troca depois (`app.js:266-273`).
   - `journeySeq` descarta respostas atrasadas.
   - `holdIfBusy` bloqueia controles repintados durante uma operação.
   - O retry de correção é religado a cada repintura (`showFeedbackResult` → `bindFeedback`).

## Verificação pedida: histórico → nova tentativa de escrita

**Situação no início da revisão:** `[data-again]` fazia só `store.remove(draft)` + `openTask`, sem `parentAttemptId`. Era um P2 confirmado: a reescrita feita pelo histórico não contava como `first-revision` nem para o objetivo da semana.

**Situação às 10:15 (corrigido pelo root):**
- `showAttempt` usa `revisionDraft(a)` (`public/revision-draft.js`).
- Para escrita com correção, a nova tentativa sai com `parentAttemptId=a.id`, o texto original no campo, `rewriteIssues` das prioridades, relógio zerado e sem áudio. Para fala com `followUp`, sai a continuação de diálogo.
- O botão passa a dizer "Reescrever com estes ajustes".
- O servidor valida o pai (`worker.js:162`) e `journey.js:72-79` conta a revisão quando o texto muda.
- `tests/revision.test.js` cobre os três casos.

**Ainda restam dois vínculos perdidos (P2-1 e P2-2 abaixo).**

## Problemas prioritários

### [P1-1] Meu dia esconde o treino atrás da jornada
- **O quê:** a ordem é hero → banner de diagnóstico → jornada → "Seu próximo treino", e esse último é só um `<details>` fechado (`app.js:47-51`). A classe `.next-task` existe (`style.css:205-215,333`), mas não é usada em `app.js`. O "Seu próximo passo" da jornada é texto sem ação. Depois do diagnóstico, o único botão laranja do Meu dia vira "Ver evolução", que leva para fora do treino.
- **Por quê:** contraria "uma tarefa por vez" e o uso de 10–15 min. Luiz rola cerca de 1,5 tela e abre um acordeão para começar.
- **Correção:**
  - Painel `.next-task` logo abaixo do h1: tarefa pendente (diagnóstico, rascunho em andamento ou revisão vencida, nesta ordem), minutos e CTA laranja "Continuar/Começar".
  - Jornada depois, compacta em 2–3 linhas: objetivo, estado de cada um e "Ver marcos".
  - Countdown rebaixado para uma linha.
- **Comando:** `/layout`, depois `/distill`.

### [P2-1] Histórico: "Corrigir agora" seguido de "Fazer nova tentativa" perde o pai
- **Cenário:**
  1. Alana abre pelo histórico uma escrita com correção pendente.
  2. Toca "Corrigir agora" e o feedback aparece em `#history-feedback`.
  3. O botão de baixo continua "Fazer nova tentativa", e o handler usa o objeto `a` capturado na renderização, com `feedback=null` (`app.js:236-238`).
  4. `revisionDraft(a)` devolve `null`, então o app apaga o rascunho e abre a tarefa sem `parentAttemptId` e sem o texto.
  5. A reescrita não conta.
- **Correção:** em `bindFeedback`, quando `root.id==='history-feedback'`, chamar `showAttempt(id)` depois de `reloadData()`. Alternativa: no handler de `[data-again]`, usar `const fresh=state.data.attempts.find(x=>x.id===a.id)||a` antes de `revisionDraft`. O mesmo vale para `[data-revisited]`, que não aparece porque `review_at` só existe depois da correção.
- **Teste:** dado um attempt pendente que recebe feedback, o clique seguinte gera rascunho com `parentAttemptId`.

### [P2-2] Na tela da tarefa, editar e reenviar depois do feedback não vincula
- **Cenário:**
  1. Luiz envia uma escrita e recebe a correção abaixo do formulário.
  2. O textarea continua com o texto e editável.
  3. Ele sobe, ajusta e toca "Salvar e receber feedback", sem passar por "Reescrever com estes ajustes ↑".
  4. `submit` havia zerado `draft.parentAttemptId` (`app.js:210`), então a tentativa vai órfã e não conta como reescrita, embora seja exatamente uma.
- **Correção (só escrita):** depois do envio com `result.feedback`, gravar `draft.parentAttemptId=result.id` e `draft.rewriteIssues` com as prioridades. O servidor já exige que o pai tenha correção, e `has_changed` impede contar reenvio idêntico. Não aplicar à fala, porque lá o vínculo significa responder ao `followUp`. Alternativa: deixar o textarea `readonly` depois do envio, até o toque em "Reescrever".

### [P2-3] Contagens lado a lado convidam à comparação
- **O quê:** a captura mostra "Luiz 5 tarefas · 3 reescritas ou diálogos" acima de "Alana 4 tarefas · 2 reescritas ou diálogos" (`app.js:98`). A Evolução mostra "X de 5 registrados" para cada um (`app.js:114`).
- **Por quê:** não é ranking, mas é placar. O contrato diz "sem comparar quem fez mais".
- **Correção:**
  - Para o parceiro, só "Parte feita / Em andamento".
  - Para si, contagem limitada à meta: `min(n,2)` de 2 tarefas e `min(n,1)` de 1 reescrita.
  - Remover o "X de 5" do parceiro.
- **Comando:** `/clarify`.

### [P2-4] Espera da correção sem previsão e textarea editável
- **O quê:** só o botão muda para "Salvando e corrigindo…". A navegação inteira fica a 50% sem explicação, e o textarea aceita edições que não entram no envio.
- **Por quê:** é o maior vale emocional do fluxo.
- **Correção:**
  - `readonly` no textarea durante `busy` de submit.
  - Nota inline com `role=status`: "Resposta salva. A correção costuma levar alguns segundos; se demorar, ela fica pendente no histórico."
- **Comando:** `/harden`.

### [P2-5] "Histórico real" truncado em 100
- **O quê:** `/api/dashboard` usa `LIMIT 100` para tentativas (`worker.js:106`). "Respostas registradas" (`app.js:59`) congela em 100, enquanto a jornada usa o histórico completo.
- **Por quê:** com 39 dias de estudo intenso, é uma métrica inventada sem aviso.
- **Correção:** `COUNT(*)` separado no dashboard para a métrica, ou o rótulo "últimas 100".

### P3 (fazer se houver tempo)
- **Jornada desatualizada silenciosa.** Se o recarregamento falha com dados anteriores, mantém os números antigos sem aviso (`app.js:81`). Mostrar "não foi possível atualizar agora" discreto junto ao rótulo da semana.
- **Storage bloqueado.** O perfil volta para Luiz a cada recarga (`app.js:13`). Com storage não persistente, destacar o seletor de perfil na abertura.
- **Confirmação desnecessária.** `hasDraft` fica verdadeiro depois de todo envio, porque o texto enviado continua no rascunho. Por isso o `confirm()` nativo "limpar o rascunho" aparece quase sempre no histórico (`app.js:238`). Comparar o rascunho com a resposta enviada antes de perguntar.
- **Erro falso depois de correção bem-sucedida.** Se `reloadData()` falha depois da correção, o retry mostra erro (`app.js:235`). Tratar a falha de recarga à parte.
- **Mensagem de erro de fala para escrita.** `worker.js:162` responde "Pergunta de seguimento inválida." também para escrita. Usar "Esta tentativa não pode ser revisada agora."
- **Acessibilidade:**
  - `aria-label` no `<span id="timer">` pode esconder o valor do tempo. Usar um rótulo visível ou `aria-describedby`.
  - "● Gravar" e "■ Parar" são lidos como símbolos. Pôr `aria-hidden` nos glifos.
  - Erro anunciado duas vezes (`role=alert` + toast).
- **Visual:**
  - Contorno de `.secondary` de 1,65:1 → usar `--field-line` (#6b6b6b).
  - Navegação com mínimo de 13–14 px.
  - Sublinhado do link da igreja com `--muted`.
  - Faixas laterais → fundo tingido ou rótulo "Versão sugerida" na frase melhorada, que hoje só se distingue pelo verde.
- **Rótulos:** unificar "Triagem/Diagnóstico" e "Corrigir agora/Tentar correção novamente".
- **Captura desatualizada.** `journey-local-mobile.png` é anterior ao código atual: mostra "Concluído pelos dois" e não mostra o link da igreja. Refazer a captura no QA final.

## Igrejas, hospitais e San Sebastián

- **Integração:**
  - Catedral del Buen Pastor (Donostia), Catedral de Santiago de Bilbao e Catedral de Santiago de Compostela aparecem em `journey.js:31-35`, no fallback `CITY_FALLBACK` de `app.js` e em `docs/REFERENCIAS-CIDADES.md`.
  - Em Referências, cada uma tem rótulo "Igreja", nome em espanhol (`lang=es`) e "Página oficial da igreja ↗".
  - No Meu dia, aparece só a de Donostia, em `--muted` e 14 px.
  - A torre SVG declara ser silhueta original "livremente inspirada" e não reprodução; fica com `aria-hidden` e é ocultada em `forced-colors`.
  - Nenhum logo, nenhuma afiliação, nenhum conteúdo religioso ou clínico nas tarefas DELE. **Discreto e adequado.**
- **Links (HTTP 200 em 06/10):**
  - `catedralbuenpastor.org/catedral/conoce-el-templo/`, `catedraldesantiago.es/visitas/`, `donostia.eus` (La Concha), `turismo.euskadi.eus` (Bilbao), `turismo.gal` (Santiago) e as duas páginas da Osakidetza.
  - `catedralbilbao.com/catedral-de-bilbao-e-iglesia-de-san-anton/la-catedral/` redireciona para `catedralbilbao.com/la-catedral/` (200). Sugiro trocar pela URL final em `journey.js`, no fallback de `app.js` e no doc.
  - `xxisantiago.sergas.es` (Hospital Clínico) deu timeout daqui, inclusive na raiz do domínio. Pode ser bloqueio de rede ou geográfico; o root já validou. Reconferir antes de publicar.
- **Contexto profissional.** Os hospitais só aparecem em Referências, sem informações de vaga ou revalidação. Não é invasivo. Sugestões menores:
  - O link da igreja no Meu dia é a única referência cultural na tela de treino. Pode ficar, mas, se o P1-1 encolher a jornada, movê-lo para Referências.
  - Evitar a expressão "hospital de referência" (termo técnico de saúde), que aparece em Referências (`app.js:61`). Preferir "como referência de contexto".

## Red flags por persona

- **Luiz no ônibus, 12 min:** antes do treino passa por h1, countdown, banner e jornada; o CTA laranja é "Ver evolução"; precisa abrir um acordeão. Na espera da correção, não tem previsão de tempo. O relógio pausa após 3 min sem toque enquanto ele pensa.
- **Alana (B2), revisando pelo histórico:** o caminho com correção pronta agora funciona. O caminho com correção pendente ("Corrigir agora" → "Fazer nova tentativa") perde a reescrita (P2-1). Ela vê o placar ao lado do de Luiz (P2-3).
- **Casey (celular, distraído):** os perfis no topo trocam de perfil e saem da tarefa sem confirmação (o rascunho fica salvo). O estado sobrevive a interrupções.
- **Sam (acessibilidade):** timer com `aria-label` sobre o valor; glifos ● e ■; contorno dos botões secundários abaixo de 3:1; link da igreja quase indistinguível. A favor: skip link, foco laranja de 3 px, alvos de 44 px, `forced-colors`.
- **Riley (testa limites):** storage bloqueado volta o perfil para Luiz; tarefa retirada → "Recarregue a página" (recarregar não resolve); "0 min estimados" em tentativas de menos de 60 s.

## Perguntas

1. Se o Meu dia pudesse mostrar uma coisa só, seria countdown, jornada ou próxima tarefa?
2. O número do parceiro precisa existir, ou "parte feita" basta para cooperar?
3. O countdown laranja de 64 px combina com "sem pressão"?

## Checklist para o root

- [ ] P1-1 Painel `.next-task` no topo do Meu dia e jornada compacta abaixo.
- [ ] P2-1 Recalcular a tentativa depois de "Corrigir agora" no histórico, com teste.
- [ ] P2-2 Vincular o reenvio de escrita depois do feedback (ou `readonly` até "Reescrever"), com teste.
- [ ] P2-3 Remover os números do parceiro e limitar as próprias contagens à meta.
- [ ] P2-4 `readonly` + nota de espera durante o envio.
- [ ] P2-5 Contagem real de respostas, sem `LIMIT 100`.
- [ ] Trocar a URL da catedral de Bilbao pela final; reconferir o link do Sergas.
- [ ] P3 de contraste: contorno de `.secondary`, navegação ≥ 13 px, sublinhado do link da igreja.
- [ ] Refazer as capturas na versão final.

## Ajustes após a crítica (revisão central)

O painel Meu dia passou a abrir com uma próxima atividade acionável, priorizando rascunho ainda não enviado e diagnóstico disponível. O prazo da prova virou uma linha discreta e a jornada foi reduzida a um resumo com acesso aos marcos. Respostas já enviadas sem alteração não ocupam o atalho de rascunho.

A jornada mostra a contribuição de cada pessoa como parte feita/em andamento, sem volumes lado a lado ou contador de marcos do parceiro. A correção pendente no histórico repinta as ações depois de recebida. A edição direta de um texto corrigido mantém o vínculo com a tentativa anterior sem apagar a edição do aluno. Durante o envio, campos e escolhas ficam bloqueados e há uma mensagem de andamento. Os totais de prática usam o histórico completo, embora a lista mostre até 100 respostas.

Validação central: testes automatizados de vínculos, rascunhos enviados e contagem completa; navegação real em Chrome, sem overflow nem alvos visíveis abaixo de 44 px nas larguras 320, 390, 430 e 1280. Os testes locais não enviaram respostas artificiais à produção. Não houve novo cálculo da nota de design nem teste físico em Safari/iPhone.

A segunda leitura com Opus 5.5 confirmou o fechamento dos contadores comparativos, do retry no histórico, da edição vinculada, do bloqueio de campos e dos totais completos. Ela identificou o rascunho idêntico ao último envio como próximo treino indevido; esse ponto foi resolvido em `hasUnsubmittedDraft`, com regressão para escrita e alternativas objetivas. A segunda leitura não incluiu esse último patch.
