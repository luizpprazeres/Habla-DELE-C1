import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SPAIN_CITIES, SPAIN_CYCLE, cityForDay, spainCityById} from '../public/spain-cities.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IDS = ['donostia', 'mallorca', 'barcelona', 'madrid', 'bilbao', 'santiago'];
const LICENSES = {'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/', 'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/', 'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/'};

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// Lê largura e altura do cabeçalho WebP (VP8, VP8L ou VP8X) sem dependências.
function webpSize(buf) {
 assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
 assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
 const chunk = buf.toString('ascii', 12, 16);
 if (chunk === 'VP8 ') return {width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff};
 if (chunk === 'VP8L') { const b = buf.readUInt32LE(21); return {width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1}; }
 if (chunk === 'VP8X') return {width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1};
 throw new Error(`chunk WebP desconhecido: ${chunk}`);
}

test('o catálogo tem exatamente as seis cidades com o formato do contrato', () => {
 assert.deepEqual(SPAIN_CITIES.map(c => c.id), IDS);
 for (const city of SPAIN_CITIES) {
  assert.equal(typeof city.name, 'string'); assert.ok(city.name.trim());
  assert.equal(city.timezone, 'Europe/Madrid');
  assert.ok(city.latitude > 27 && city.latitude < 44.5, `${city.id} latitude`);
  assert.ok(city.longitude > -18.5 && city.longitude < 4.5, `${city.id} longitude`);
  for (const ref of [city.church, city.hospital]) {
   assert.ok(ref.name.trim()); assert.match(ref.url, /^https:\/\/[^\s]+$/);
  }
  assert.equal(spainCityById(city.id), city);
  assert.ok(Object.isFrozen(city) && Object.isFrozen(city.photo) && Object.isFrozen(city.facts));
 }
 assert.equal(spainCityById('lisboa'), null);
 assert.equal(spainCityById(undefined), null);
 assert.equal(spainCityById('__proto__'), null);
});

test('cada cidade traz três curiosidades curtas com fonte e sem preço, regra ou superlativo', () => {
 const ids = new Set();
 for (const city of SPAIN_CITIES) {
  assert.equal(city.facts.length, 3, city.id);
  for (const fact of city.facts) {
   assert.ok(!ids.has(fact.id), `id repetido ${fact.id}`); ids.add(fact.id);
   assert.ok(fact.id.startsWith(`${city.id}-`));
   assert.ok(fact.title.trim() && fact.title.length <= 48, fact.id);
   assert.ok(fact.text.trim() && fact.text.length <= 140, fact.id);
   assert.match(fact.sourceUrl, /^https:\/\/[^\s]+$/);
   assert.doesNotMatch(fact.text, /€|euros?\b|precio|entrada gratuita|horario|visado|obligatori|\bel más\b|\bla más\b|\bel mayor\b|\bla mayor\b|\bmejor\b|único en el mundo/i, fact.id);
  }
 }
 const donostia = spainCityById('donostia').facts.map(f => f.text).join(' ');
 for (const place of ['La Concha', 'Santa Clara', 'Buen Pastor']) assert.match(donostia, new RegExp(place));
});

test('as fotos são WebP locais reais, com crédito, licença e página de origem no Commons', () => {
 for (const city of SPAIN_CITIES) {
  const {photo} = city;
  assert.equal(photo.url, `/media/spain/${city.id}.webp`);
  assert.ok(photo.alt.trim().length >= 20, city.id);
  assert.ok(photo.author.trim(), city.id);
  assert.equal(photo.licenseUrl, LICENSES[photo.license], `${city.id} licença`);
  assert.match(photo.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:[^\s]+$/);
  const file = `${ROOT}public${photo.url}`;
  const bytes = statSync(file).size;
  assert.ok(bytes >= 60_000 && bytes <= 260_000, `${city.id}: ${bytes} bytes`);
  const size = webpSize(readFileSync(file));
  assert.ok(size.width <= 1280 && size.height <= 1280, `${city.id} dimensões`);
  assert.ok(size.width > size.height, `${city.id} deve ser paisagem`);
  assert.deepEqual(size, {width: photo.width, height: photo.height});
 }
});

test('o ciclo de 8 dias começa em Donostia em 06/10/2026 e a repete 3 vezes', () => {
 assert.equal(SPAIN_CYCLE.length, 8);
 assert.equal(cityForDay('2026-10-06').id, 'donostia');
 const window = Array.from({length: 8}, (_, n) => cityForDay(addDays('2026-10-06', n)).id);
 assert.deepEqual(window, [...SPAIN_CYCLE]);
 const count = id => window.filter(x => x === id).length;
 assert.equal(count('donostia'), 3);
 for (const id of IDS.slice(1)) assert.equal(count(id), 1, id);
 for (let n = 1; n < 8; n++) assert.ok(!(window[n] === 'donostia' && window[n - 1] === 'donostia'), 'Donostia não aparece em dias seguidos');
 for (let n = -40; n < 40; n++) {
  const day = addDays('2026-10-06', n);
  assert.equal(cityForDay(day), cityForDay(addDays(day, 8)), day);
  assert.ok(IDS.includes(cityForDay(day).id));
 }
});

test('datas anteriores à âncora seguem o mesmo ciclo sem índice negativo', () => {
 assert.equal(cityForDay('2026-10-05').id, SPAIN_CYCLE[7]);
 assert.equal(cityForDay('2026-09-28').id, 'donostia');
 for (const day of ['1969-12-31', '1900-01-01', '0001-01-01', '0099-12-31', '2026-02-28', '2024-02-29']) assert.ok(IDS.includes(cityForDay(day)?.id), day);
 // Anos 0–99 também seguem o ciclo, em vez de cair no fallback.
 assert.equal(cityForDay('0001-01-01'), cityForDay('0001-01-09'));
 assert.notEqual(cityForDay('0001-01-01'), cityForDay('0001-01-02'));
});

test('data ausente ou inválida cai de forma estável em Donostia', () => {
 for (const value of [undefined, null, '', 'hoje', '2026-10-6', '2026-02-30', '2026-13-01', '2025-02-29', '2026-10-06T23:00:00Z', 20261006, {}, []]) {
  assert.equal(cityForDay(value).id, 'donostia', String(value));
 }
});

test('a cidade do dia não depende do relógio nem do fuso do processo', () => {
 const realNow = Date.now;
 Date.now = () => { throw new Error('cityForDay não deve ler o relógio'); };
 try { assert.equal(cityForDay('2026-10-09').id, 'donostia'); } finally { Date.now = realNow; }

 const days = Array.from({length: 16}, (_, n) => addDays('2026-10-01', n));
 const script = `import('./public/spain-cities.js').then(m=>console.log(JSON.stringify(${JSON.stringify(days)}.map(d=>m.cityForDay(d).id))))`;
 const results = ['UTC', 'America/Maceio', 'Pacific/Kiritimati', 'Pacific/Pago_Pago'].map(TZ => {
  const run = spawnSync(process.execPath, ['-e', script], {cwd: ROOT, env: {...process.env, TZ}, encoding: 'utf8'});
  assert.equal(run.status, 0, run.stderr);
  return run.stdout.trim();
 });
 assert.equal(new Set(results).size, 1);
 assert.deepEqual(JSON.parse(results[0]), days.map(d => cityForDay(d).id));
});
