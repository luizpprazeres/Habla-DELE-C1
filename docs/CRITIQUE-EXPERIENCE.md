# Crítica final independente: experiência (cidade do dia, evolução a dois, álbum)

Data: 2026-10-06. Escopo: código final de `public/app.js`, `public/style.css`, `public/experience-ui.js`, `public/spain-cities.js`, `src/experience.js`, `src/worker.js` (gate), `migrations/0006_journey_photos.sql`, contrato 0.4.0 e `private/agents/experience-detector.json`. Lentes: /critique (impeccable) e /design-taste-frontend (só como checagem de tells; o skill é para landing pages e não se aplica à estrutura de uma ferramenta de estudo).

**Limitações.** Ainda não recebi screenshots renderizados. Sem automação de navegador (o Cua é do Codex principal). As medidas de altura em 320×568 são estimativas aritméticas feitas a partir do CSS; o QA geométrico mobile e o teste real de upload ficam com o agente principal. `node --test tests/experience.test.js`: 16/16 passando.

Legenda: **[PROVADO]** = defeito demonstrável pelo código. **[INFERIDO]** = risco visual/de runtime que precisa de confirmação no aparelho.

---

## Achados (por severidade)

### 1. [PROVADO · P1] Foto duplicada para sempre quando a resposta do envio se perde e a legenda é editada
- **Onde:** `public/experience-ui.js:329` (`edited()` gera um id novo depois de qualquer falha), `:385`; `public/app.js:28` (`api()` descarta o status HTTP).
- **Gatilho:** o POST chega ao D1, mas a resposta se perde (rede móvel, aba suspensa). O cliente mostra "Tentar enviar de novo". A pessoa corrige a legenda, `edited()` gera um UUID novo e reenvia.
- **Consequência:** a mesma foto fica gravada duas vezes. Não existe endpoint nem UI de exclusão, então a duplicata ocupa para sempre a cota de 80 fotos e 25 MB e aparece para os dois perfis.
- **Correção cirúrgica:** em `app.js:28`, anexar o status ao erro (`const e=new Error(...);e.status=response.status;throw e`). Em `send()`, gravar `d.rejected = error.status >= 400 && error.status < 500`. Em `edited()`, só gerar um id novo se `d.rejected`. Para falha de rede ou 5xx, antes de gerar um id novo, buscar `/api/photos`: se `items.some(p => p.id === d.id)`, tratar como enviada (toast + limpar o rascunho).

### 2. [PROVADO · P1, veracidade] O título diz "últimos 14 dias", mas as barras por habilidade e o total cobrem todo o histórico
- **Onde:** `public/experience-ui.js:278` (título `Nós dois, últimos 14 dias`), `:291-293` (total e barras); `src/experience.js:111` (`SHARED_TOTALS_SQL` sem filtro de data).
- **Gatilho:** qualquer perfil com prática anterior à janela de 14 dias.
- **Consequência:** "Escrita 37" é lido como prática recente. Isso infla a percepção de ritmo, o que contraria a regra do projeto de não sugerir progresso que não aconteceu.
- **Correção:** trocar o título para `Nós dois` e rotular os gráficos: `Respostas por habilidade (todo o histórico)` em `:292` e `Respostas por dia (últimos 14 dias)` em `:294`.

### 3. [PROVADO · P2, licenças] Créditos CC BY-SA 3.0 sem o título da obra; a adaptação não é indicada em Meu dia
- **Onde:** `public/experience-ui.js:35` (`normalizeCity` descarta `photo.title`), `:199` (crédito em Meu dia), `:433` (Referências). `public/spain-cities.js:4` cita `docs/ESPANHA.md`, que não existe em `docs/`.
- **Gatilho:** três das seis fotos são BY-SA 3.0 (Donostia, Barcelona, Madrid). A §4(c) da 3.0 exige o título quando ele é fornecido, e ele está nos dados.
- **Consequência:** a atribuição fica incompleta. Além disso, o app recorta a foto numa faixa, escurece e aplica fade (`style.css:393`). Isso é uma modificação adicional, e o texto `adaptation` não a descreve.
- **Correção:** incluir `title` em `normalizeCity` e renderizar `“${title}”` antes do autor em `:199` e `:433`. Em `:433`, completar a adaptação com "No app: recorte em faixa, escurecimento e fade." Corrigir a referência de `spain-cities.js:4` para `docs/REFERENCIAS-CIDADES.md`, se for esse o arquivo, ou criar o documento citado.

