# Pedagogia dos treinos C1 (`c1-v2`)

Contexto: os perfis se preparam para o DELE C1 e relataram questões fáceis demais. As tarefas originais anteriores tinham fontes curtas, 3–5 itens, respostas localizáveis por cópia literal e distratores fracos. O módulo `src/c1.js` aumenta a exigência sem declarar equivalência ao exame: ele define recortes (blueprints), valida a tarefa gerada, exige resolução cega e revisão em chamadas separadas e protege o gabarito.

Base: [Guia DELE C1 2024](https://examenes.cervantes.es/sites/default/files/Guia_examen_DELE_C1_2024_0.pdf) e `docs/REFERENCIAS-C1.md`. Nenhum texto ou questão oficial é copiado.

## Princípios

- **Dificuldade cognitiva, não lexical.** C1 exige inferência, intenção, atitude, relação entre ideias, pragmática e precisão gramatical. Vocabulário obscuro não substitui isso.
- **Apoio adaptativo não reduz exigência.** Perfil e correções recentes orientam tema, foco e instruções, nunca a extensão da fonte, o número de itens ou o nível.
- **Honestidade de formato.** Cada blueprint traz `label` e `notice` dizendo qual recorte treina e que não equivale a simulado nem a nota oficial. Treinos curtos de escrita são rotulados como parciais.
- **Triagem não certifica.** `diagnostic: true` mantém a mesma exigência e usa um subtipo estável, para comparar sessões.

## Recortes

| Kind | Subtipo | Block | Short | Itens | Observação honesta |
|---|---|---|---|---|---|
| reading | `inference` | fonte 550–650, 25 min | 220–300, 15 min | 6 / 4 | Inspirado no artigo argumentativo (implícito, atitude, intenção). |
| reading | `language` | fonte 375–425, 25 min | 170–220, 15 min | 6 / 4 lacunas | A tarefa oficial tem 14 lacunas. |
| listening | `inference` | fonte 650–750, 25 min | 250–350, 15 min | 6 / 4 | Voz sintética única; três opções; não imita a seleção de 6 entre 12. |
| listening | `pragmatics` | fonte 650–750, 25 min | 250–350, 15 min | 6 / 4 | Ironia, atenuação, crítica velada, expressões. |
| writing | `formal` | produção 180–220, 40 min; estímulo 100–180 | 80–120, 15 min (parcial) | — | Tarefa 2: texto formal a partir de estímulo. |
| writing | `mediation` | produção 220–250, 40 min; fonte de áudio 450–550 | 80–120, 15 min (parcial); fonte 200–260 | — | Tarefa 1: fonte ouvida, oculta no cliente. |
| speaking | `mediation` | fonte 400–500, 25 min | 230–300, 15 min | — | Exposição: resumir, valorar, opinar; pergunta de entrevista. |
| speaking | `negotiation` | estímulo 180–240, 25 min | 120–180, 15 min | — | Restrição explícita, desacordo razoável e pergunta final. |

`variant: 'auto'` alterna subtipos: entre as seis tarefas recentes do mesmo kind, escolhe o menos usado; no empate, evita repetir o último.

## Validação automática (`validateBlueprintTask`)

- `minutes`, `minWords`, `maxWords` e número de questões são **estritos**.
- Fonte com **tolerância de 10%** nos dois limites (ex.: 220–300 aceita 198–330). O modelo erra a contagem nos dois sentidos, e cada nova tentativa consome o limite diário de chamadas. A tolerância não muda o alvo pedido ao gerador.
- Exatamente três opções por questão, distintas após normalizar caixa e pontuação (acentos preservados: *esté* ≠ *este*).
- Opções com comprimentos desproporcionais (> 3,5×) são rejeitadas quando todas passam de 15 caracteres; opções gramaticais curtas ficam de fora dessa regra. A tarefa também é rejeitada se a correta for sempre a mais longa.
- `evidence` precisa ser trecho literal da fonte, com 3–80 palavras. Em `language`, cada lacuna é marcada como `[n]`, em ordem, e a evidência contém o marcador.
- `skill` pertence ao recorte; ao menos metade dos itens vai além de `detail` (exceto em `language`, que só aceita `grammar`, `idiom` e `cohesion`).
- Em `inference`, `intention` e `attitude`, a correta não pode copiar a fonte; em nenhum item o enunciado pode conter a resposta.
- `explanation` com 8–160 palavras e sem referência a letras ou posições ("opción B", "la primera opción"), porque as opções são embaralhadas. Palavras como *siempre* e *nunca* **não** são proibidas: absolutos sustentados pelo texto são legítimos.
- Produção: `questions` vazio; a negociação precisa de uma pergunta que mantenha a interação.

Esses controles barram defeitos detectáveis; não garantem qualidade pedagógica. Por isso existe a revisão independente.

## Resolução cega e revisão automática

Antes da revisão, uma chamada recebe somente fonte, enunciados e alternativas, sem gabarito nem evidências. `assertBlindSolve` compara as respostas independentes com a chave e rejeita divergências ou ambiguidades. Isso acrescenta uma chamada nas tarefas objetivas.

`qualityReviewPrompt` orienta um examinador a julgar sem reescrever. O prompt pede que resolva cada item usando só a fonte antes de consultar a chave apresentada no mesmo pedido, compare depois e avalie ambiguidade, plausibilidade dos distratores, suficiência da evidência e demanda C1. Em produção, avalia clareza, registro, mediação e restrições. A resposta segue `qualityReviewSchema` (strict). `assertQualityReview` só aceita `approved: true`, `level: 'C1'`, todos os itens cobertos uma vez, nenhum ambíguo, sem evidência suficiente ou com distratores fracos, e ao menos metade com `c1Demand`. Em produção, `items` deve ser `[]`.

## Exibição e gabarito

`shuffleQuestionOptions` devolve uma cópia independente com opções embaralhadas (crypto por padrão) e o gabarito preservado. `sanitizeTaskPayload` envia ao cliente só `prompt`, `choices` e `skill` de cada questão, remove a revisão e esvazia `source` quando `sourceMode === 'audio'`.

## Limites

- Recortes não reproduzem todos os formatos oficiais (associação de textos, reconstrução, microdiálogos, várias vozes e variedades, escuta dupla).
- Bandas e acertos são estimativas de treino; não há nota oficial nem probabilidade de aprovação.
- A revisão usa GPT-5.4 em uma chamada separada, sem o histórico de geração; não é um examinador humano nem uma avaliação cega, pois recebe a chave no mesmo pedido. Os modelos oficiais cronometrados e as sessões com professor continuam sendo a calibração.
- A revisão acrescenta uma chamada de IA e a resolução cega acrescenta outra nas tarefas objetivas, dentro do limite diário compartilhado.

O gerador usa GPT-5.5; os dois verificadores usam GPT-5.4; a correção usa GPT-5.4 mini. Os três usam raciocínio low. O modelo pode errar mesmo concordando com a chave. Uma tarefa rejeitada pode ser reparada até duas vezes. Conjuntos com distratores extremos repetidos também são barrados; um absoluto isolado não é proibido.
