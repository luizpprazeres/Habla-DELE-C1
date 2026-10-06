# Jornada cooperativa

A jornada mostra o caminho que Luiz e Alana estão fazendo juntos até a prova. Ela reconhece **respostas enviadas** e o trabalho de revisão, não mede nível nem promete aprovação. Não há notas, pontos, XP, streak, ranking ou comparação entre perfis. A ordem dos membros na resposta só põe o perfil ativo primeiro.

Código: `src/journey.js` (lógica pura e consultas) e rotas em `src/worker.js`. Migração: `migrations/0005_cooperative_journey.sql`. Testes: `tests/journey.test.js`.

## Metodologia

**Fonte dos dados.** Tudo é recalculado a cada pedido a partir do histórico **completo** de tentativas (sem `LIMIT`). A consulta lê apenas metadados: id, tarefa, perfil, tentativa-pai, data, habilidade e três indicadores calculados no SQL — se há correção salva e se a correção trouxe uma pergunta de seguimento não vazia e se a reescrita mudou o texto original. O texto da resposta, a transcrição, o feedback e os gabaritos não saem do banco.

**Conquistas (marcos estáveis).** São retroativas: valem para tentativas feitas antes desta versão. `earnedAt` é a data da tentativa que cumpriu o marco; `null` quando ainda está bloqueado. Como derivam de tentativas que não são apagadas, uma conquista não se perde com a virada da semana nem com a desativação de tarefas antigas.

| id | Quando é registrada |
|---|---|
| `first-step` | Primeira resposta enviada, em qualquer habilidade. |
| `two-skills` | Respostas enviadas em duas habilidades diferentes. |
| `four-skills` | Respostas enviadas em leitura, escuta, escrita e fala. Registra prática, não nível. |
| `first-revision` | Primeira reescrita válida. |
| `first-dialogue` | Primeira continuação de diálogo válida. |

Nenhum marco depende de acerto, banda estimada ou correção da própria resposta: uma resposta salva com correção pendente já conta.

**Vínculos válidos.** Uma tentativa-filha só conta se o pai existir, for do mesmo perfil, da mesma tarefa e da mesma habilidade, for anterior à filha e tiver correção salva.

- **Reescrita:** filha de escrita cujo pai foi corrigido, com texto diferente do original (desconsiderando espaços nas bordas). Reenviar o mesmo texto não conta como reescrita.
- **Diálogo:** filha de fala cujo pai trouxe uma pergunta de seguimento real (`followUp` não vazio).

Pai inexistente, de outro perfil, de outra tarefa, sem correção, posterior à filha ou a própria tentativa não contam. Leitura e escuta vinculadas também não contam.

**Semana.** Vai de segunda 00:00 a domingo 23:59 no horário de `America/Maceio`, usando o fuso por `Intl` (sem deslocamento fixo). `week.start` é a data local da segunda-feira.

**Contagem semanal (deduplicada).** Tentativas repetidas com o mesmo id são descartadas. `weekly.practice` conta **tarefas distintas** com resposta enviada na semana; várias tentativas na mesma tarefa contam uma vez. `weekly.revision` conta tarefas distintas com reescrita ou diálogo válido na semana. A contagem semanal recomeça na segunda-feira; os marcos permanecem.

**Objetivo a dois.** `shared.complete` fica verdadeiro quando **cada** perfil tem, na semana, `practice >= 2` e `revision >= 1`. `contributions[].done` mostra a parte de cada um, sem comparar quem fez mais.

**Próximo passo (`nextAction`).** Uma sugestão em tom neutro, nesta ordem: enviar a primeira resposta; completar duas tarefas diferentes na semana; fazer uma reescrita ou continuação de diálogo; experimentar uma habilidade ainda sem resposta; caso contrário, seguir no ritmo da agenda.

**Celebrações.** Um perfil pode reconhecer uma conquista **já registrada** do outro, com uma de três mensagens predeterminadas, escritas para um casal adulto:

| `messageId` | Mensagem |
|---|---|
| `effort` | Vi o seu esforço nesta etapa. Sigo com você. |
| `revision` | Voltar ao texto e ajustar é o trabalho que conta. Admiro isso. |
| `together` | Mais um passo nosso rumo a novembro. |

Cada par (remetente, destinatário, marco) admite uma única celebração. Repetir o pedido devolve a celebração original sem trocar a mensagem. Não existe texto livre.

**Cidades.** San Sebastián/Donostia (principal), Bilbao e Santiago de Compostela, com links oficiais de turismo, dos hospitais universitários e das catedrais del Buen Pastor, de Santiago de Bilbao e de Santiago de Compostela. São referências de contexto; o aplicativo não declara afiliação, não usa logos e não impõe conteúdo clínico às tarefas DELE.

## Endpoints

Ambos usam o acesso compartilhado existente (cookie `dele_session`) e respondem com `Cache-Control: no-store`. Como em toda escrita, o `POST` exige `Origin` igual à do aplicativo. Os dois perfis compartilham o acesso; não há autenticação individual.

### `GET /api/journey?profile=luiz|alana`

`profile` é o perfil ativo, usado para calcular `canCelebrate`. Perfil inválido → `400`.

```json
{
  "week": { "start": "2026-10-05", "label": "Semana de 05/10 a 11/10" },
  "members": [{
    "id": "luiz", "name": "Luiz",
    "milestones": [{ "id": "first-step", "title": "Primeira resposta enviada", "description": "…", "earnedAt": "2026-10-05T12:00:00.000Z", "celebratedBy": ["alana"], "canCelebrate": false }],
    "weekly": { "practice": 2, "revision": 1 },
    "nextAction": "Experimentar escuta: ainda não há resposta nessa habilidade."
  }],
  "shared": { "title": "Objetivo da semana a dois", "description": "…", "complete": false, "contributions": [{ "profile": "luiz", "name": "Luiz", "done": true }] },
  "cities": [{ "id": "donostia", "name": "San Sebastián / Donostia", "place": "Paseo de La Concha", "hospital": "Hospital Universitario Donostia", "cityUrl": "https://…", "hospitalUrl": "https://…" }],
  "celebrations": [{ "id": "…", "from": "alana", "to": "luiz", "milestoneId": "first-step", "messageId": "effort", "message": "Vi o seu esforço nesta etapa. Sigo com você.", "createdAt": "…" }]
}
```

`canCelebrate` só é verdadeiro para conquistas registradas do **outro** perfil que o perfil ativo ainda não celebrou. `messageId` é um campo extra além do contrato, para a interface reconhecer a mensagem sem comparar textos.

### `POST /api/journey/celebrate`

Corpo: `{ "profile": "alana", "target": "luiz", "milestoneId": "first-step", "messageId": "effort" }`.

| Situação | Status |
|---|---|
| Celebração criada | `201` `{ celebration, created: true }` |
| Já existia para (profile, target, milestoneId) | `200` `{ celebration, created: false }` com a original |
| Perfil inválido, `profile === target`, marco desconhecido ou mensagem fora da lista | `400` |
| Conquista ainda não registrada no histórico do alvo | `409` |
| Sem acesso | `401` |
| Origem diferente | `403` |

O banco reforça as mesmas regras: `CHECK` para marco, mensagem e `from_profile <> to_profile`, e `UNIQUE(from_profile,to_profile,milestone_id)`.

### Exportação

`GET /api/export` passa a incluir `celebrations` (linhas de `journey_celebrations`). Se a migração 0005 ainda não tiver sido aplicada, devolve `[]` em vez de falhar, para não bloquear a cópia dos estudos.

## Implantação

Aplicar a migração `0005_cooperative_journey.sql` antes de publicar o worker. Sem ela, `GET /api/journey` responde com erro; a interface deve tratar esse erro de forma independente do painel, sem bloquear o treino.