### 4. [INFERIDO · P1, mobile] Em 320×568, o CTA principal fica no limite da barra fixa
- **Onde:** `public/app.js:59` (foto injetada dentro de `.next-task`, antes do CTA), `public/style.css:392` (`min-height: var(--ph)+26px`), `:487` (`--ph:64px` em telas baixas), `:373` (regra morta: `height:64px` é vencida pelo `min-height` de 90px).
- **Estimativa:** topbar com perfis em linha própria (~129) + respiro (20) + saudação (~78) + painel até o fim do botão (~8+16+90+8+26+8+60+8+48) ≈ **~500 px**. A área útil acima da nav de 61 px é ≈ 507 px. Um título com 3 linhas, o aviso de IA (`app.js:59`) ou a barra do Safari empurram "Começar este treino" para baixo da nav.
- **Correção:** `@media (max-height:600px) and (max-width:759px){.next-task{--ph:40px}.lesson-photo{min-height:var(--ph)}.lesson-photo-label{display:none}}` (o painel da cidade logo abaixo já nomeia a cidade) e remover `style.css:373`. O principal deve validar medindo `getBoundingClientRect().bottom` do `[data-open]` contra o topo da `nav`.

### 5. [PROVADO · P2, estabilidade no polling] A evolução é repintada inteira a cada 60 s, mesmo sem dado novo
- **Onde:** `public/experience-ui.js:278` e `:299` (o carimbo "Atualizado às" fica dentro de `progressHTML`), `:146-152` (`paint` compara o HTML e, com foco dentro, devolve o foco ao título).
- **Gatilho:** qualquer polling ou foco na janela, porque o horário muda e o HTML nunca é igual.
- **Consequência:** `innerHTML` é trocado a cada minuto. Quem está com o foco em "Tentar de novo" volta para o título. O leitor de tela que percorre a tabela oculta perde a posição. Hoje o álbum e o formulário estão protegidos (o formulário nunca é repintado, e isso está correto).
- **Correção:** mover o carimbo para um `<span data-xp-progress-updated>` fora do HTML comparado e atualizá-lo por `textContent`, como já se faz no álbum (`:416`).

### 6. [PROVADO · P2, alvos de toque] Links pequenos e colados no painel da cidade
- **Onde:** `public/experience-ui.js:199` (licença e "Fonte da imagem ↗" na mesma linha de 13 px), `:198` ("página oficial ↗"); `public/style.css:418-419` sem `min-height`. A regra de 44 px (`style.css:319`) mira `.city a`, não `.xp-city`.
- **Consequência:** dois alvos de ~20 px lado a lado em 320 px geram toques errados. Formalmente cabe a exceção "inline" da WCAG 2.5.8, mas no uso real com o polegar é um problema.
- **Correção:** `.photo-credit a,.city-ref-line a{display:inline-flex;align-items:center;min-height:44px}`, com cada link do crédito na própria linha.

### 7. [INFERIDO · P2, upload] Decodificar a foto em resolução cheia pode derrubar a aba no iPhone e apagar o rascunho
- **Onde:** `public/experience-ui.js:93` (`createImageBitmap(file)` sem redimensionar), `:16` (aceita originais de até 40 MB), `:131` (o rascunho só existe em memória).
- **Gatilho:** foto de 48 MP, que vira ~190 MB de RGBA, no Safari iOS com pouca memória.
- **Consequência:** a aba recarrega e a legenda digitada se perde, sem mensagem de erro.
- **Correção:** `createImageBitmap(file,{imageOrientation:'from-image',resizeWidth:1600,resizeQuality:'high'})`, mantendo o fallback atual, e espelhar `caption` e `target` do rascunho em `sessionStorage`. O principal deve confirmar com uma foto real de 48 MP no QA de upload.

