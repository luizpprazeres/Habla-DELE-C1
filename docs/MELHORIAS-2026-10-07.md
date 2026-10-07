# Aprimoramentos 0.5.0 — 07/10/2026

## Auditoria e reaproveitamento

Reaproveitados os blueprints `c1-v2`, resolução cega, revisão independente, correções e vínculos de reescrita/diálogo, histórico completo, marcos cooperativos e cache privado de voz. Nenhuma resposta antiga é reavaliada ou modificada. A auditoria linguística em `AUDITORIA-LINGUISTICA-2026-10-07.md` não sustenta um filtro anticatalão. Pequena amostra revisada por Opus 5.5; possíveis problemas de naturalidade exigem calibração humana. Os prompts futuros verificam construções e alternativas naturais sem simplificar C1 nem proibir variedades hispânicas.

## Escuta: decisão híbrida

| Estratégia | Espera do aluno | Qualidade | Custo e limite |
|---|---|---|---|
| Somente personalizada | Geração, revisões e primeira voz na hora | Contexto individual, mesmos gates | Novas chamadas a cada tarefa/voz |
| Biblioteca pronta | Leitura do banco e download do áudio | Revisão anterior, menor personalização imediata | Custo antecipado, reutilização posterior |
| Híbrida escolhida | Pronta primeiro, personalizada disponível | Mesmos gates C1 nas duas | Reposição pequena, teto compartilhado |

Revisores independentes agora executam em paralelo após validar a tarefa. Todos os resultados são aguardados, inclusive falhas; não há publicação antecipada. Gerador e modelos de revisão permanecem os mesmos.

A API de voz aceita no máximo 4096 caracteres por solicitação. Fontes maiores são divididas em fronteiras de frase e lidas pela mesma voz em até dois pedidos simultâneos; MP3s são reunidos na ordem original. Fontes curtas usam uma chamada. A naturalidade na transição precisa ser acompanhada; é voz sintética única, não substitui gravações oficiais de várias vozes e variedades.

O banco de escuta usa tarefas e cache existentes, sem novo catálogo duplicado. `/api/listening-library` só devolve tarefas do perfil e fontes/gabaritos continuam protegidos. Áudio pronto abre pelo GET protegido, sem nova chamada de IA. POST mantém geração sob demanda; trava por tarefa impede vozes simultâneas duplicadas. Cache de estímulos ampliado de 20 para 100 MB, com limite atômico e sem apagar áudios antigos. A reposição pausa a partir de 90 MB para evitar síntese automática repetida sem espaço. O limite das gravações de alunos permanece 20 MB. Falta de espaço entrega o áudio atual sem prometer que foi guardado.

Reposição agendada três vezes por dia (05h/13h/21h UTC), no máximo uma tarefa nova por execução e duas tarefas não respondidas com áudio pronto por perfil. Primeiro prepara voz das tarefas existentes v2 ainda sem cache. Se não houver saldo no teto diário, não gera. Antes de gerar tarefa nova, deixa uma margem para uso direto; chamadas continuam dentro do limite compartilhado de 40/dia, não teto financeiro. Reprodução pronta custa zero chamadas. Falhas consomem chamadas reservadas e não mudam o histórico. A biblioteca cresce gradualmente e pode esgotar conforme uso.

Não se usa `waitUntil` HTTP para longas gerações de voz: a Cloudflare limita o trabalho após a resposta a 30 s. A execução agendada permite até 15 min de tempo de parede; continua sujeita ao limite de CPU do plano. Os eventos `task_ready` e `speech_ready` registram latência sem respostas, fontes ou segredos. A espera anterior de dez minutos é relato do usuário; faltava telemetria para atribuir todo esse intervalo a uma etapa específica.

## Caderno e agenda

Migrações 0007–0009. Itens por erro objetivo com evidência literal/competência válida ou prioridade produtiva com trecho literal da resposta. Id determinístico por tentativa/item; reprocessamento não altera revisão já agendada. Histórico anterior é incorporado em páginas de 25 tentativas, sem chamadas de IA. Tarefas legadas sem competência validada não geram cartões automaticamente. Caderno paginado de 200 itens; os anteriores permanecem acessíveis. Contexto e alternativas vêm da tarefa já respondida, sem gabaritos de tarefas não respondidas.

