import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
 experienceRoute, progressPeriod, buildSharedProgress, loadSharedProgress, resolveCity, cityWeather, weatherUrl, parseOpenMeteo,
 sniffImage, normalizeCaption, readBounded, savePhoto, exportPhotos, PHOTO_LIMITS, PHOTO_INSERT_SQL, SHARED_TOTALS_SQL, SHARED_RECENT_SQL, WEATHER
} from '../src/experience.js';

// Quarta, 7 de outubro de 2026, meio-dia em Maceió (UTC-3); a semana começa em 05/10.
const NOW = new Date('2026-10-07T15:00:00.000Z');
const SECRET_ANSWER = 'RESPOSTA-PRIVADA-DO-ALUNO';
const SECRET_FEEDBACK = 'GABARITO-E-CORRECAO-PRIVADOS';
const ORIGIN = 'https://habla.test';
const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort();

// Catálogo de teste injetado; o módulo real de cidades é de outro agente.
const CATALOG = {
 cities: [
  { id: 'donostia', name: 'Donostia', timezone: 'Europe/Madrid', latitude: 43.3183, longitude: -1.9812 },
  { id: 'bilbao', name: 'Bilbao', timezone: 'Europe/Madrid', latitude: 43.263, longitude: -2.935 }
 ],
 cityForDay: day => (day === '2026-10-06' ? { id: 'donostia' } : { id: 'bilbao' })
};

// D1 mínimo sobre SQLite real: as migrações e o SQL de produção rodam sem alteração.
function createDB({ upTo = Infinity } = {}) {
 const sqlite = new DatabaseSync(':memory:');
 for (const file of MIGRATIONS.filter(f => Number(f.slice(0, 4)) <= upTo)) sqlite.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
 const log = [];
 const convert = v => (v instanceof ArrayBuffer ? new Uint8Array(v) : v);
 return {
  sqlite, log,
  prepare(sql) {
   let args = [];
   const run = fn => { log.push({ sql, args }); return Promise.resolve().then(() => fn(sqlite.prepare(sql))); };
   const statement = {
    bind(...values) { args = values.map(convert); return statement; },
    first: () => run(s => s.get(...args) ?? null),
    all: () => run(s => ({ results: s.all(...args) })),
    run: () => run(s => { s.run(...args); return { success: true }; })
   };
   return statement;
  }
 };
}

function seedTask(db, id, profile, kind, retired = false) {
 db.sqlite.prepare('INSERT INTO tasks(id,profile_id,kind,title,payload,created_at,retired_at) VALUES (?,?,?,?,?,?,?)')
  .run(id, profile, kind, 'Tarea ' + id, JSON.stringify({ questions: [{ correctIndex: 1, explanation: SECRET_FEEDBACK }] }), '2026-08-01T12:00:00.000Z', retired ? '2026-09-01T12:00:00.000Z' : null);
}
let seq = 0;
function seedAttempt(db, task, profile, createdAt) {
 db.sqlite.prepare('INSERT INTO attempts(id,task_id,profile_id,answer,feedback,created_at) VALUES (?,?,?,?,?,?)')
  .run(`att-${++seq}`, task, profile, SECRET_ANSWER, JSON.stringify({ summary: SECRET_FEEDBACK }), createdAt);
}

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const jpeg = (size = 2048, fill = 7) => { const b = new Uint8Array(size).fill(fill); b.set([0xff, 0xd8, 0xff, 0xe0]); return b; };
const png = (size = 2048) => { const b = new Uint8Array(size); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); return b; };
const webp = (size = 2048) => { const b = new Uint8Array(size); b.set([...'RIFF'].map(c => c.charCodeAt(0))); b.set([...'WEBP'].map(c => c.charCodeAt(0)), 8); return b; };