---

## Verificado sem defeito (resumo)
- **Rotas privadas:** `/api/photos*` e `/api/spain` só são atendidas depois de `authorized()` (`src/worker.js:104` → `:116`). A imagem sai com `private, no-store`, `nosniff`, `CSP sandbox`, checagem de `Sec-Fetch-Site` e validação de UUID. A cota é atômica no INSERT e o envio é idempotente por id.
- **Tempo:** rótulo "Tempo estimado · Open-Meteo", hora da estimativa no fuso local, aviso de dado desatualizado e "Indisponível" sem valor inventado. O relógio usa `Intl` em Europe/Madrid.
- **Contraste (calculado):** laranja `#ff7a1a` sobre `#050505` ≈ 7,8:1. `--muted` ≈ 6:1 no fundo e ≈ 5:1 na luz BRIX. `--sub` sobre `--accent-soft` ≈ 8:1. A foto não leva texto por cima; o rótulo fica fora da imagem.
- **Movimento:** só `xp-in` de 180 ms (opacity + 4 px), uma vez por slot, anulado por `prefers-reduced-motion`. A luz BRIX é estática. Sem confete, parallax ou carrossel.
- **Tom:** sem ranking. "Cada perfil tem a própria escala" e o ritmo semanal não punem pausas.

## Detector determinístico
`experience-detector.json`: 9 avisos. **broken-image** em `experience-ui.js:307` é **falso positivo** (a figura fica `hidden` e o `src` é definido em `syncForm`). **side-tab** (8×) aponta faixas de 3 px em `.notice.action-error` e `.feedback` (`style.css:166,173,174,283,388`). São faixas anteriores a esta entrega e semânticas (erro/feedback), então são um tell leve, não um bloqueio. Opcional: trocar a faixa do erro por um ícone e um texto em `--danger`. Nenhum travessão longo em texto visível.

---

## Ações críticas (ordem)
1. Corrigir a duplicação de foto: status no erro de `api()` e reutilizar o id em falhas de rede (`experience-ui.js:329`, `app.js:28`).
2. Rotular honestamente as janelas de tempo da evolução (`experience-ui.js:278,292,294`).
3. Completar a atribuição BY-SA 3.0 (título e adaptação no app) e corrigir a referência a `docs/ESPANHA.md`.
4. Medir o CTA em 320×568 e aplicar a faixa de foto compacta em telas baixas (`style.css:373,487`).
5. Tirar o carimbo de horário do HTML repintado da evolução (`experience-ui.js:278,299`).
6. Aumentar para 44 px os links do crédito e da referência e decodificar a foto já reduzida no upload.

---

## Rechecagem final (regressão pós-correções), 2026-10-06

Escopo: código atual de `public/experience-ui.js`, `public/app.js`, `public/style.css`, `src/experience.js` e `tests/photo-delivery.test.js`, `docs/ESPANHA.md`, o detector e as screenshots locais `local-home-390.png` e `local-progress-1280.png` (dados sintéticos). Rodei `npm test`: **92/92 passando**. Não usei navegador. As medidas geométricas são as do Cua central.

### Achados anteriores: status
| # | Status | Evidência |
|---|---|---|
| 1 Duplicata | **Resolvido** | `deliverPhoto` (`experience-ui.js:89`) consulta o id antes de repetir o envio. O id só muda com outra foto (`:352`, `:387`). Legenda e destino ficam travados enquanto o resultado é incerto (`:373`). A recuperação funciona mesmo com o álbum cheio (`:372`). O teste cobre o caso "gravou, mas a resposta se perdeu". |
| 2 Janela de tempo | **Resolvido** | "todo o histórico" e "últimos 14 dias" aparecem em `:311` e `:313`, e a screenshot de 1280 confirma. |
| 3 Licenças | **Resolvido** | Os créditos (`:457`) trazem título original, autor, licença e as modificações (as do arquivo e as do app). Meu dia mostra autor e licença e aponta para os créditos. Todas as fotos têm `adaptation`. `docs/ESPANHA.md` existe. |
| 4 CTA 320×568 | **Resolvido (medido)** | A estimativa inferida foi substituída pela medição: o CTA termina em 472 px e a nav começa em 508 px, com toque real e altura de 48 px. Status e incentivo ficam depois do CTA (`style.css:378-379`). |
| 5 Repintura por polling | **Resolvido** | Os carimbos de hora estão fora do HTML comparado (`:293-297`, `:439-440`), e o álbum ganhou guarda de sequência (`:420-430`). |
| 6 Alvos de toque | **Resolvido** | `style.css:416` e `:502` garantem 44 px. A tabela oculta tem wrapper, então não há overflow. |
| 7 Decodificação no iPhone | **Mitigado, ainda INFERIDO** | Arquivos acima de 1 MB são decodificados já reduzidos e o texto do rascunho vai para `sessionStorage`. Falta um teste físico no Safari iOS com foto de 48 MP. |

