# API da experiência compartilhada (contrato 0.4.0)

Módulo: `src/experience.js`. Migração: `migrations/0006_journey_photos.sql`. Testes: `tests/experience.test.js`.

Todas as rotas abaixo passam pelo mesmo gate do worker: verificação de `Origin` em métodos diferentes de `GET` e cookie de sessão (`dele_session`) antes de qualquer leitura. Nenhuma resposta inclui respostas dos alunos, correções, gabaritos, áudio ou payload de tarefas.

O catálogo de cidades vem de `public/spain-cities.js` (`SPAIN_CITIES`, `cityForDay`), o mesmo módulo que a UI importa. O worker o injeta em `experienceRoute(request, env, { cities, cityForDay })`; os testes usam um catálogo fixo próprio.

## `GET /api/spain?city=ID`

- `city` opcional; precisa ser um `id` do catálogo, senão `400 { message: 'Cidade fora do catálogo.' }`.
- Sem `city`, usa `cityForDay(dia de hoje em America/Maceio)`; os dois perfis veem a mesma cidade no mesmo dia.

```json
{ "cityId": "donostia",
  "weather": { "temperatureC": 17.4, "code": 3, "observedAt": "2026-10-07T14:45:00.000Z",
               "fetchedAt": "2026-10-07T15:00:00.000Z", "available": true, "stale": false,
               "source": "Open-Meteo", "sourceUrl": "https://open-meteo.com/" } }
```

- Fonte: Open-Meteo `/v1/forecast?latitude=…&longitude=…&current=temperature_2m,weather_code&timezone=UTC` (uso pessoal, não comercial, sem chave). É **tempo estimado por modelo**, não leitura instantânea de estação; a UI deve rotular como “Tempo estimado · Open-Meteo” e mostrar a hora local de Madri separada, calculada no cliente com `Intl` (`Europe/Madrid`, com horário de verão).
- `observedAt`: horário do intervalo do modelo; o Open-Meteo devolve UTC sem sufixo e o worker acrescenta `Z`.
- `stale: true` quando `observedAt` tem mais de 60 minutos no momento da resposta.
- Falha (HTTP não-2xx, timeout de 5 s, JSON inválido, campo ausente/não numérico): `available: false`, `temperatureC`, `code` e `observedAt` `null`. Nunca zero ou valor inventado. Falhas não entram no cache.
- Cache: `caches.default`, 10 minutos, chave sintética por cidade (`https://weather-cache.habla.invalid/open-meteo/v1/{id}`). Guarda **apenas** `{cityId, temperatureC, code, observedAt, fetchedAt}`; nada de sessão ou perfil. A resposta da API ao cliente é `no-store`.
- Privacidade: a requisição ao Open-Meteo leva só coordenadas da cidade e o cabeçalho `Accept`; nenhum cookie, perfil ou cabeçalho do cliente.

## `GET /api/shared-progress`

Sem parâmetro de perfil; devolve sempre `luiz` e `alana`, nesta ordem.

```json
{ "generatedAt": "…", "timeZone": "America/Maceio",
  "period": { "start": "2026-09-24", "end": "2026-10-07", "days": 14 },
  "members": [{ "id": "luiz", "name": "Luiz", "totalAttempts": 3,
    "skills": [{ "kind": "reading", "count": 1 }, { "kind": "listening", "count": 0 }, { "kind": "writing", "count": 2 }, { "kind": "speaking", "count": 0 }],
    "activity": [{ "day": "2026-09-24", "attempts": 0, "distinctTasks": 0 }, "… 14 dias, do mais antigo ao mais recente"],
    "rhythm": { "activeDaysThisWeek": 1, "lastPracticedAt": "2026-10-06T13:00:00.000Z" } }] }
```

- `totalAttempts`, `skills` e `lastPracticedAt`: histórico completo, **incluindo tarefas aposentadas** (sem filtro `retired_at`).
- `activity`: 14 dias corridos terminando hoje em Maceió, dias zerados incluídos; `distinctTasks` = tarefas diferentes respondidas no dia.
- `activeDaysThisWeek`: dias distintos com resposta na semana de segunda a domingo (Maceió), mesma semana da jornada. Não há streak nem perda de sequência.
- SQL só lê `profile_id`, `task_id`, `kind` e `created_at`; datas entram por `bind`.

## `GET /api/photos`

```json
{ "items": [{ "id": "uuid", "profile": "luiz", "target": "both", "caption": "…",
              "createdAt": "…", "url": "/api/photos/uuid/image", "bytes": 512345 }],
  "storage": { "usedBytes": 512345, "maxBytes": 25000000, "maxPhotoBytes": 700000, "maxCount": 80 } }
```

Mais recentes primeiro, no máximo 80. A consulta não lê o blob. `profile` é quem enviou; `target` (`luiz`, `alana`, `both`) marca foto conjunta ou incentivo ao parceiro.

## `POST /api/photos`

`multipart/form-data` com `id` (UUID minúsculo, gerado no cliente e reutilizado em retentativas), `profile`, `target`, `caption` (até 280 caracteres, opcional) e `photo` (arquivo).

- O corpo é lido em streaming com teto (700 000 + 32 KiB de folga do multipart) **antes** de `formData()`; `Content-Length` acima do teto é recusado sem leitura.
- Imagem: até 700 000 bytes, JPEG/PNG/WebP verificado pelos bytes mágicos; se o arquivo declarar tipo, ele precisa coincidir.
- O servidor não remove EXIF: a remoção de EXIF/GPS acontece no canvas do cliente (redimensiona para 1600 px e comprime em JPEG até ~600 KB).
- Cotas atômicas no próprio `INSERT … SELECT … WHERE (count)<80 AND (soma)+bytes<=25 MB ON CONFLICT(id) DO NOTHING RETURNING`, seguro sob envios simultâneos.
- Respostas:
  - `201 { item, created: true, storage }` — gravado.
  - `200 { item, created: false, storage }` — mesmo `id` já gravado com os mesmos dados (retentativa).
  - `409` — mesmo `id` com perfil, alvo, legenda ou tamanho diferentes.
  - `413` — foto acima de 700 KB, ou álbum cheio (mensagem diz se foram as 80 fotos ou os 25 MB).
  - `415` — formato não suportado ou corpo que não é multipart.
  - `400` — id, perfil, alvo ou legenda inválidos.
  - `503` — tabela ainda não migrada (“O álbum ainda não foi ativado…”); o restante do app segue normal.

Não há rota de exclusão nesta versão.

## `GET /api/photos/:id/image`

Binário com o `Content-Type` gravado, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`. Recusa `Sec-Fetch-Site` `cross-site`/`same-site` (403). As fotos nunca vão para `public/` nem para serviços externos.

## `GET /api/export`

Ganha `photos` (mesmos metadados de `/api/photos`, com `url`) e `photoNotice`; nenhum binário no arquivo. Antes da migração 0006, `photos` é `[]` e o restante da exportação não muda.

## Migração

```
npm run db:local                         # local
wrangler d1 migrations apply DB --remote # produção (feito pelo agente central)
```

## Verificação

```
npm test
npm run check
```

Integração central: id repetido também compara MIME e bytes completos da foto (não só tamanho), recusando conteúdo diferente com409. Exportação retorna lista vazia apenas quando a tabela ainda não existe; outra falha de banco não é omitida silenciosamente. Upload/recuperação/idempotência foram verificados via HTTP real contra Wrangler/D1 local com fotografia WebP; frontend usa JPEG comprimido. Nenhuma foto de teste foi gravada em produção.