function photoRequest({ id = uuid(1), profile = 'luiz', target = 'both', caption = 'Na Concha, revisando conectores.', bytes = jpeg(), type = 'image/jpeg', headers = {} } = {}) {
 const form = new FormData();
 if (id !== null) form.append('id', id);
 if (profile !== null) form.append('profile', profile);
 if (target !== null) form.append('target', target);
 if (caption !== null) form.append('caption', caption);
 if (bytes !== null) form.append('photo', new Blob([bytes], { type }), 'foto.jpg');
 return new Request(`${ORIGIN}/api/photos`, { method: 'POST', body: form, headers: { Origin: ORIGIN, ...headers } });
}
const get = (path, headers = {}) => new Request(ORIGIN + path, { headers: { Cookie: 'dele_session=' + 'a'.repeat(64), ...headers } });
const route = (request, db, deps = {}) => experienceRoute(request, { DB: db }, CATALOG, { cache: null, now: NOW, ...deps });

// ---------- Progresso compartilhado ----------

test('janela de 14 dias e semana seguem o calendário de Maceió, inclusive na virada UTC', () => {
 assert.deepEqual(progressPeriod(NOW), { start: '2026-09-24', end: '2026-10-07', days: 14 });
 // 02:59Z de quinta ainda é quarta 23:59 em Maceió.
 assert.equal(progressPeriod(new Date('2026-10-08T02:59:00.000Z')).end, '2026-10-07');
 assert.equal(progressPeriod(new Date('2026-10-08T03:00:00.000Z')).end, '2026-10-08');
 const progress = buildSharedProgress({
  now: NOW,
  recent: [
   { profile_id: 'luiz', task_id: 't1', created_at: '2026-10-05T02:59:00.000Z' }, // domingo 04/10 23:59 local: fora da semana
   { profile_id: 'luiz', task_id: 't1', created_at: '2026-10-05T03:00:00.000Z' }, // segunda 05/10 00:00 local
   { profile_id: 'luiz', task_id: 't2', created_at: '2026-10-05T20:00:00.000Z' },
   { profile_id: 'luiz', task_id: 't2', created_at: '2026-10-07T14:00:00.000Z' },
   { profile_id: 'luiz', task_id: 't9', created_at: '2026-09-24T02:00:00.000Z' } // 23/09 local: antes da janela
  ]
 });
 const luiz = progress.members.find(m => m.id === 'luiz');
 assert.equal(progress.timeZone, 'America/Maceio');
 assert.equal(luiz.activity.length, 14);
 assert.equal(luiz.activity[0].day, '2026-09-24');
 assert.equal(luiz.activity.at(-1).day, '2026-10-07');
 assert.deepEqual(luiz.activity.find(d => d.day === '2026-10-04'), { day: '2026-10-04', attempts: 1, distinctTasks: 1 });
 assert.deepEqual(luiz.activity.find(d => d.day === '2026-10-05'), { day: '2026-10-05', attempts: 2, distinctTasks: 2 });
 assert.equal(luiz.activity.reduce((n, d) => n + d.attempts, 0), 4, 'tentativa de 23/09 local não entra na janela');
 assert.equal(luiz.rhythm.activeDaysThisWeek, 2, 'segunda e quarta; domingo pertence à semana anterior');
});