### Defeitos remanescentes (só P3, nenhum P0/P1/P2)
1. **[P3] Upscale introduzido pela correção 7** (`experience-ui.js:106`). `resizeWidth:1600` também se aplica a arquivos com mais de 1 MB e largura menor que 1600. Exemplo: um PNG de 1080×1350 e 2 MB vira bitmap de 1600×2000 e é salvo como 1280×1600. O resultado tem pixels interpolados, gasta mais do orçamento de 600 KB e a prévia anuncia uma resolução maior que a original. **Correção:** ler as dimensões no cabeçalho (`file.slice`, PNG IHDR ou JPEG SOF) e só redimensionar quando `largura > 1600`. Alternativa mais simples: subir o limiar para algo como 4 MB.
2. **[P3] O estado incerto não sobrevive a um reload** (`:337-341`, `:144`). Só legenda e destino vão para `sessionStorage`; `id` e `uncertain` ficam na memória. Se a pessoa recarregar depois de perder a resposta e escolher a mesma foto, o id é novo. Como não há exclusão, a duplicata fica para sempre. Isso exige perda de resposta e reload na sequência, por isso é raro. **Correção:** persistir `{id, uncertain}` junto do texto e, na montagem, reconciliar com `/api/photos`. Ainda no mesmo tema: quando `refreshAlbum` (`:425`) já traz `d.id`, limpar o rascunho e avisar "Esta foto já estava no álbum" sem esperar novo toque.
3. **[P3] Regra morta** `style.css:373` (`.lesson-photo{height:64px}`), vencida pelo `min-height` de `:392`. Pode ser removida.

### Visual (screenshots)
- **390, Meu dia:** base preta, um único CTA laranja dominante e foto real de La Concha com fade para a luz BRIX quente e estática do painel. Não há texto sobre a foto, o rótulo fica fora da imagem e há uma tarefa por tela. O tom é maduro, sem streak nem promessa. A hierarquia é limpa.
- **1280, Evolução:** as escalas são honestas e rotuladas, "Cada perfil tem a própria escala", sem ranking e com o carimbo discreto. O gráfico de 14 dias com um único dia ativo fica esparso, mas é verdadeiro.
- **Detector:** sem mudança. `broken-image` continua falso positivo. Os `side-tab` são anteriores à entrega e semânticos (tell leve, opcional).

**Veredito:** os 6 defeitos PROVADOS foram corrigidos e o inferido sobre o CTA foi resolvido por medição. Sobram 3 itens P3 e o teste físico de upload no Safari iOS. Nada bloqueia a publicação.

### Encerramento central após a rechecagem

Os três P3 foram tratados: a redução lê dimensões de JPEG/PNG/WebP em até64 KB e só reduz o maior lado quando excede1600 px; o UUID e a confirmação pendente sobrevivem na sessão do navegador, reconciliando com o álbum após recarga (se não encontrado, pede escolher novamente a mesma foto e mantém o UUID); a regra CSS morta foi removida. Polling recupera automaticamente uma confirmação já presente no álbum. Casos de dimensão, truncamento e confirmação perdida entram nos94 testes que passam. O teste físico de grande foto/HEIC/Safari continua pendente, e não é alegado como realizado.
