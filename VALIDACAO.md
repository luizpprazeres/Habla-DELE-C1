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

## Atualização 0.3.0 — jornada cooperativa e mobile

Em 06/10/2026, 56 testes passaram: preservam os testes anteriores e acrescentam regras da jornada, semana em Maceió, deduplicação, vínculos de revisão e diálogo, idempotência de reconhecimento, acesso e origem, ausência de textos privados no painel e construção do rascunho de reescrita/seguimento. A verificação de sintaxe e o dry run de publicação também passaram. Reenviar o mesmo texto não conta como reescrita.

A migração 0005 foi aplicada no D1 local. Testes HTTP reais locais confirmaram os dois perfis, objetivo cooperativo completo com dados sintéticos, reconhecimento persistente e único, rejeição de alvo próprio, marco não conquistado e mensagem inválida. Os dados sintéticos foram inseridos somente no banco local. Foi criado backup privado do D1 remoto antes da mudança.

A inspeção central via navegador Chrome conferiu Meu dia, Evolução e Referências em 320, 390, 430 e 1280 px sem rolagem horizontal e com controles de pelo menos 44 px de altura. O rascunho escrito permaneceu após recarga; a fonte de mediação oral continuou oculta. Uma celebração local foi confirmada na interface e no banco. A seleção de perfis preserva o perfil atual caso a busca falhe; a navegação do treino continua independente de uma falha da jornada.

Foram adicionados tratamento de armazenamento indisponível, proteção de navegação durante operações, acesso por teclado ao envio de áudio e recuperação de correção pendente. A barra móvel é ocultada enquanto se digita; o posicionamento usa visualViewport quando disponível. Essa implementação não equivale a um teste com teclado virtual, Safari ou microfone em aparelhos físicos; essas verificações continuam pendentes nos celulares de Luiz e Alana.

Os terminais Claude Code usaram Opus 5.5, confirmado nos resultados de modelo, para backend, design, polimento das igrejas e crítica independente com a skill critique. A direção visual usa design-taste-frontend. As referências de cidades, hospitais e igrejas estão em docs/REFERENCIAS-CIDADES.md; a torre gótica é ilustração original esquemática, sem logotipos ou alegação de reprodução arquitetônica fiel.

A crítica com Claude Opus 5.5 levou à simplificação do Meu dia, à retirada de volumes comparativos entre o casal e à correção dos vínculos de reescrita no histórico e na edição direta. O contador de progresso consulta todo o histórico. Rascunhos idênticos a respostas já enviadas não tomam o atalho da próxima atividade. Campos ficam bloqueados durante envio e correção, com estado visível. A versão final passou em 59 testes e em `npm run check`; o dry-run de publicação também passou.

### Publicação confirmada em 06/10/2026

Código publicado: `cceb7d31785140e0f9fb5c131b5bdd152cebb15d`. Cloudflare Version ID: `aa7c2209-8926-49e1-a312-ce76b43aeebc`. Migração 0005 aplicada no D1 remoto. CI do código aprovado: https://github.com/luizpprazeres/Habla-DELE-C1/actions/runs/37470953195.

Verificação autenticada após publicação: jornada disponível nos dois perfis com três referências de igrejas; duas respostas reais de Luiz preservadas com metadados anteriores e nenhuma resposta de Alana; proteção de acesso e origem e exportação sem gabaritos mantidas. Não foram enviados respostas ou reconhecimentos artificiais em produção. Na navegação de produção em Chrome, o Meu dia de Alana passou em 320, 390, 430 e 1280 px: sem overflow horizontal, alvos visíveis de pelo menos 44 px e botão principal alcançável por hit test. Capturas locais em `artifacts/habla-jornada-mobile.png` e `artifacts/habla-igrejas-mobile.png` (não publicadas no Git). Apenas erros de extensão MetaMask apareceram no console consultado, sem erro do app. Continuação a partir de rascunho, reescrita pelo histórico e persistência/idempotência de reconhecimento foram verificadas no ambiente local. Sem teste físico de microfone ou Safari/iPhone.

### 0.3.1 — San Sebastián no Meu dia e motivação contextual

Paisagem original de La Concha, estática, com identidade da cidade visível na abertura. Curadoria de frases sobre linguagem e ações práticas por habilidade, rascunho e revisão, estável por dia no fuso America/Maceio e diferente entre os perfis. Não faz chamadas adicionais de IA nem mede desempenho. O motor, banco e respostas não foram alterados.