test('progresso compartilhado traz os dois perfis, dias zerados e totais do histórico completo sem dados privados', async () => {
 const db = createDB();
 seedTask(db, 'old-writing', 'luiz', 'writing', true); // aposentada continua contando
 seedTask(db, 'read', 'luiz', 'reading');
 seedAttempt(db, 'old-writing', 'luiz', '2026-03-01T12:00:00.000Z');
 seedAttempt(db, 'old-writing', 'luiz', '2026-03-02T12:00:00.000Z');
 seedAttempt(db, 'read', 'luiz', '2026-10-06T13:00:00.000Z');
 const response = await route(get('/api/shared-progress'), db);
 assert.equal(response.status, 200);
 const text = await response.text(), body = JSON.parse(text);
 assert.ok(!text.includes(SECRET_ANSWER) && !text.includes(SECRET_FEEDBACK), 'sem respostas, correções ou gabaritos');
 assert.deepEqual(body.members.map(m => m.id), ['luiz', 'alana']);
 const [luiz, alana] = body.members;
 assert.equal(luiz.totalAttempts, 3);
 assert.deepEqual(luiz.skills, [{ kind: 'reading', count: 1 }, { kind: 'listening', count: 0 }, { kind: 'writing', count: 2 }, { kind: 'speaking', count: 0 }]);
 assert.equal(luiz.rhythm.lastPracticedAt, '2026-10-06T13:00:00.000Z');
 assert.equal(luiz.rhythm.activeDaysThisWeek, 1);
 assert.equal(alana.totalAttempts, 0);
 assert.equal(alana.activity.length, 14);
 assert.ok(alana.activity.every(d => d.attempts === 0 && d.distinctTasks === 0));
 assert.deepEqual(alana.rhythm, { activeDaysThisWeek: 0, lastPracticedAt: null });
 assert.ok(!/answer|feedback|payload/.test(SHARED_TOTALS_SQL + SHARED_RECENT_SQL), 'SQL lê só metadados');
 assert.ok(!/retired_at/.test(SHARED_TOTALS_SQL + SHARED_RECENT_SQL), 'sem filtro de tarefas aposentadas');
 assert.deepEqual(db.log.find(e => e.sql === SHARED_RECENT_SQL).args, ['2026-09-23T00:00:00.000Z']);
 assert.deepEqual(Object.keys(body).sort(), ['generatedAt', 'members', 'period', 'timeZone']);
 const loaded = await loadSharedProgress(db, NOW);
 assert.equal(loaded.generatedAt, NOW.toISOString());
});

// ---------- Tempo estimado ----------

function upstream(body, { ok = true, status = 200 } = {}) {
 const calls = [];
 const fetchImpl = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status: ok ? status : 503 }); };
 return { calls, fetchImpl };
}
function memoryCache() {
 const store = new Map();
 return { store, async match(req) { const hit = store.get(req.url); return hit ? new Response(hit.body, { headers: hit.headers }) : undefined; }, async put(req, res) { store.set(req.url, { body: await res.text(), headers: Object.fromEntries(res.headers) }); } };
}
const GOOD = { current: { time: '2026-10-07T14:45', interval: 900, temperature_2m: 17.4, weather_code: 3 } };

test('cidade padrão segue o dia de Maceió; só ids do catálogo são aceitos', async () => {
 // 02:00Z de 07/10 ainda é 06/10 em Maceió.
 assert.equal(resolveCity(CATALOG, null, new Date('2026-10-07T02:00:00.000Z')).id, 'donostia');
 assert.equal(resolveCity(CATALOG, null, NOW).id, 'bilbao');
 const db = createDB(), { fetchImpl } = upstream(GOOD);
 const bad = await route(get('/api/spain?city=../../etc'), db, { fetchImpl });
 assert.equal(bad.status, 400);
 assert.equal((await bad.json()).message, 'Cidade fora do catálogo.');
 const ok = await route(get('/api/spain?city=donostia'), db, { fetchImpl });
 assert.equal((await ok.json()).cityId, 'donostia');
});

