# Experiência: cidade do dia, evolução a dois e álbum (UI)

Contrato: `private/agents/experience-contract.txt` (0.4.0). API: `docs/EXPERIENCE-API.md`.
Arquivos: `public/experience-ui.js` (novo), `public/app.js` e `public/style.css` (integração). Sem dependência nova.

## Controlador

`createExperience(deps)` devolve `mount(page, main)`, `unmount()`, `busy()` e `sync()`.

- O `app.js` chama `unmount()` no início de `render`, `openTask`, `showAttempt`, `showAccess` e na tela de erro do boot, e `mount()` depois de `bindMain`. Troca de perfil passa por `render`, então também desmonta e remonta.
- Cada montagem tem um `AbortController` e um número de geração. Fetches usam o `signal`; resposta que chega depois do `unmount` não pinta. Listeners (`visibilitychange`, `focus`, erro de imagem, botões) e timers são registrados com o `signal` e somem juntos.
- Slots `[data-xp-slot]` são preenchidos sem repintar a tela: `lesson-photo` e `city` (Meu dia), `shared-progress` e `album` (Evolução), `credits` (Referências). Um slot só é repintado quando o HTML muda; se o foco estava dentro, volta ao título do slot.
- `deps.hold` reaproveita `holdIfBusy`: controles pintados durante uma operação do app nascem bloqueados. Ao fim de `busy()`, `experience.sync()` recalcula os botões do álbum.
- `go()` e a troca de perfil esperam enquanto uma foto está sendo preparada ou enviada.
- Todo texto vindo de módulo ou API passa por `esc`. URLs externas só `https:`; foto da cidade só `/media/spain/*.webp|jpg|png`; foto do álbum só `/api/photos/:id/image`.

## Meu dia

- A faixa `donostia.svg` saiu do topo: a imagem da cidade do dia fica no painel da próxima tarefa, como faixa com contraste reduzido e fade para o fundo do painel. O rótulo “Ambientação: cidade” fica abaixo da imagem, nunca sobre ela. A altura é reservada antes de carregar (sem salto de layout).
- Logo depois do painel de prática vem “Hoje em cidade”: hora local (`Intl`, fuso da cidade, atualiza a cada 15 s), “Tempo estimado · Open-Meteo” com temperatura e nome do código WMO, hora da estimativa e aviso quando `stale`. Sem dado: “Indisponível agora”, nunca zero.
- Uma curiosidade em espanhol visível; as outras, igreja e hospital ficam num `details`. Crédito da foto (autor, licença, fonte) no próprio painel.
- Donostia recebe a etiqueta “Cidade principal da jornada”; nos outros dias o painel diz quando ela volta.
- `spain-cities.js` é importado dinamicamente. Se faltar ou falhar: Donostia com `donostia.svg`, hora e tempo, sem fatos nem crédito inventados. Se a foto de Donostia falhar, troca pela ilustração; outra cidade sem foto fica sem imagem (a ilustração de La Concha não representa outra cidade).

## Evolução

Ordem: evolução dos dois → prontidão C1 → marcos da jornada (inalterados, com elegibilidade de reconhecimento do perfil atual) → álbum → histórico próprio recolhido em `details` (com exportação).

- “Nós dois, últimos 14 dias”: um bloco por perfil, quem está vendo primeiro. Respostas por habilidade (barras horizontais) e respostas por dia (14 colunas, dias zerados incluídos). Cada perfil na própria escala, declarado no texto; sem ranking, sem streak, sem perda de sequência. Ritmo: dias com prática na semana e data da última resposta. Tabela oculta com os números para leitor de tela.
- Atualiza a cada 60 s só com a Evolução aberta e a aba visível, ao voltar à aba (se passou 60 s) e no `focus` (se passou 15 s). Pula a atualização com operação do app, gravação, preparo ou envio de foto. Uma requisição por recurso por vez. Erros independentes por bloco, mantendo os dados anteriores e “Atualizado às”.

## Álbum a dois

- Botão “Escolher foto” (teclado ok) abre o `input type=file` oculto. Nada é enviado ao escolher: só o botão “Compartilhar foto” envia.
- Compressão no navegador: `createImageBitmap` (fallback `<img>` com `data:` e `naturalWidth`), maior lado até 1600 px, JPEG com qualidade decrescente até 600 KB, sempre redesenhando do original. O canvas descarta EXIF e GPS. HEIC que o navegador não abre gera mensagem com orientação, sem quebrar.
- Prévia local via `data:` URL (não precisa revogar e funciona com qualquer CSP de `img-src data:`).
- Rascunho por perfil em memória (foto, prévia, legenda, destino, `id`): sobrevive à troca de página e de perfil e à falha de envio. O `id` (UUID minúsculo) é mantido nas retentativas da mesma foto; editar legenda ou destino depois de uma falha gera `id` novo (o servidor responde 409 ao mesmo `id` com dados diferentes).
- O formulário é pintado uma vez por montagem; a atualização só repinta a lista e o uso de espaço. Lista não repinta com foco dentro dela.
- Limite mostrado (“n de 80 fotos · x de 25 MB”); álbum cheio desativa o envio com mensagem. Sem exclusão nesta versão. Estado vazio sem fotos fictícias.
- Destino: “Nós dois” ou “Incentivo para parceiro”. Cada foto mostra legenda, quem enviou, data e destino.

