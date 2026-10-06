# Validação do Habla 0.2.0

Verificação em 06/10/2026, horário de Maceió.

## Código e pedagogia

37 testes automatizados passaram, além da verificação de sintaxe. Cobrem recortes C1, extensões, tipos de habilidade, evidências literais, distratores extremos repetidos, alternativas e gabaritos embaralhados, resolução cega, rejeição de revisão ambígua, ocultação do gabarito e da fonte oral, acesso, origem de requisição e tempo ativo.

Chamadas reais confirmaram leitura inferencial curta e longa com GPT-5.5, resolução sem chave e revisão com GPT-5.4. Uma amostra longa aprovada tinha 628 palavras e seis itens; a curta tinha quatro itens. A inspeção manual confirmou alternativas próximas e contraste entre agentes, condições e posições. Isso não é certificação do nível nem garantia de equivalência ao DELE. Amostras fracas anteriores foram rejeitadas; falhas podem consumir chamadas e ainda podem ocorrer.

Também foram verificadas geração de uso da língua, escuta pragmática, mediação escrita e negociação, correção escrita, reescrita associada à tentativa anterior e correção oral a partir de transcrição. Mediação escrita completa (220–250 palavras) e negociação foram repetidas com GPT-5.5. Os testes iniciais desses formatos usaram GPT-4.1; a leitura e a correção de reescrita foram repetidas com a configuração nova. Escuta pragmática também passou com GPT-5.5 após a correção do reparo de fonte; gabarito conferido em resolução cega. Uma correção com citação inválida foi barrada e a rotina de reparo permitiu concluir a correção, preservando a resposta.

Um áudio de mediação de 1.553.664 bytes foi armazenado em partes no D1 e recuperado com bytes idênticos; a segunda solicitação confirmou cache hit. Gravações do aluno continuam com o limite original de 900 KB. A captura do microfone físico de cada aparelho ainda precisa ser verificada.

## Interface

Inspeção no Chrome em viewports de 320, 390, 430 e 1280 px, sem rolagem horizontal. Controles principais com altura de pelo menos 44 px. Fonte e campo de escrita em 18 px. A mediação escrita ocultou a fonte oral. Um rascunho e seu tempo de oito segundos foram preservados após recarga. O estado “Criando e revisando…” apareceu com controles bloqueados durante a geração. A API recusou geração simultânea do mesmo perfil com 409.

A navegação fixa pode cobrir um controle junto à borda visível enquanto se rola; existe espaço no final da página para alcançá-lo. Não foram testados teclado físico, Safari móvel ou microfone real. Os testes do cronômetro confirmam que pausa, aba oculta, inatividade e intervalo até o dia seguinte não são somados ao estudo.

## Publicação e dados

A versão 0.2.0 foi publicada na Cloudflare Workers em https://tutor-dele.tutor-dele.workers.dev, com D1 e os segredos cadastrados. Código publicado: `cc167a064b4c942f52fe6c3e19a815266ac0dfca`. Versão Cloudflare: `2fba2263-45e2-4f69-b7f7-5344bbc6d9b2`. O CI desse código passou no GitHub (run `37461309155`), assim como a compilação de publicação em modo dry run. Foi feito backup privado do D1 antes da mudança. As migrações 0003 e 0004 são aditivas e foram aplicadas com sucesso nos bancos local e remoto. Nenhuma resposta fictícia foi enviada ao banco remoto; os testes de respostas ficaram no banco local. Consulta remota confirmou as duas tentativas reais de Luiz, ambas com 4/4; a escuta manteve os 240 segundos informados pelo usuário.

Após a publicação, chamadas reais em produção geraram com sucesso escrita formal para Luiz, leitura inferencial para Alana e escuta pragmática para Luiz (HTTP 201 nos três casos). O histórico de Luiz continuou com as duas tentativas reais e os dois resultados 4/4. A interface publicada confirmou a escrita como próxima etapa do diagnóstico. Nenhuma resposta fictícia foi enviada em produção.

A API recusou acesso sem a chave compartilhada (401) e escrita de outra origem (403). Os painéis dos dois perfis responderam normalmente; tarefas pendentes também ocultaram gabaritos na exportação. O limite diário compartilhado permaneceu em 40 chamadas.

As fontes oficiais consultadas estão em `docs/REFERENCIAS-C1.md`. Os limites da metodologia e da revisão automática estão em `docs/PEDAGOGIA.md`. O trabalho dos terminais Claude Code Opus 5.5 e a crítica estão resumidos em `docs/DESIGN-REVIEW.md`.