Três pontos vencidos no início, recolhidos para evitar excesso. Aluno escreve antes de revelar, compara e informa dificuldade. A nova resposta fica na revisão; não recebe nota automática. Intervalos 1/3/7/14 dias conforme autoavaliação; não prova domínio. UUID e transação evitam avanço duplicado em retentativas. Última resposta de revisão aparece no caderno e todas as revisões entram na exportação.

Recomendações usam frequência de registros por competência, explicando a base; não diagnóstico de nível. Um erro objetivo e uma prioridade produtiva são unidades diferentes, por isso frequência não compara habilidades diretamente. Avanços qualitativos futuros exigem trechos anteriores/atuais diferentes e literais, vinculados à mesma tarefa e perfil. Ausência de erro ou elogio genérico não gera conquista. Observações de IA, não certificação.

## Calendário e interface

Acesso/início são novos eventos; resposta enviada vem do histórico completo. Eventos deduplicados por dia de Maceió e tarefa. Nenhum acesso histórico é inventado. Plano opcional de 1–4 tarefas distintas no dia: parcial/concluído só com meta explícita. Reescrita da mesma tarefa não conta como uma segunda tarefa do plano. Sem meta, rótulo "Resposta enviada". Semana navegável e guarda de sequência impede resposta atrasada trocar o calendário.

Cinco cidades reutilizam os cinco marcos existentes. Cada marco mantém seu próprio critério, inclusive fora da sequência visual, sem ranking ou pontos novos. San Sebastián encerra a rota como ambientação; a rota não mede distância ao C1.

Desktop usa margens seguras e duas colunas, fontes não crescem e texto de tarefas tem largura confortável. Hora/clima e créditos completos ficam em "Sobre este lugar" e em Referências. Atribuição/autor/licença/original/adaptações preservados. Câmera usa input `capture=environment`; galeria sem capture. Ambos usam compressão, prévia e confirmação existentes. Navegadores desktop podem abrir seletor em vez da câmera. Teste em aparelho iOS/Android é necessário; emulação de viewport não comprova hardware.

## Fontes

[Guia oficial DELE C1 2024](https://examenes.cervantes.es/sites/default/files/Guia_examen_DELE_C1_2024_0.pdf), [API Speech OpenAI](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create), [limites Cloudflare](https://developers.cloudflare.com/workers/platform/limits/).

A tarefa antiga "La biblioteca con cafetera", ainda sem respostas no banco, recebeu apenas a marca `quality.requiresLinguisticReview`: fica fora de novas recomendações/biblioteca até revisar a alternativa com construção condicional problemática. Fonte, questões, gabarito e dados originais foram preservados. Isso não é filtro de variantes regionais.


## Verificação da entrega

118 testes automatizados passaram, incluindo SQLite real com todas as migrações, isolamento de perfis, backfill, evidência literal, revisão idempotente com nova resposta, transações, biblioteca sem chamada de IA, bloqueio de voz concorrente e limite de cache. Checagem de sintaxe e publicação Cloudflare concluídas. Implementação dividida com terminais Claude Code Opus 5.5; `/design-taste-frontend` e `/critique` executados. A crítica levou a preservar a nova resposta de revisão, mover a biblioteca para cima e proteger a navegação semanal contra respostas atrasadas.

Na produção foram preparados materiais novos de escuta, sem criar tentativas de aluno: Luiz, 103,2 s de geração/revisão e 30,7 s de voz; Alana, 145,2 s e 27,2 s. Medições pontuais de materiais curtos, não garantia de latência para outros recortes. O diagnóstico de escuta já existente de Alana também recebeu cache. Reproduzir do cache retornou HTTP 200, sem aumento de chamadas de IA ou respostas. O player carregou o áudio diagnóstico completo, com duração 286,464 s e sem erro de mídia.

UI publicada conferida em 320×568, 390×844, 430×932, 1280×800 e 1920×1080: sem overflow horizontal, CTA de 48 px atingível, calendário semanal e percurso responsivos. Histórico semanal navegado; revisão com resposta salva e próxima data conferidas na base local, sem fabricar progresso em produção. Câmera/galeria têm inputs separados e atributos adequados; captura e permissões em iOS/Android físicos ainda não verificadas. Movimento reduzido está previsto em CSS, sem teste de preferência real do sistema nesta sessão.
