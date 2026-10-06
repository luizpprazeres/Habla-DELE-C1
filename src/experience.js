// Experiência compartilhada: tempo estimado nas cidades, progresso a dois e álbum de fotos.
// Todas as rotas chegam aqui depois do gate de acesso e de origem do worker.
// Nenhuma rota devolve respostas, correções, gabaritos, áudios ou dados de perfil a terceiros.
import { PROFILE_IDS, TIME_ZONE, localDay, journeyWeek } from './journey.js';

const KINDS = ['reading', 'listening', 'writing', 'speaking'];
const FALLBACK_NAMES = { luiz: 'Luiz', alana: 'Alana' };
export const PHOTO_TARGETS = ['luiz', 'alana', 'both'];
export const PHOTO_LIMITS = { maxBytes: 25_000_000, maxPhotoBytes: 700_000, maxCount: 80, maxCaption: 280 };
// Folga do multipart (limites, nomes de campo, id e legenda) além do próprio arquivo.
const MULTIPART_OVERHEAD = 32_768;
export const WEATHER = { source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', ttlSeconds: 600, timeoutMs: 5000, staleAfterMs: 60 * 60 * 1000 };
const WEATHER_CACHE_ORIGIN = 'https://weather-cache.habla.invalid/open-meteo/v1/';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PHOTO_COLUMNS = 'id,profile_id,target,caption,created_at,bytes';

export class ExperienceError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const missingTable = error => /no such table/i.test(String(error?.message || error));
function addDays(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// ---------- Tempo estimado (Open-Meteo) ----------

export function resolveCity(catalog, requested, now = new Date()) {
 const cities = catalog?.cities || [];
 if (requested !== null && requested !== undefined) {
  const city = cities.find(c => c.id === requested);
  if (!city) throw new ExperienceError('Cidade fora do catálogo.');
  return city;
 }
 const chosen = catalog.cityForDay(localDay(now));
 const id = typeof chosen === 'string' ? chosen : chosen?.id;
 const city = cities.find(c => c.id === id);
 if (!city) throw new ExperienceError('Cidade do dia indisponível.', 500);
 return city;
}

export function weatherUrl(city) {
 const params = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude), current: 'temperature_2m,weather_code', timezone: 'UTC' });
 return `https://api.open-meteo.com/v1/forecast?${params}`;
}

// Open-Meteo devolve horário UTC sem sufixo quando timezone=UTC.
export function parseObservedAt(value) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
 const date = new Date(value + 'Z');
 return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Só aceita valores reais; qualquer ausência vira indisponível, nunca zero ou valor inventado.
export function parseOpenMeteo(body) {
 const current = body?.current;
 const temperatureC = current?.temperature_2m, code = current?.weather_code, observedAt = parseObservedAt(current?.time);
 if (typeof temperatureC !== 'number' || !Number.isFinite(temperatureC) || !Number.isInteger(code) || code < 0 || code > 99 || !observedAt) return null;
 return { temperatureC, code, observedAt };
}

export function weatherView(entry, now = new Date()) {
 const base = { source: WEATHER.source, sourceUrl: WEATHER.sourceUrl };
 if (!entry) return { temperatureC: null, code: null, observedAt: null, fetchedAt: now.toISOString(), available: false, stale: false, ...base };
 const stale = now.getTime() - new Date(entry.observedAt).getTime() > WEATHER.staleAfterMs;
 return { temperatureC: entry.temperatureC, code: entry.code, observedAt: entry.observedAt, fetchedAt: entry.fetchedAt, available: true, stale, ...base };
}

const weatherCacheKey = city => new Request(WEATHER_CACHE_ORIGIN + encodeURIComponent(city.id));

async function readWeatherCache(cache, city) {
 if (!cache) return null;
 try {
  const hit = await cache.match(weatherCacheKey(city));
  if (!hit) return null;
  const entry = await hit.json();
  const valid = entry?.cityId === city.id && typeof entry.temperatureC === 'number' && Number.isFinite(entry.temperatureC) && Number.isInteger(entry.code)
   && !Number.isNaN(Date.parse(entry.observedAt)) && !Number.isNaN(Date.parse(entry.fetchedAt));
  return valid ? entry : null;
 } catch { return null; }
}