Dois terminais Claude Code com Opus 5.5 trabalharam no design e no `/critique`. As observações sobre hierarquia, telas baixas, linguagem e contraste foram tratadas na revisão central. 63 testes, sintaxe e dry-run passaram. Chrome real: 320×568, 375×667, 390×844, 430×932 e 1280×844, sem overflow, botão principal alcançável e alvos visíveis de pelo menos 44 px nos cenários conferidos. Navegação manteve a mensagem; abrir o treino manteve o rascunho e deixou a paisagem fora do editor. Sem teste físico de aparelho.

Publicação 0.3.1 confirmada: código `34ae531dd73e66fda394ce5c018e40c685ada264`, Cloudflare Version ID `9a1d523d-4b53-4867-90bb-79b41c64b67b`. CI do código aprovado: https://github.com/luizpprazeres/Habla-DELE-C1/actions/runs/37473400295. A API autenticada confirmou o histórico anterior intacto (Luiz: duas respostas; Alana: nenhuma), com acesso/origem e gabaritos protegidos. Sem respostas de teste em produção. Na publicação, o Meu dia de Alana passou nos cinco tamanhos acima: imagem carregada, sem overflow, alvos visíveis ≥44 px e botão principal alcançável por hit test. Captura local não versionada: `artifacts/habla-donostia-mobile.png`.

## Atualização 0.4.0 — cidades, evolução simultânea e álbum

94 testes passaram: migrações em SQLite real, janela de14 dias/Maceió, históricos completos, privacidade, cotas atômicas, assinaturas e limites de fotos, idempotência por metadados/MIME/bytes, falhas/cache de clima, catálogo/ciclo/fotos reais e recuperação de confirmação perdida sem duplicar. Sintaxe passou. Nenhuma chamada de IA ou resposta fictícia foi necessária para validar esta mudança.

Três terminais Claude Code com modelo confirmado `claude-opus-5-5` dividiram conteúdo/ativos, servidor e interface; um quarto fez `/critique` com detector determinístico. Ajustes centrais corrigiram rolagem lateral de tabela acessível em320 px, idempotência após falha de rede, rótulos dos períodos, atribuição/modificações, alvos culturais de44 px e estabilidade de polling. O detector encontrou nove avisos, sendo imagem de prévia ainda oculta sem src um falso positivo e oito indicações de faixas semânticas antigas. A luz é estática; animação180 ms e reduced-motion conferidos no código, sem emulação de movimento reduzido nesta sessão.

Chrome/Cua: dashboard e evolução em320×568,375×667,390×844,430×932,1280×844 sem rolagem lateral; CTA48 px e hit test positivo. Em320×568, botão terminou em472,5 px, acima da barra inferior. Legenda continuou íntegra após84 segundos de atualização e navegação; Alana abriu rascunho próprio e viu a mesma foto compartilhada local. Servidor/D1 local confirmou foto real WebP, recuperação com tamanho original e segundoPOST200 sem duplicata. Seletor automatizado bloqueado pela extensão Chrome sem acesso a arquivos: compressão/seleção completa, HEIC, grandes fotos e Safari/teclado virtual não foram comprovados em aparelho físico.

Backup privado do D1 remoto foi feito antes das alterações; migração0006 é aditiva. Verificação da publicação e preservação do histórico será registrada após deploy.

Publicação confirmada: código `8c2c0a5dbbd3addc7aa09f987145eaa9d640290b`, versão Cloudflare `bf3ceb6d-d6e2-4255-8a03-61b7d77293d0`, no endereço existente `https://tutor-dele.tutor-dele.workers.dev/`. Migração0006 aplicada no D1 remoto. CI do código passou no GitHub (run37478721037);94 testes, sintaxe e dry run passaram antes do deploy.

Smoke HTTP em produção confirmou evolução com os dois perfis/janela14 dias, seis WebPs públicos e créditos, clima real disponível em Donostia, álbum com autenticação, origem externa recusada e exportação somente de metadados. Verificação comparou ids/tempos/resultados anteriores: Luiz mantém2 respostas, Alana0. Nenhuma foto, resposta ou celebração de teste foi inserida em produção.

Cua/Chrome publicado: Alana abriu fotografia real de La Concha no treino recomendado; Evolução mostrou Alana0/Luiz2, álbum0 de80/25MB e sem erros. Luiz em320×568: foto1280 px carregada, página sem overflow, CTA48 px encerrando em424,5 px acima da nav507 px e hit test positivo. Foto local também abriu em aba pelo link normal do álbum; tentativa direta via extensão foi corretamente recusada pelo gate de origem. As screenshots de produção ficaram em `artifacts/experience/` (arquivos locais, ignorados pelo Git).