## Referências

“Fotos e fontes das cidades”: autor, licença e fonte de cada foto do catálogo, fontes das curiosidades e nota de que o tempo é estimativa de modelo do Open-Meteo.

## Superfícies e movimento

- Superfícies (`.card`, `.journey`, `.banner`, `.next-task`, `.feedback` e os painéis novos): luz diagonal estática do canto superior esquerdo, borda mais clara no topo e à esquerda, sombra discreta. Mesma paleta preto/laranja; sem brilho nem pulsação.
- O skeleton deixou de pulsar. Slots entram uma única vez com opacidade + 4 px em 180 ms; com `prefers-reduced-motion: reduce`, nenhuma animação.
- `forced-colors`: sem gradiente, sem filtro ou máscara na foto (que continua visível, com borda), barras dos gráficos em `CanvasText`.
- Controles com 44 px ou mais; layouts quebram linha até 320 px.

## Verificação feita

- `node --check` em `public/experience-ui.js` e `public/app.js`.
- Smoke test em Node com DOM mínimo e catálogo falso (fora do repositório): escape de nome e crédito, URL `javascript:` e foto externa descartadas, fuso inválido sem erro, perfil desconhecido descartado, quem vê primeiro, resposta atrasada após `unmount` não pinta.
- Sem teste em navegador por este agente: a validação visual e de interação fica com o agente central (Cua).
- `npm run check` não lista `public/experience-ui.js` (o `package.json` não é deste agente); vale incluir.

## Ajustes da integração central

`npm run check` inclui o controlador e o catálogo. Título da evolução é “Nós dois”; habilidade identifica todo o histórico e barras diárias identificam últimos 14 dias. Carimbos de atualização ficam fora dos blocos comparados: dados iguais não recriam fotos ou gráficos. Pedidos forçados do álbum têm sequência própria; resposta antiga não sobrescreve a lista nova. O polling também atualiza os marcos existentes, só repintados quando mudam. Tabela acessível do gráfico fica num wrapper oculto para não causar overflow de tabela em 320 px.

Créditos incluem título da obra, autor, Wikimedia Commons, licença e alterações no arquivo e no app. Links culturais têm altura de 44 px. A curiosidade destacada alterna entre os três fatos da cidade conforme o dia. Clima é atualizado a cada dez minutos enquanto o dashboard está visível.

Após envio com confirmação incerta (rede, 5xx ou conflito), o id não muda, legenda/destino e troca de foto ficam bloqueados; a retomada consulta o álbum por id antes de postar novamente. Rejeição definitiva permite ajustar. A conferência funciona mesmo com a cota cheia. `deliverPhoto` tem testes de confirmação perdida, reenvio original, falha da consulta e rejeição definitiva. Legenda/destino sobrevivem à recarga via sessionStorage; foto/prévia não. Cabeçalhos JPEG/PNG/WebP orientam a redução pelo maior lado em createImageBitmap quando suportado, sem ampliar fotos pequenas; fallback mantém mensagem para formato incompatível.

QA Chrome central: 320×568, 375×667, 390×844, 430×932, 1280×844 sem overflow no dashboard/evolução; CTA48 px clicável. Legenda sobreviveu a84 segundos de polling e navegação; outro perfil teve rascunho próprio. Foto privada renderizou no álbum local dos dois perfis. Seletor automatizado de arquivo foi bloqueado por permissão da extensão do Chrome, então compressão/seleção não foram verificadas de ponta a ponta no navegador. Captura/HEIC/teclado virtual e grandes fotos em Safari iOS precisam de teste nos aparelhos reais. Servidor local recebeu e recuperou foto real e repetiu id sem duplicar; nenhum teste fictício foi enviado em produção.

A finalização também persiste UUID/estado incerto na sessão antes do envio; se houver recarga, a listagem do álbum reconcilia a confirmação. Se ela não for encontrada, solicita a mesma foto novamente e retém o UUID. O polling recupera sozinho confirmação já gravada. JPEG/PNG/WebP têm cabeçalhos de dimensão lidos em até64 KB: bitmap reduz pelo maior lado apenas quando >1600 px, sem upscale. Formatos desconhecidos ou cabeçalho truncado usam fallback, sem inventar dimensões.