// O cache guarda apenas o dado meteorológico público da cidade; nada de sessão ou perfil.
async function writeWeatherCache(cache, city, entry) {
 if (!cache) return;
 try { await cache.put(weatherCacheKey(city), new Response(JSON.stringify(entry), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${WEATHER.ttlSeconds}` } })); } catch {}
}

export async function cityWeather(city, { fetchImpl = fetch, cache = null, now = new Date() } = {}) {
 const cached = await readWeatherCache(cache, city);
 if (cached) return weatherView(cached, now);
 let response;
 try {
  // Requisição sem cookies, cabeçalhos do cliente ou identificação de perfil.
  response = await fetchImpl(weatherUrl(city), { method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(WEATHER.timeoutMs) });
  if (!response?.ok) { await response?.body?.cancel?.(); return weatherView(null, now); }
  const parsed = parseOpenMeteo(await response.json());
  if (!parsed) return weatherView(null, now);
  const entry = { cityId: city.id, ...parsed, fetchedAt: now.toISOString() };
  await writeWeatherCache(cache, city, entry);
  return weatherView(entry, now);
 } catch { return weatherView(null, now); }
}

export async function spainPayload(catalog, requested, deps = {}) {
 const now = deps.now || new Date();
 const city = resolveCity(catalog, requested, now);
 return { cityId: city.id, weather: await cityWeather(city, { ...deps, now }) };
}

// ---------- Progresso compartilhado (14 dias, histórico completo) ----------

// Agregados por habilidade sobre todo o histórico, inclusive tarefas aposentadas.
export const SHARED_TOTALS_SQL = 'SELECT a.profile_id AS profile_id,t.kind AS kind,COUNT(*) AS count,MAX(a.created_at) AS last_at FROM attempts a JOIN tasks t ON t.id=a.task_id GROUP BY a.profile_id,t.kind';
// Somente metadados da janela recente; nenhuma resposta ou correção sai do banco.
export const SHARED_RECENT_SQL = 'SELECT a.profile_id AS profile_id,a.task_id AS task_id,a.created_at AS created_at FROM attempts a JOIN tasks t ON t.id=a.task_id WHERE a.created_at>=? ORDER BY a.created_at';

export function progressPeriod(now = new Date()) {
 const end = localDay(now);
 return { start: addDays(end, -13), end, days: 14 };
}

export function buildSharedProgress({ profiles = [], totals = [], recent = [], now = new Date() }) {
 const period = progressPeriod(now), week = journeyWeek(now);
 const days = Array.from({ length: period.days }, (_, i) => addDays(period.start, i));
 return {
  generatedAt: now.toISOString(),
  timeZone: TIME_ZONE,
  period,
  members: PROFILE_IDS.map(id => {
   const counts = Object.fromEntries(KINDS.map(k => [k, 0]));
   let lastPracticedAt = null;
   for (const row of totals) {
    if (row?.profile_id !== id || !KINDS.includes(row.kind)) continue;
    counts[row.kind] += Number(row.count) || 0;
    const last = new Date(row.last_at);
    if (!Number.isNaN(last.getTime()) && (!lastPracticedAt || last.toISOString() > lastPracticedAt)) lastPracticedAt = last.toISOString();
   }
   const perDay = new Map(days.map(d => [d, { attempts: 0, tasks: new Set() }]));
   const weekDays = new Set();
   for (const row of recent) {
    if (row?.profile_id !== id) continue;
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const day = localDay(date), slot = perDay.get(day);
    if (slot) { slot.attempts++; slot.tasks.add(row.task_id); }
    if (day >= week.start && day < week.end) weekDays.add(day);
   }
   return {
    id,
    name: profiles.find(p => p.id === id)?.name || FALLBACK_NAMES[id],
    totalAttempts: KINDS.reduce((sum, k) => sum + counts[k], 0),
    skills: KINDS.map(kind => ({ kind, count: counts[kind] })),
    activity: days.map(day => ({ day, attempts: perDay.get(day).attempts, distinctTasks: perDay.get(day).tasks.size })),
    rhythm: { activeDaysThisWeek: weekDays.size, lastPracticedAt }
   };
  })
 };
}

export async function loadSharedProgress(db, now = new Date()) {
 // Margem de um dia antes do início em Maceió; o recorte exato acontece no fuso local.
 const since = new Date(new Date(progressPeriod(now).start + 'T00:00:00Z').getTime() - 86400000).toISOString();
 const [profiles, totals, recent] = await Promise.all([
  db.prepare('SELECT id,name FROM profiles').all().then(r => r.results || []),
  db.prepare(SHARED_TOTALS_SQL).all().then(r => r.results || []),
  db.prepare(SHARED_RECENT_SQL).bind(since).all().then(r => r.results || [])
 ]);
 return buildSharedProgress({ profiles, totals, recent, now });
}

// ---------- Álbum de fotos ----------

export function sniffImage(bytes) {
 const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
 if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
 if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
 if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
 return null;
}

export function normalizeCaption(value) {
 if (value === null || value === undefined) return '';
 if (typeof value !== 'string') throw new ExperienceError('Legenda inválida.');
 const caption = value.replace(/\r\n?/g, '\n').trim();
 // eslint-disable-next-line no-control-regex
 if (/[\u0000-\u0009\u000b-\u001f\u007f]/.test(caption)) throw new ExperienceError('Legenda com caracteres inválidos.');
 if ([...caption].length > PHOTO_LIMITS.maxCaption) throw new ExperienceError(`A legenda pode ter até ${PHOTO_LIMITS.maxCaption} caracteres.`);
 return caption;
}

export function photoItem(row) {
 return { id: row.id, profile: row.profile_id, target: row.target, caption: row.caption, createdAt: row.created_at, url: `/api/photos/${row.id}/image`, bytes: Number(row.bytes) };
}

// Lê o corpo com limite antes de qualquer parse, sem acumular além do teto.
export async function readBounded(request, max) {
 const declared = Number(request.headers.get('Content-Length'));
 if (Number.isFinite(declared) && declared > max) throw new ExperienceError('Foto maior que o limite de 700 KB. Reduza e tente de novo.', 413);
 const reader = request.body?.getReader();
 if (!reader) throw new ExperienceError('Envio vazio.');
 const chunks = []; let size = 0;
 while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  size += value.length;
  if (size > max) { await reader.cancel().catch(() => {}); throw new ExperienceError('Foto maior que o limite de 700 KB. Reduza e tente de novo.', 413); }
  chunks.push(value);
 }
 const buffer = new Uint8Array(size); let offset = 0;
 for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
 return buffer;
}

export async function parsePhotoUpload(request) {
 const type = request.headers.get('Content-Type') || '';
 if (!/^multipart\/form-data;\s*boundary=/i.test(type)) throw new ExperienceError('Envie a foto como formulário multipart.', 415);
 const raw = await readBounded(request, PHOTO_LIMITS.maxPhotoBytes + MULTIPART_OVERHEAD);
 let form;
 try { form = await new Response(raw, { headers: { 'Content-Type': type } }).formData(); }
 catch { throw new ExperienceError('Não foi possível ler o envio da foto.'); }
 const id = form.get('id'), profile = form.get('profile'), target = form.get('target'), photo = form.get('photo');
 if (typeof id !== 'string' || !UUID.test(id)) throw new ExperienceError('Identificador da foto inválido.');
 if (!PROFILE_IDS.includes(profile)) throw new ExperienceError('Escolha Luiz ou Alana.');
 if (!PHOTO_TARGETS.includes(target)) throw new ExperienceError('Escolha para quem é a foto: Luiz, Alana ou ambos.');
 const caption = normalizeCaption(form.get('caption'));
 if (!photo || typeof photo === 'string' || typeof photo.arrayBuffer !== 'function') throw new ExperienceError('Escolha uma foto.');
 if (photo.size > PHOTO_LIMITS.maxPhotoBytes) throw new ExperienceError('Foto maior que o limite de 700 KB. Reduza e tente de novo.', 413);
 const bytes = new Uint8Array(await photo.arrayBuffer());
 if (bytes.length < 16) throw new ExperienceError('Foto vazia ou incompleta.');
 const mime = sniffImage(bytes);
 if (!mime || (photo.type && photo.type !== mime)) throw new ExperienceError('Use foto JPEG, PNG ou WebP.', 415);
 return { id, profile, target, caption, mime, bytes };
}

async function photoStorage(db) {
 const usage = await db.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(bytes),0) AS used FROM journey_photos').first();
 return { count: Number(usage?.count) || 0, usedBytes: Number(usage?.used) || 0 };
}
const storageView = usedBytes => ({ usedBytes, maxBytes: PHOTO_LIMITS.maxBytes, maxPhotoBytes: PHOTO_LIMITS.maxPhotoBytes, maxCount: PHOTO_LIMITS.maxCount });

export async function listPhotos(db) {
 const [rows, usage] = await Promise.all([
  db.prepare(`SELECT ${PHOTO_COLUMNS} FROM journey_photos ORDER BY created_at DESC,id DESC LIMIT ?`).bind(PHOTO_LIMITS.maxCount).all().then(r => r.results || []),
  photoStorage(db)
 ]);
 return { items: rows.map(photoItem), storage: storageView(usage.usedBytes) };
}

// Inserção atômica: cotas verificadas no mesmo comando, seguro sob envios simultâneos.
export const PHOTO_INSERT_SQL = `INSERT INTO journey_photos(id,profile_id,target,caption,mime,bytes,data,created_at)
 SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM journey_photos)<? AND (SELECT COALESCE(SUM(bytes),0) FROM journey_photos)+?<=?
 ON CONFLICT(id) DO NOTHING RETURNING ${PHOTO_COLUMNS}`;

export async function savePhoto(db, upload, now = new Date()) {
 const { id, profile, target, caption, mime, bytes } = upload;
 const inserted = await db.prepare(PHOTO_INSERT_SQL)
  .bind(id, profile, target, caption, mime, bytes.length, bytes, now.toISOString(), PHOTO_LIMITS.maxCount, bytes.length, PHOTO_LIMITS.maxBytes).first();
 if (inserted) return { item: photoItem(inserted), created: true, storage: storageView((await photoStorage(db)).usedBytes) };
 // Repetição do mesmo envio: devolve o registro original sem duplicar.
 const existing = await db.prepare(`SELECT ${PHOTO_COLUMNS},mime,data FROM journey_photos WHERE id=?`).bind(id).first();
 if (existing) {
  const saved = new Uint8Array(existing.data);
  if (saved.length !== bytes.length || saved.some((value,index)=>value!==bytes[index]) || existing.mime !== mime || existing.profile_id !== profile || existing.target !== target || existing.caption !== caption || Number(existing.bytes) !== bytes.length) throw new ExperienceError('Esta foto já foi registrada com outros dados. Recarregue o álbum.', 409);
  return { item: photoItem(existing), created: false, storage: storageView((await photoStorage(db)).usedBytes) };
 }
 const usage = await photoStorage(db);
 if (usage.count >= PHOTO_LIMITS.maxCount) throw new ExperienceError(`O álbum chegou ao limite de ${PHOTO_LIMITS.maxCount} fotos. As fotos já salvas continuam disponíveis.`, 413);
 throw new ExperienceError('O álbum chegou ao limite de 25 MB. As fotos já salvas continuam disponíveis.', 413);
}

export async function photoImage(db, id) {
 const row = await db.prepare('SELECT mime,data FROM journey_photos WHERE id=?').bind(id).first();
 if (!row) throw new ExperienceError('Foto não encontrada.', 404);
 const data = row.data instanceof ArrayBuffer ? row.data : new Uint8Array(row.data).buffer;
 return new Response(data, { headers: { 'Content-Type': row.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
}

// Exportação: só metadados e links; o binário fica no banco.
export async function exportPhotos(db) {
 try { return (await db.prepare(`SELECT ${PHOTO_COLUMNS} FROM journey_photos ORDER BY created_at,id`).all()).results.map(photoItem); }
 catch (error) {if (/no such table.*journey_photos/i.test(error?.message || '')) return [];throw error;}
}

// ---------- Roteamento ----------

export async function experienceRoute(request, env, catalog, deps = {}) {
 const url = new URL(request.url), path = url.pathname, method = request.method;
 const imageMatch = path.match(/^\/api\/photos\/([0-9a-f-]{36})\/image$/);
 try {
  if (path === '/api/spain' && method === 'GET') {
   const cache = deps.cache !== undefined ? deps.cache : (typeof caches !== 'undefined' ? caches.default : null);
   return json(await spainPayload(catalog, url.searchParams.get('city'), { fetchImpl: deps.fetchImpl || fetch, cache, now: deps.now }));
  }
  if (path === '/api/shared-progress' && method === 'GET') return json(await loadSharedProgress(env.DB, deps.now));
  if (path === '/api/photos' || imageMatch) {
   try {
    if (path === '/api/photos' && method === 'GET') return json(await listPhotos(env.DB));
    if (path === '/api/photos' && method === 'POST') { const result = await savePhoto(env.DB, await parsePhotoUpload(request), deps.now); return json(result, result.created ? 201 : 200); }
    if (imageMatch && method === 'GET') {
     const site = request.headers.get('Sec-Fetch-Site');
     if (site && site !== 'same-origin' && site !== 'none') throw new ExperienceError('Origem não autorizada.', 403);
     if (!UUID.test(imageMatch[1])) throw new ExperienceError('Foto não encontrada.', 404);
     return await photoImage(env.DB, imageMatch[1]);
    }
   } catch (error) {
    if (missingTable(error)) throw new ExperienceError('O álbum ainda não foi ativado. O restante do estudo segue normal.', 503);
    throw error;
   }
  }
  return null;
 } catch (error) {
  if (error instanceof ExperienceError) return json({ message: error.message }, error.status);
  throw error;
 }
}