test('tempo estimado: hora UTC recebe Z, fonte identificada e upstream sem dados do usuário', async () => {
 const { calls, fetchImpl } = upstream(GOOD);
 const request = get('/api/spain?city=donostia', { 'X-Profile': 'luiz' });
 const response = await route(request, createDB(), { fetchImpl });
 const body = await response.json();
 assert.deepEqual(body, { cityId: 'donostia', weather: { temperatureC: 17.4, code: 3, observedAt: '2026-10-07T14:45:00.000Z', fetchedAt: NOW.toISOString(), available: true, stale: false, source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/' } });
 assert.equal(calls.length, 1);
 const url = new URL(calls[0].url);
 assert.equal(url.origin + url.pathname, 'https://api.open-meteo.com/v1/forecast');
 assert.deepEqual([...url.searchParams.keys()].sort(), ['current', 'latitude', 'longitude', 'timezone']);
 assert.equal(url.searchParams.get('current'), 'temperature_2m,weather_code');
 assert.equal(url.searchParams.get('timezone'), 'UTC');
 const sent = new Headers(calls[0].init.headers);
 assert.equal(sent.get('cookie'), null, 'cookie de sessão não vai ao Open-Meteo');
 assert.equal(sent.get('x-profile'), null);
 assert.ok(calls[0].init.signal instanceof AbortSignal, 'requisição com timeout');
 assert.equal(weatherUrl(CATALOG.cities[0]), calls[0].url);
});

test('falha, timeout ou dado incompleto viram indisponível com nulos, nunca zero', async () => {
 const unavailable = { temperatureC: null, code: null, observedAt: null, fetchedAt: NOW.toISOString(), available: false, stale: false, source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/' };
 const city = CATALOG.cities[0];
 assert.deepEqual(await cityWeather(city, { ...upstream(GOOD, { ok: false }), now: NOW }), unavailable);
 assert.deepEqual(await cityWeather(city, { fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); }, now: NOW }), unavailable);
 assert.deepEqual(await cityWeather(city, { fetchImpl: async () => new Response('<html>', { status: 200 }), now: NOW }), unavailable);
 for (const current of [{ time: '2026-10-07T14:45', weather_code: 3 }, { time: '2026-10-07T14:45', temperature_2m: null, weather_code: 3 }, { time: 'ontem', temperature_2m: 10, weather_code: 3 }, { time: '2026-10-07T14:45', temperature_2m: 10, weather_code: 3.5 }])
  assert.equal(parseOpenMeteo({ current }), null, JSON.stringify(current));
 assert.deepEqual(parseOpenMeteo({ current: { time: '2026-10-07T14:45', temperature_2m: 0, weather_code: 0 } }), { temperatureC: 0, code: 0, observedAt: '2026-10-07T14:45:00.000Z' }, 'zero real é aceito');
});

test('cache de 10 minutos guarda só o dado meteorológico e marca dado antigo como stale', async () => {
 const cache = memoryCache(), { calls, fetchImpl } = upstream(GOOD), city = CATALOG.cities[0];
 const first = await cityWeather(city, { fetchImpl, cache, now: NOW });
 const second = await cityWeather(city, { fetchImpl, cache, now: new Date(NOW.getTime() + 5 * 60000) });
 assert.equal(calls.length, 1, 'segunda leitura vem do cache');
 assert.deepEqual(second, first);
 const [[key, entry]] = cache.store;
 assert.match(key, /\/donostia$/);
 assert.equal(entry.headers['cache-control'], `public, max-age=${WEATHER.ttlSeconds}`);
 assert.deepEqual(Object.keys(JSON.parse(entry.body)).sort(), ['cityId', 'code', 'fetchedAt', 'observedAt', 'temperatureC']);
 const late = await cityWeather(city, { fetchImpl, cache, now: new Date(Date.parse(GOOD.current.time + 'Z') + 61 * 60000) });
 assert.equal(late.stale, true);
 assert.equal(late.available, true);
 const failing = memoryCache();
 await cityWeather(city, { ...upstream(GOOD, { ok: false }), cache: failing, now: NOW });
 assert.equal(failing.store.size, 0, 'falha não é guardada em cache');
});

// ---------- Fotos ----------

test('envio de foto válido é salvo e listado sem binário; reenvio do mesmo id é idempotente', async () => {
 const db = createDB();
 const created = await route(photoRequest(), db);
 assert.equal(created.status, 201);
 const result = await created.json();
 assert.deepEqual(result.item, { id: uuid(1), profile: 'luiz', target: 'both', caption: 'Na Concha, revisando conectores.', createdAt: NOW.toISOString(), url: `/api/photos/${uuid(1)}/image`, bytes: 2048 });
 assert.equal(result.created, true);
 const replay = await route(photoRequest(), db);
 assert.equal(replay.status, 200);
 assert.equal((await replay.json()).created, false);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM journey_photos').get().n, 1);
 const conflict = await route(photoRequest({ caption: 'Outra legenda' }), db);
 assert.equal(conflict.status, 409);
 await route(photoRequest({ id: uuid(2), profile: 'alana', target: 'luiz', caption: '', bytes: png(), type: 'image/png' }), db, { now: new Date(NOW.getTime() + 1000) });
 const list = await (await route(get('/api/photos'), db)).json();
 assert.deepEqual(list.items.map(i => i.id), [uuid(2), uuid(1)], 'mais recentes primeiro');
 assert.deepEqual(list.storage, { usedBytes: 4096, maxBytes: 25_000_000, maxPhotoBytes: 700_000, maxCount: 80 });
 assert.ok(list.items.every(i => !('data' in i) && !('mime' in i)));
 assert.ok(!db.log.some(e => /SELECT[^]*\bdata\b[^]*FROM journey_photos ORDER/.test(e.sql)), 'listagem não lê blobs');
});

test('validação de id, perfil, alvo, legenda e tipo real da imagem', async () => {
 const db = createDB();
 const cases = [
  [{ id: 'nao-uuid' }, 400], [{ id: 'ABCDEF00-0000-4000-8000-000000000001' }, 400], [{ profile: 'outro' }, 400], [{ profile: null }, 400],
  [{ target: 'todos' }, 400], [{ caption: 'x'.repeat(281) }, 400], [{ caption: 'oi\u0000' }, 400], [{ bytes: null }, 400],
  [{ bytes: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'.padEnd(200)), type: 'image/jpeg' }, 415],
  [{ bytes: png(), type: 'image/jpeg' }, 415], [{ bytes: jpeg(8) }, 400]
 ];
 for (const [input, status] of cases) {
  const response = await route(photoRequest(input), db);
  assert.equal(response.status, status, JSON.stringify(Object.keys(input)) + ' ' + (await response.clone().text()));
  assert.ok((await response.json()).message);
 }
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM journey_photos').get().n, 0);
 assert.equal(normalizeCaption('  Ñandú, acentos e emoji 🌊  '), 'Ñandú, acentos e emoji 🌊');
 assert.equal(normalizeCaption('🌊'.repeat(280)).length, 560, '280 caracteres contados como pontos de código');
 assert.equal(sniffImage(webp()), 'image/webp');
 const ok = await route(photoRequest({ bytes: webp(), type: 'image/webp' }), db);
 assert.equal(ok.status, 201);
 const json = await route(new Request(`${ORIGIN}/api/photos`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }), db);
 assert.equal(json.status, 415);
});

test('corpo é lido com limite antes do parse do formulário', async () => {
 const declared = { headers: new Headers({ 'Content-Length': '99999999' }), body: { getReader() { throw new Error('não deveria ler'); } } };
 await assert.rejects(readBounded(declared, 1000), { status: 413 });
 let pulled = 0, cancelled = false;
 const stream = new ReadableStream({ pull(controller) { pulled++; controller.enqueue(new Uint8Array(64 * 1024)); }, cancel() { cancelled = true; } });
 await assert.rejects(readBounded({ headers: new Headers(), body: stream }, PHOTO_LIMITS.maxPhotoBytes + 32768), { status: 413 });
 assert.ok(cancelled, 'leitura cancelada ao estourar');
 assert.ok(pulled <= 14, `leu ${pulled} blocos de 64 KB`);
 const big = await route(photoRequest({ bytes: jpeg(PHOTO_LIMITS.maxPhotoBytes + 1) }), createDB());
 assert.equal(big.status, 413);
 const exact = await route(photoRequest({ bytes: jpeg(PHOTO_LIMITS.maxPhotoBytes) }), createDB());
 assert.equal(exact.status, 201, '700000 bytes exatos são aceitos');
});

test('cotas de 80 fotos e 25 MB são aplicadas no próprio INSERT, sem contar antes', async () => {
 assert.match(PHOTO_INSERT_SQL, /^INSERT INTO journey_photos[^]*SELECT[^]*WHERE \(SELECT COUNT\(\*\) FROM journey_photos\)<\? AND \(SELECT COALESCE\(SUM\(bytes\),0\) FROM journey_photos\)\+\?<=\?[^]*ON CONFLICT\(id\) DO NOTHING RETURNING/);
 const db = createDB();
 const insert = db.sqlite.prepare('INSERT INTO journey_photos(id,profile_id,target,caption,mime,bytes,data,created_at) VALUES (?,?,?,?,?,?,?,?)');
 for (let i = 0; i < 79; i++) insert.run(uuid(100 + i), 'luiz', 'both', '', 'image/jpeg', 16, jpeg(16), `2026-10-01T00:00:${String(i % 60).padStart(2, '0')}.000Z`);
 // Dois envios simultâneos disputando a última vaga: só um entra.
 const results = await Promise.all([route(photoRequest({ id: uuid(1) }), db), route(photoRequest({ id: uuid(2), profile: 'alana' }), db)]);
 assert.deepEqual(results.map(r => r.status).sort(), [201, 413]);
 const refused = results.find(r => r.status === 413);
 assert.match((await refused.json()).message, /limite de 80 fotos/);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM journey_photos').get().n, 80);
 const list = await (await route(get('/api/photos'), db)).json();
 assert.equal(list.items.length, 80);

 const bytesDb = createDB();
 const filler = new Uint8Array(650_000); filler.set([0xff, 0xd8, 0xff]);
 for (let i = 0; i < 38; i++) bytesDb.sqlite.prepare('INSERT INTO journey_photos(id,profile_id,target,caption,mime,bytes,data) VALUES (?,?,?,?,?,?,?)').run(uuid(500 + i), 'alana', 'both', '', 'image/jpeg', filler.length, filler);
 const used = 38 * 650_000; // 24,7 MB
 const tooBig = await route(photoRequest({ bytes: jpeg(PHOTO_LIMITS.maxBytes - used + 1) }), bytesDb);
 assert.equal(tooBig.status, 413);
 assert.match((await tooBig.json()).message, /25 MB/);
 const fits = await route(photoRequest({ bytes: jpeg(PHOTO_LIMITS.maxBytes - used) }), bytesDb);
 assert.equal(fits.status, 201, 'cabe exatamente no total');
 await assert.rejects(savePhoto(bytesDb, { id: uuid(3), profile: 'luiz', target: 'both', caption: '', mime: 'image/jpeg', bytes: jpeg(16) }, NOW), { status: 413 });
});

test('imagem é servida com tipo correto, privada, sem cache e só para a mesma origem', async () => {
 const db = createDB(), bytes = png(3000);
 await route(photoRequest({ bytes, type: 'image/png' }), db);
 const response = await route(get(`/api/photos/${uuid(1)}/image`, { 'Sec-Fetch-Site': 'same-origin' }), db);
 assert.equal(response.status, 200);
 assert.equal(response.headers.get('Content-Type'), 'image/png');
 assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
 assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
 assert.equal((await route(get(`/api/photos/${uuid(1)}/image`, { 'Sec-Fetch-Site': 'cross-site' }), db)).status, 403);
 assert.equal((await route(get(`/api/photos/${uuid(9)}/image`), db)).status, 404);
 assert.equal((await route(get('/api/photos/00000000-0000-4000-8000-00000000000g/image'), db)), null, 'id fora do padrão não casa a rota');
});

test('antes da migração 0006: álbum responde erro claro e exportação segue com lista vazia', async () => {
 const db = createDB({ upTo: 5 });
 const list = await route(get('/api/photos'), db);
 assert.equal(list.status, 503);
 assert.match((await list.json()).message, /álbum ainda não foi ativado/);
 assert.equal((await route(photoRequest(), db)).status, 503);
 assert.deepEqual(await exportPhotos(db), []);
 seedTask(db, 'read', 'alana', 'reading');
 seedAttempt(db, 'read', 'alana', '2026-10-06T13:00:00.000Z');
 const progress = await (await route(get('/api/shared-progress'), db)).json();
 assert.equal(progress.members.find(m => m.id === 'alana').totalAttempts, 1, 'progresso independe do álbum');
});

test('exportação traz só metadados e links das fotos', async () => {
 const db = createDB();
 await route(photoRequest(), db);
 const items = await exportPhotos(db);
 assert.deepEqual(items.map(i => i.url), [`/api/photos/${uuid(1)}/image`]);
 assert.ok(!JSON.stringify(items).includes('"data"'));
});

test('rotas fora do escopo e métodos não suportados seguem para o worker', async () => {
 const db = createDB();
 assert.equal(await route(get('/api/profiles'), db), null);
 assert.equal(await route(new Request(ORIGIN + '/api/spain', { method: 'POST' }), db), null);
 assert.ok(!db.log.length);
});

// ---------- Integração com o worker (gate de acesso e exportação) ----------

test('worker: rotas novas ficam atrás do gate de sessão e origem; exportação inclui metadados das fotos', async () => {
 const { default: worker } = await import('../src/worker.js');
 const db = createDB(), key = 'chave-de-teste';
 const session = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))).map(n => n.toString(16).padStart(2, '0')).join('');
 const env = { DB: db, APP_ACCESS_KEY: key, ASSETS: { fetch: () => new Response('asset') } };
 for (const path of ['/api/spain', '/api/shared-progress', '/api/photos', `/api/photos/${uuid(1)}/image`]) {
  const response = await worker.fetch(new Request(ORIGIN + path), env);
  assert.equal(response.status, 401, path);
 }
 assert.equal((await worker.fetch(photoRequest({ headers: { Cookie: 'dele_session=' + session, Origin: 'https://outro.site' } }), env)).status, 403);
 assert.ok(!db.log.length, 'nenhuma consulta antes do gate');
 const created = await worker.fetch(photoRequest({ headers: { Cookie: 'dele_session=' + session } }), env);
 assert.equal(created.status, 201);
 const exported = await (await worker.fetch(new Request(ORIGIN + '/api/export', { headers: { Cookie: 'dele_session=' + session } }), env)).json();
 assert.deepEqual(exported.photos.map(p => p.url), [`/api/photos/${uuid(1)}/image`]);
 assert.ok(exported.photoNotice);
 const legacy = createDB({ upTo: 5 });
 const old = await (await worker.fetch(new Request(ORIGIN + '/api/export', { headers: { Cookie: 'dele_session=' + session } }), { ...env, DB: legacy })).json();
 assert.deepEqual(old.photos, []);
 assert.ok(Array.isArray(old.attempts), 'exportação antiga continua íntegra');
});

test('catálogo real: mesmo módulo da UI, cidade do dia por Maceió e só ids conhecidos', async () => {
 const { SPAIN_CITIES, cityForDay } = await import('../public/spain-cities.js');
 const catalog = { cities: SPAIN_CITIES, cityForDay };
 // 06/10 em Maceió (ainda 06/10 às 02:00Z de 07/10) é o primeiro dia de Donostia.
 assert.equal(resolveCity(catalog, null, new Date('2026-10-07T02:00:00.000Z')).id, cityForDay('2026-10-06').id);
 assert.equal(resolveCity(catalog, null, new Date('2026-10-06T15:00:00.000Z')).id, 'donostia');
 for (const city of SPAIN_CITIES) {
  assert.equal(resolveCity(catalog, city.id).id, city.id);
  assert.ok(Number.isFinite(city.latitude) && Number.isFinite(city.longitude), city.id);
 }
 assert.throws(() => resolveCity(catalog, 'paris'), { status: 400 });
 const { calls, fetchImpl } = upstream(GOOD);
 const body = await (await experienceRoute(get('/api/spain'), { DB: createDB() }, catalog, { cache: null, now: NOW, fetchImpl })).json();
 assert.equal(body.cityId, cityForDay('2026-10-07').id);
 assert.equal(new URL(calls[0].url).searchParams.get('latitude'), String(SPAIN_CITIES.find(c => c.id === body.cityId).latitude));
});


test('mesmo id não confirma uma foto diferente com o mesmo tamanho',async()=>{
 const db=createDB();const upload={id:uuid(91),profile:'luiz',target:'both',caption:'',mime:'image/jpeg',bytes:jpeg(2048,7)};
 await savePhoto(db,upload,NOW);
 await assert.rejects(savePhoto(db,{...upload,bytes:jpeg(2048,8)},NOW),e=>e.status===409);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM journey_photos').get().n,1);
});
test('exportação não oculta falha de banco que não seja tabela ainda ausente',async()=>{
 const db={prepare(){return {all:async()=>{throw new Error('database unavailable');}};}};
 await assert.rejects(exportPhotos(db),/database unavailable/);
});
