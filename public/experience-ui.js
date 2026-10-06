// Experiência: cidade do dia, evolução compartilhada e álbum a dois.
// Controlador isolado do app.js: preenche slots [data-xp-slot] sem repintar a tela inteira,
// cancela tudo no unmount (troca de página ou de perfil) e nunca pinta resposta atrasada.
// Contrato: private/agents/experience-contract.txt (0.4.0). Notas: docs/EXPERIENCE-UI.md.

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = url => {try {const u = new URL(url); return u.protocol === 'https:' ? u.href : '';} catch {return '';}};
// Fotos da cidade só do próprio app; fotos do álbum só pela API protegida.
const localMedia = url => typeof url === 'string' && /^\/media\/spain\/[a-z0-9-]+\.(webp|jpe?g|png)$/.test(url) ? url : '';
const albumImage = url => typeof url === 'string' && /^\/api\/photos\/[A-Za-z0-9-]+\/image$/.test(url) ? url : '';
const int = n => Number.isFinite(Number(n)) && Number(n) > 0 ? Math.floor(Number(n)) : 0;
const NAMES = {luiz: 'Luiz', alana: 'Alana'};
const KINDS = [['reading', 'Leitura'], ['listening', 'Escuta'], ['writing', 'Escrita'], ['speaking', 'Fala']];
const POLL_MS = 60000;
const FOCUS_MIN_MS = 15000;
const UPLOAD = {maxEdge: 1600, budget: 600000, maxCaption: 280, maxSource: 40000000};

// Códigos WMO usados pelo Open-Meteo. Código desconhecido: mostra só a temperatura.
const WEATHER = {0:'Céu limpo',1:'Predominantemente limpo',2:'Parcialmente nublado',3:'Nublado',45:'Neblina',48:'Neblina com geada',51:'Garoa fraca',53:'Garoa',55:'Garoa forte',56:'Garoa congelante',57:'Garoa congelante forte',61:'Chuva fraca',63:'Chuva',65:'Chuva forte',66:'Chuva congelante',67:'Chuva congelante forte',71:'Neve fraca',73:'Neve',75:'Neve forte',77:'Grãos de neve',80:'Pancadas de chuva fracas',81:'Pancadas de chuva',82:'Pancadas de chuva fortes',85:'Pancadas de neve',86:'Pancadas de neve fortes',95:'Trovoada',96:'Trovoada com granizo',99:'Trovoada com granizo forte'};

// Fallback quando spain-cities.js não carrega: a paisagem original de La Concha, sem fatos nem crédito inventados.
const FALLBACK_CITY = {id: 'donostia', name: 'San Sebastián / Donostia', timezone: 'Europe/Madrid', fallback: true, photo: {url: '/donostia.svg', alt: 'Ilustração estilizada da baía de La Concha'}, facts: []};

let citiesModule = null;
function loadCities() {
 // Import dinâmico: se o módulo faltar ou falhar, o app segue com o fallback.
 citiesModule ??= import('./spain-cities.js').then(m => ({list: Array.isArray(m.SPAIN_CITIES) ? m.SPAIN_CITIES : [], forDay: typeof m.cityForDay === 'function' ? m.cityForDay : null})).catch(() => null);
 return citiesModule;
}
const validZone = zone => {try {new Intl.DateTimeFormat('pt-BR', {timeZone: zone}); return zone;} catch {return 'Europe/Madrid';}};
function normalizeCity(c) {
 if (!c?.id || !c?.name) return null;
 const photo = c.photo || {};
 return {id: String(c.id), name: String(c.name), timezone: validZone(String(c.timezone || 'Europe/Madrid')),
  photo: {url: localMedia(photo.url), alt: String(photo.alt || ''), author: String(photo.author || ''), license: String(photo.license || ''), licenseUrl: safeUrl(photo.licenseUrl), sourceUrl: safeUrl(photo.sourceUrl), adaptation: String(photo.adaptation || ''), title: String(photo.title || '')},
  facts: (Array.isArray(c.facts) ? c.facts : []).filter(f => f?.text).slice(0, 3).map(f => ({id: String(f.id || ''), title: String(f.title || ''), text: String(f.text), sourceUrl: safeUrl(f.sourceUrl)})),
  church: c.church?.name ? {name: String(c.church.name), url: safeUrl(c.church.url)} : null,
  hospital: c.hospital?.name ? {name: String(c.hospital.name), url: safeUrl(c.hospital.url)} : null};
}
async function cityOfDay(dateISO) {
 const mod = await loadCities();
 if (!mod?.forDay) return {city: FALLBACK_CITY, next: null, all: []};
 let city = null;
 try {city = normalizeCity(mod.forDay(dateISO));} catch {}
 if (!city) return {city: FALLBACK_CITY, next: null, all: []};
 // Quando a cidade do dia não é Donostia, diz quando ela volta (rotação recorrente).
 let next = null;
 if (city.id !== 'donostia') for (let i = 1; i <= 14; i++) {
  const day = new Date(Date.parse(dateISO + 'T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
  try {if (mod.forDay(day)?.id === 'donostia') {next = i; break;}} catch {break;}
 }
 return {city, next, all: mod.list.map(normalizeCity).filter(Boolean)};
}

function normalizeWeather(data, cityId) {
 const w = data?.weather || {};
 const temp = typeof w.temperatureC === 'number' && Number.isFinite(w.temperatureC) ? w.temperatureC : null;
 const observed = Date.parse(w.observedAt || '');
 return {cityId: String(data?.cityId || cityId), available: !!w.available && temp !== null, stale: !!w.stale, temperatureC: temp,
  code: Number.isInteger(w.code) ? w.code : null, observedAt: Number.isFinite(observed) ? observed : null,
  source: String(w.source || 'Open-Meteo'), sourceUrl: safeUrl(w.sourceUrl) || 'https://open-meteo.com/'};
}
function normalizeProgress(data, viewer) {
 const list = x => Array.isArray(x) ? x : [];
 const members = list(data?.members).filter(m => NAMES[m?.id]).map(m => {
  const skills = new Map(list(m.skills).map(s => [s?.kind, int(s?.count)]));
  return {id: m.id, name: String(m.name || NAMES[m.id]), totalAttempts: int(m.totalAttempts),
   skills: KINDS.map(([kind, label]) => ({kind, label, count: skills.get(kind) || 0})),
   activity: list(m.activity).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d?.day)).slice(-14).map(d => ({day: d.day, attempts: int(d.attempts), distinctTasks: int(d.distinctTasks)})),
   rhythm: {activeDaysThisWeek: int(m.rhythm?.activeDaysThisWeek), lastPracticedAt: Number.isFinite(Date.parse(m.rhythm?.lastPracticedAt || '')) ? m.rhythm.lastPracticedAt : null}};
 });
 members.sort((a, b) => (b.id === viewer) - (a.id === viewer));
 return {members, days: int(data?.period?.days) || 14};
}
function normalizeAlbum(data) {
 const s = data?.storage || {};
 const items = (Array.isArray(data?.items) ? data.items : []).filter(p => p?.id && albumImage(p.url) && NAMES[p.profile]).slice(0, 80)
  .map(p => ({id: String(p.id), profile: p.profile, target: ['luiz', 'alana', 'both'].includes(p.target) ? p.target : 'both', caption: String(p.caption || '').slice(0, UPLOAD.maxCaption), createdAt: p.createdAt, url: albumImage(p.url), bytes: int(p.bytes)}));
 return {items, storage: {usedBytes: int(s.usedBytes), maxBytes: int(s.maxBytes) || 25000000, maxPhotoBytes: int(s.maxPhotoBytes) || 700000, maxCount: int(s.maxCount) || 80}};
}

const dayShort = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', {timeZone: 'UTC', day: 'numeric', month: 'short'});
const dateShort = value => new Date(value).toLocaleDateString('pt-BR', {timeZone: 'America/Maceio', day: 'numeric', month: 'short'});
const clock = (ms, timeZone) => new Intl.DateTimeFormat('pt-BR', {timeZone, hour: '2-digit', minute: '2-digit'}).format(ms);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const mb = bytes => (bytes / 1000000).toLocaleString('pt-BR', {maximumFractionDigits: 1});

// Confirmações perdidas: consultar o id salvo antes de repetir o mesmo envio.
export async function deliverPhoto(api, {id, body, reconcile = false}) {
 if (reconcile) {
  let album;
  try {album = await api('/api/photos');}
  catch (error) {error.uncertain = true;throw error;}
  if (!Array.isArray(album?.items)) {const error = new Error('Não foi possível conferir o álbum.');error.uncertain = true;throw error;}
  if (album.items.some(photo => photo.id === id)) return {created:false};
 }
 try {return await api('/api/photos', {method:'POST',body});}
 catch (error) {error.uncertain = !error.status || error.status >= 500 || error.status === 409;throw error;}
}

// ---------- Compressão local da foto (sem serviço externo) ----------
function readAsDataURL(blob) {return new Promise((resolve, reject) => {const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob);});}
// Dimensões do cabeçalho: reduz originais grandes sem ampliar fotos pequenas.
export function photoResizeOptions(bytes) {
 const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), v = new DataView(b.buffer,b.byteOffset,b.byteLength);
 let width=0,height=0;
 if(b.length>=24 && b[0]===137 && b[1]===80 && b[2]===78 && b[3]===71){width=v.getUint32(16);height=v.getUint32(20);}
 else if(b.length>=4 && b[0]===255 && b[1]===216){
  for(let i=2;i+4<=b.length;){
   if(b[i++]!==255)break;while(i<b.length && b[i]===255)i++;const marker=b[i++];
   if(marker===0xd9 || marker===0xda)break;if(marker===0x01 || marker>=0xd0 && marker<=0xd7)continue;
   if(i+2>b.length)break;const length=v.getUint16(i);if(length<2 || i+length>b.length)break;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length>=7){height=v.getUint16(i+3);width=v.getUint16(i+5);break;}i+=length;
  }
 }
 else if(b.length>=30 && String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP'){
  const kind=String.fromCharCode(...b.slice(12,16));
  if(kind==='VP8 '){width=v.getUint16(26,true)&0x3fff;height=v.getUint16(28,true)&0x3fff;}
  else if(kind==='VP8X'){width=1+b[24]+b[25]*256+b[26]*65536;height=1+b[27]+b[28]*256+b[29]*65536;}
  else if(kind==='VP8L'){const bits=v.getUint32(21,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
 }
 if(width<=0 || height<=0 || width>100000 || height>100000 || Math.max(width,height)<=UPLOAD.maxEdge)return {};
 return {...(width>=height?{resizeWidth:UPLOAD.maxEdge}:{resizeHeight:UPLOAD.maxEdge}),resizeQuality:'high'};
}

async function decodeImage(file) {
 // createImageBitmap não depende de URL e respeita a CSP (img-src 'self' data:). Fallback: <img> com data: URL.
 if (window.createImageBitmap) {
  try {const size = photoResizeOptions(await file.slice(0,65536).arrayBuffer());const bmp = await createImageBitmap(file, {imageOrientation: 'from-image', ...size}); return {source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close?.()};}
  catch {}
 }
 const url = await readAsDataURL(file);
 const img = new Image(); img.decoding = 'async'; img.src = url;
 await img.decode();
 if (!img.naturalWidth || !img.naturalHeight) throw new Error('decode');
 return {source: img, width: img.naturalWidth, height: img.naturalHeight, close() {}};
}
const toBlob = (canvas, quality) => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
// Redesenha sempre a partir do original decodificado (nunca recomprime a saída anterior).
// O canvas descarta EXIF e GPS; só pixels saem do aparelho.
export async function compressPhoto(file) {
 const looksHeic = /\.(heic|heif)$/i.test(file?.name || '') || /heic|heif/i.test(file?.type || '');
 if (!file || file.size > UPLOAD.maxSource) throw new Error('Foto grande demais para preparar neste aparelho (máximo de 40 MB no original).');
 let decoded;
 try {decoded = await decodeImage(file);}
 catch {throw new Error(looksHeic ? 'Este navegador não abre fotos HEIC. No iPhone, escolha a foto pela galeria em “Mais compatível” ou exporte como JPEG e tente de novo.' : 'Não foi possível abrir esta imagem. Use uma foto JPEG, PNG ou WebP.');}
 const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
 try {
  let edge = Math.min(UPLOAD.maxEdge, Math.max(decoded.width, decoded.height));
  for (let pass = 0; pass < 5; pass++) {
   const scale = edge / Math.max(decoded.width, decoded.height);
   canvas.width = Math.max(1, Math.round(decoded.width * scale)); canvas.height = Math.max(1, Math.round(decoded.height * scale));
   ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
   ctx.imageSmoothingQuality = 'high'; ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
   for (const q of [0.86, 0.78, 0.7, 0.62]) {
    const blob = await toBlob(canvas, q);
    if (!blob) throw new Error('Não foi possível preparar a foto neste navegador.');
    if (blob.type === 'image/jpeg' && blob.size <= UPLOAD.budget) return {blob, width: canvas.width, height: canvas.height, preview: await readAsDataURL(blob)};
   }
   edge = Math.round(edge * 0.8);
  }
  throw new Error('Não foi possível reduzir esta foto para até 600 KB. Tente outra imagem.');
 } finally {decoded.close(); canvas.width = canvas.height = 0;}
}

// Rascunho do envio por perfil: sobrevive à troca de página e de perfil; o id só muda com outra foto.
const photoDrafts = new Map();
const uid = () => crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
let uploading = false, preparing = false;

/**
 * deps: {api, toast, profile(), today(), appBusy(), hold(root), go(page)}
 */
export function createExperience(deps) {
 let ctl = null, page = null, root = null, profile = null, gen = 0;
 const s = {city: null, weather: null, weatherStatus: 'idle', weatherAt: 0, weatherSeq: 0, progress: null, progressStatus: 'idle', progressAt: 0, album: null, albumStatus: 'idle', albumAt: 0, albumSeq: 0, inflight: {progress: false, album: false}};

 const alive = g => g === gen && ctl && !ctl.signal.aborted;
 const slot = name => root?.querySelector(`[data-xp-slot="${name}"]`);
 const painted = new WeakMap();
 // Repinta só quando o conteúdo muda; anima só a primeira entrada; devolve o foco ao título se ele estava dentro.
 const paint = (el, html) => {
  if (!el || painted.get(el) === html) return;
  const hadFocus = el.contains(document.activeElement);
  el.innerHTML = html; painted.set(el, html);
  if (!el.dataset.filled) {el.dataset.filled = 'true'; el.classList.add('xp-enter');}
  bind(el); deps.hold?.(el);
  if (hadFocus) el.closest('[data-xp-slot]')?.querySelector('[data-xp-focus]')?.focus({preventScroll: true});
 };

 function mount(nextPage, nextRoot) {
  unmount();
  page = nextPage; root = nextRoot; profile = deps.profile(); ctl = new AbortController(); const g = ++gen;
  // Dados compartilhados são os mesmos para os dois perfis; só a ordem e o "(você)" seguem quem está vendo.
  s.progress?.members.sort((a, b) => (b.id === profile) - (a.id === profile));
  if (page === 'today') mountToday(g);
  else if (page === 'progress') mountProgress(g);
  else if (page === 'sources') mountCredits(g);
 }
 function unmount() {
  ctl?.abort(); ctl = null; gen++; page = null; root = null;
  s.inflight.progress = s.inflight.album = false;
 }

 // ---------- Meu dia: ambientação na próxima tarefa + painel da cidade ----------
 async function mountToday(g) {
  const {city, next} = await cityOfDay(deps.today());
  if (!alive(g)) return;
  if (city.facts.length > 1) {const day = Math.floor(Date.parse(deps.today() + 'T12:00:00Z') / 86400000);const index = (day % city.facts.length + city.facts.length) % city.facts.length;city.facts = city.facts.slice(index).concat(city.facts.slice(0, index));}
  s.city = city;
  paintLessonPhoto(city);
  const panel = slot('city');
  if (panel) {paint(panel, cityPanelHTML(city, next)); startCityClock(panel, city, g);}
  loadWeather(g, city);
 }
 function paintLessonPhoto(city) {
  const el = slot('lesson-photo'); if (!el) return;
  // A ilustração de La Concha só representa Donostia; outra cidade sem foto válida fica sem imagem.
  const url = city.photo.url || (city.id === 'donostia' ? '/donostia.svg' : '');
  if (!url) {el.innerHTML = ''; el.dataset.state = 'empty'; return;}
  el.innerHTML = `<img src="${esc(url)}" alt="${esc(city.photo.alt || city.name)}" decoding="async"><span class="lesson-photo-label">Ambientação: <span lang="es">${esc(city.name)}</span></span>`;
  el.dataset.state = 'ready'; el.dataset.kind = city.fallback ? 'illustration' : 'photo';
  const img = el.querySelector('img'); if (!img) return;
  const fail = () => {
   // Foto ausente: Donostia volta à paisagem original; outras cidades ficam só com o rótulo no painel.
   if (city.id === 'donostia' && !img.src.endsWith('/donostia.svg')) {img.src = '/donostia.svg'; img.alt = FALLBACK_CITY.photo.alt; el.dataset.kind = 'illustration';}
   else el.dataset.state = 'empty';
  };
  img.addEventListener('error', fail, {signal: ctl.signal});
  if (img.complete && !img.naturalWidth) fail();
 }
 function cityPanelHTML(city, next) {
  const facts = city.facts, first = facts[0], rest = facts.slice(1);
  const fact = f => `<div class="city-fact" lang="es">${f.title ? `<strong>${esc(f.title)}</strong>` : ''}<p>${esc(f.text)}</p>${f.sourceUrl ? `<a href="${esc(f.sourceUrl)}" target="_blank" rel="noopener noreferrer" lang="pt-BR">Fonte ↗</a>` : ''}</div>`;
  const ref = (label, r) => r ? `<p class="city-ref-line"><span class="sub">${label}:</span> <span lang="es">${esc(r.name)}</span>${r.url ? ` <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">página oficial ↗</a>` : ''}</p>` : '';
  const p = city.photo, credit = !city.fallback && p.author ? `<p class="photo-credit">Foto: ${esc(p.author)}${p.license ? `, ${p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>` : esc(p.license)}` : ''}${p.sourceUrl ? `. <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons ↗</a>` : ''}</p>` : '';
  const main = city.id === 'donostia';
  return `<div class="xp-city-head"><h2 id="xp-city-title" tabindex="-1" data-xp-focus>Hoje em <span lang="es">${esc(city.name)}</span></h2>${main ? '<span class="tag">Cidade principal da jornada</span>' : next ? `<span class="sub">Donostia volta ${next === 1 ? 'amanhã' : `em ${next} dias`}</span>` : ''}</div>
  <dl class="city-now"><div><dt>Hora local</dt><dd data-xp-clock>${esc(localTime(city))}</dd></div><div data-xp-weather>${weatherHTML()}</div></dl>
  ${first ? `<h3 class="city-facts-title">Curiosidade em espanhol</h3>${fact(first)}` : ''}
  ${rest.length || city.church || city.hospital ? `<details class="city-more"><summary>${rest.length ? `Mais ${plural(rest.length, 'curiosidade', 'curiosidades')}` : 'Referências da cidade'}</summary>${rest.map(fact).join('')}${ref('Igreja', city.church)}${ref('Hospital', city.hospital)}</details>` : ''}
  ${credit}${p.adaptation ? '<p class="photo-credit">Imagem adaptada; detalhes e licença nos créditos.</p>' : ''}<button type="button" class="link-btn" data-xp-go="sources">Fontes e créditos das fotos</button>`;
 }
 function localTime(city) {
  const now = Date.now();
  const day = new Intl.DateTimeFormat('pt-BR', {timeZone: city.timezone, weekday: 'long'}).format(now);
  return `${day}, ${clock(now, city.timezone)}`;
 }
 function startCityClock(panel, city, g) {
  const tick = () => {const el = panel.querySelector('[data-xp-clock]'); if (el) el.textContent = localTime(city);if (alive(g) && !document.hidden && !deps.appBusy() && Date.now()-s.weatherAt >= 600000) loadWeather(g,city);};
  const timer = setInterval(tick, 15000);
  ctl.signal.addEventListener('abort', () => clearInterval(timer), {once: true});
  document.addEventListener('visibilitychange', () => {if (!document.hidden) tick();}, {signal: ctl.signal});
 }
 function weatherHTML() {
  const w = s.weather;
  // Rótulo fixo do contrato; o link do Open-Meteo fica em Referências, junto dos créditos.
  const label = 'Tempo estimado · Open-Meteo';
  if (s.weatherStatus === 'loading' || s.weatherStatus === 'idle') return `<dt>${label}</dt><dd><span class="skeleton xp-skel-line" aria-hidden="true"></span><span class="visually-hidden">Carregando o tempo.</span></dd>`;
  if (!w?.available) return `<dt>${label}</dt><dd class="sub">Indisponível agora. <button type="button" class="link-btn" data-xp-weather-retry>Tentar de novo</button></dd>`;
  const name = WEATHER[w.code];
  const at = w.observedAt ? `Estimativa das ${clock(w.observedAt, s.city?.timezone || 'Europe/Madrid')}, hora local` : '';
  return `<dt>${label}</dt><dd><span class="weather-temp">${Math.round(w.temperatureC)} °C</span>${name ? ` · ${esc(name)}` : ''}${at || w.stale ? `<span class="weather-meta">${esc(at)}${w.stale ? `${at ? '. ' : ''}Último dado disponível, pode estar desatualizado.` : ''}</span>` : ''}</dd>`;
 }
 async function loadWeather(g, city) {
  // Mantém o último dado da mesma cidade enquanto busca; o servidor guarda 10 minutos.
  const seq = ++s.weatherSeq;s.weatherAt = Date.now();
  if (s.weather?.cityId !== city.id) {s.weather = null; s.weatherStatus = 'loading'; paintWeather();}
  try {
   const data = await deps.api(`/api/spain?city=${encodeURIComponent(city.id)}`, {signal: ctl.signal});
   if (!alive(g) || seq !== s.weatherSeq) return;
   s.weather = normalizeWeather(data, city.id); s.weatherStatus = 'ready';
  } catch {
   if (!alive(g) || seq !== s.weatherSeq) return;
   s.weather = null; s.weatherStatus = 'error';
  }
  paintWeather();
 }
 function paintWeather() {
  const el = slot('city')?.querySelector('[data-xp-weather]'); if (!el) return;
  const hadFocus = el.contains(document.activeElement);
  el.innerHTML = weatherHTML(); bind(el); deps.hold?.(el);
  if (hadFocus) slot('city')?.querySelector('[data-xp-focus]')?.focus({preventScroll: true});
 }

 // ---------- Evolução: os dois perfis, álbum e atualização a cada 60 s ----------
 function mountProgress(g) {
  paintProgress();
  const album = slot('album'); if (album) {album.innerHTML = albumShellHTML(); bindAlbumForm(album); paintAlbumList(); paintStorage(); deps.hold?.(album);}
  refreshProgress(g); refreshAlbum(g); deps.refreshJourney?.();
  const timer = setInterval(() => poll(g), POLL_MS);
  ctl.signal.addEventListener('abort', () => clearInterval(timer), {once: true});
  document.addEventListener('visibilitychange', () => {if (!document.hidden && Date.now() - Math.max(s.progressAt, 0) >= POLL_MS) poll(g);}, {signal: ctl.signal});
  window.addEventListener('focus', () => {if (Date.now() - s.progressAt >= FOCUS_MIN_MS) poll(g);}, {signal: ctl.signal});
 }
 // Não atualiza com a aba oculta, com operação do app em andamento ou durante preparo/envio de foto.
 function poll(g) {
  if (!alive(g) || document.hidden || deps.appBusy() || uploading || preparing) return;
  refreshProgress(g); refreshAlbum(g); deps.refreshJourney?.();
 }
 async function refreshProgress(g) {
  if (s.inflight.progress) return;
  s.inflight.progress = true;
  if (!s.progress) {s.progressStatus = 'loading';}
  try {
   const data = await deps.api('/api/shared-progress', {signal: ctl?.signal});
   if (!alive(g)) return;
   s.progress = normalizeProgress(data, profile); s.progressStatus = 'ready'; s.progressAt = Date.now();
  } catch {
   if (!alive(g)) return;
   s.progressStatus = 'error';
  } finally {if (alive(g)) s.inflight.progress = false;}
  paintProgress();
 }
 function paintProgress() {
  paint(slot('shared-progress'), progressHTML());
  const stamp = slot('shared-progress')?.querySelector('[data-xp-progress-updated]');
  if (stamp) stamp.textContent = s.progressAt ? `Atualizado às ${new Date(s.progressAt).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}` : '';
 }
 function progressHTML() {
  const head = `<div class="xp-section-head"><h2 id="shared-progress-title" tabindex="-1" data-xp-focus>Nós dois</h2><span class="sub xp-updated" data-xp-progress-updated></span></div>`;
  const err = s.progressStatus === 'error' ? `<p class="notice action-error" role="status">${s.progress ? 'Não foi possível atualizar agora. Mostrando os dados anteriores.' : 'Não foi possível carregar a evolução compartilhada agora.'} <button type="button" class="link-btn" data-xp-progress-retry>Tentar de novo</button></p>` : '';
  if (!s.progress) return head + (err || `<div class="shared-grid" aria-hidden="true"><span class="skeleton xp-skel-card"></span><span class="skeleton xp-skel-card"></span></div><p class="visually-hidden">Carregando a evolução compartilhada.</p>`);
  if (!s.progress.members.length) return head + err + '<div class="empty">A evolução aparece depois das primeiras respostas enviadas.</div>';
  return head + err + `<p class="sub shared-intro">Cada perfil tem a própria escala. Os gráficos mostram prática registrada, não nível nem prontidão para a prova.</p><div class="shared-grid">${s.progress.members.map(memberHTML).join('')}</div>`;
 }
 function memberHTML(m) {
  const me = m.id === profile;
  const maxSkill = Math.max(1, ...m.skills.map(x => x.count)), maxDay = Math.max(1, ...m.activity.map(d => d.attempts));
  const r = m.rhythm;
  const rhythm = r.activeDaysThisWeek ? `${plural(r.activeDaysThisWeek, 'dia', 'dias')} com prática nesta semana` : 'Nesta semana ainda não há prática registrada';
  const last = r.lastPracticedAt ? `Última resposta em ${dateShort(r.lastPracticedAt)}` : 'Nenhuma resposta registrada ainda';
  const days = m.activity;
  return `<section class="member-progress" aria-labelledby="mp-${esc(m.id)}"><div class="member-head"><h3 id="mp-${esc(m.id)}">${esc(m.name)}${me ? ' <span class="sub">(você)</span>' : ''}</h3><span class="sub">${plural(m.totalAttempts, 'resposta', 'respostas')} no total</span></div>
  <h4 class="chart-title">Por habilidade · todo o histórico</h4>
  <ul class="skill-bars">${m.skills.map(x => `<li><span class="skill-label">${x.label}</span><span class="skill-bar" aria-hidden="true"><i style="width:${x.count ? Math.max(4, Math.round(x.count / maxSkill * 100)) : 0}%"></i></span><span class="skill-count">${x.count}</span></li>`).join('')}</ul>
  <h4 class="chart-title">Por dia · últimos 14 dias</h4>
  ${days.length ? `<div class="day-chart" aria-hidden="true">${days.map(d => `<span class="day-col" title="${esc(dayShort(d.day))}: ${esc(plural(d.attempts, 'resposta', 'respostas'))}, ${esc(plural(d.distinctTasks, 'tarefa', 'tarefas'))}"><i data-zero="${!d.attempts}" style="height:${d.attempts ? Math.max(8, Math.round(d.attempts / maxDay * 100)) : 0}%"></i></span>`).join('')}</div><div class="day-axis" aria-hidden="true"><span>${esc(dayShort(days[0].day))}</span><span>${esc(dayShort(days[days.length - 1].day))}</span></div>
  <div class="visually-hidden"><table><caption>Respostas de ${esc(m.name)} por dia</caption><thead><tr><th scope="col">Dia</th><th scope="col">Respostas</th><th scope="col">Tarefas diferentes</th></tr></thead><tbody>${days.map(d => `<tr><th scope="row">${esc(dayShort(d.day))}</th><td>${d.attempts}</td><td>${d.distinctTasks}</td></tr>`).join('')}</tbody></table></div>` : '<p class="sub">Sem dias no período.</p>'}
  <p class="member-rhythm">${esc(rhythm)}.<span class="sub">${esc(last)}</span></p></section>`;
 }
 function updatedHTML(at) {return at ? `<span class="sub xp-updated">Atualizado às ${new Date(at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>` : '';}

 // Álbum: o formulário é pintado uma vez por montagem e nunca é repintado pela atualização.
 function albumShellHTML() {
  const partner = profile === 'luiz' ? 'alana' : 'luiz';
  return `<div class="xp-section-head"><h2 id="album-title" tabindex="-1" data-xp-focus>Álbum a dois</h2><span class="sub" data-xp-storage></span></div>
  <form class="album-form" novalidate>
   <div class="album-pick"><button type="button" class="secondary" data-xp-pick>Escolher foto</button><input type="file" accept="image/*" hidden data-xp-file aria-label="Escolher foto do aparelho"><p class="sub album-help">A foto é reduzida neste aparelho (até 1600 px, sem localização) e só aparece para vocês dois, dentro do app. Nada é enviado antes de tocar em Compartilhar.</p></div>
   <figure class="album-preview" data-xp-preview hidden><img alt="Prévia da foto escolhida"><figcaption class="sub" data-xp-preview-info></figcaption></figure>
   <label for="album-caption">Legenda <span class="sub">(opcional)</span></label>
   <textarea id="album-caption" class="album-caption" maxlength="${UPLOAD.maxCaption}" rows="3" placeholder="Um momento de estudo, um lugar, um incentivo…"></textarea>
   <div class="album-meta"><span class="sub" data-xp-count>0 de ${UPLOAD.maxCaption} caracteres</span></div>
   <label for="album-target">Para quem</label>
   <select id="album-target"><option value="both">Nós dois</option><option value="${partner}">Incentivo para ${NAMES[partner]}</option></select>
   <p class="album-status" data-xp-album-status role="status" aria-live="polite"></p>
   <button type="submit" class="primary" data-xp-send disabled>Compartilhar foto</button>
  </form>
  <span class="sub xp-updated" data-xp-album-updated></span><div data-xp-album-list></div>`;
 }
 function savePhotoText(d) {try {sessionStorage.setItem(`habla-album:${profile}`,JSON.stringify({caption:d.caption,target:d.target,id:d.id,uncertain:d.uncertain,resumeId:d.resumeId}));} catch {}}
 function draft() {
  if (!photoDrafts.has(profile)) {
   let text = {};try {text = JSON.parse(sessionStorage.getItem(`habla-album:${profile}`)) || {};} catch {}
   const savedId = typeof text.id==='string' && /^[0-9a-f-]{36}$/.test(text.id) ? text.id : null;
   photoDrafts.set(profile, {id: savedId, resumeId: text.resumeId===savedId?savedId:null, blob: null, preview: '', width: 0, height: 0, caption: typeof text.caption==='string'?text.caption.slice(0,UPLOAD.maxCaption):'', target: ['both',profile==='luiz'?'alana':'luiz'].includes(text.target)?text.target:'both', error: text.uncertain && savedId ? 'Conferindo a confirmação do envio no álbum…' : '', sendFailed: !!text.uncertain, uncertain: !!text.uncertain && !!savedId});
  }
  return photoDrafts.get(profile);
 }
 function bindAlbumForm(album) {
  const form = album.querySelector('form'), file = form.querySelector('[data-xp-file]'), caption = form.querySelector('textarea'), target = form.querySelector('select');
  const d = draft(), sig = {signal: ctl.signal};
  caption.value = d.caption; target.value = [...target.options].some(o => o.value === d.target) ? d.target : 'both';
  form.querySelector('[data-xp-pick]').addEventListener('click', () => {if (uploading || preparing) return; file.value = ''; file.click();}, sig);
  file.addEventListener('change', () => {const chosen = file.files?.[0]; if (chosen) prepare(chosen);}, sig);
  // Nunca troca o id ao editar: uma confirmação perdida não pode criar outra cópia.
  const edited = () => {if (!d.uncertain) d.sendFailed = false;};
  caption.addEventListener('input', () => {d.caption = caption.value.slice(0, UPLOAD.maxCaption); edited(); savePhotoText(d); syncForm();}, sig);
  target.addEventListener('change', () => {d.target = target.value; edited(); savePhotoText(d); syncForm();}, sig);
  form.addEventListener('submit', event => {event.preventDefault(); send();}, sig);
  syncForm();
 }
 function syncForm(statusText) {
  const album = slot('album'); if (!album) return;
  const d = draft(), form = album.querySelector('form'), full = albumFull();
  const preview = form.querySelector('[data-xp-preview]'), img = preview.querySelector('img');
  preview.hidden = !d.preview;
  if (d.preview && img.getAttribute('src') !== d.preview) img.src = d.preview;
  if (!d.preview) img.removeAttribute('src');
  form.querySelector('[data-xp-preview-info]').textContent = d.blob ? `Pronta para enviar: ${d.width} × ${d.height} px, ${Math.round(d.blob.size / 1000)} KB.` : '';
  form.querySelector('[data-xp-count]').textContent = `${d.caption.length} de ${UPLOAD.maxCaption} caracteres`;
  const pick = form.querySelector('[data-xp-pick]'), send = form.querySelector('[data-xp-send]');
  pick.textContent = preparing ? 'Preparando a foto…' : d.blob ? 'Trocar foto' : 'Escolher foto';
  send.textContent = uploading ? 'Enviando…' : d.sendFailed && d.blob ? 'Tentar enviar de novo' : 'Compartilhar foto';
  const appBusy = deps.appBusy();
  pick.disabled = preparing || uploading || appBusy || full || d.uncertain;
  send.disabled = !d.blob || preparing || uploading || appBusy || (full && !d.uncertain);
  form.querySelector('textarea').disabled = form.querySelector('select').disabled = uploading || appBusy || d.uncertain;
  form.querySelector('[data-xp-pick]').setAttribute('aria-busy', String(preparing));
  send.setAttribute('aria-busy', String(uploading));
  const status = form.querySelector('[data-xp-album-status]');
  const text = statusText ?? (full && !d.uncertain ? `O álbum chegou ao limite (${s.album.storage.maxCount} fotos ou ${mb(s.album.storage.maxBytes)} MB). Novas fotos não cabem por enquanto.` : d.error);
  status.textContent = text || '';
  status.classList.toggle('error', !!(d.error && text === d.error) || (full && !statusText));
 }
 function albumFull() {const a = s.album; return !!a && (a.items.length >= a.storage.maxCount || a.storage.usedBytes >= a.storage.maxBytes);}
 async function prepare(chosen) {
  const owner = profile, d = draft();
  preparing = true; d.error = ''; syncForm('Preparando a foto neste aparelho…');
  try {
   const out = await compressPhoto(chosen);
   Object.assign(d, {id: d.resumeId || uid(), resumeId:null, blob: out.blob, preview: out.preview, width: out.width, height: out.height, error:'',sendFailed:false,uncertain:false});savePhotoText(d);
  } catch (error) {
   d.error = error.message || 'Não foi possível preparar esta foto.';
  } finally {preparing = false;}
  if (owner === profile && page === 'progress') {syncForm(); slot('album')?.querySelector(d.error ? '[data-xp-pick]' : 'textarea')?.focus();}
 }
 async function send() {
  const d = draft(), owner = profile, g = gen;
  if (!d.blob || uploading || preparing) return;
  const a = s.album?.storage;
  if (a && !d.uncertain && (s.album.items.length >= a.maxCount || a.usedBytes + d.blob.size > a.maxBytes)) {d.error = `Esta foto não cabe no álbum (limite de ${a.maxCount} fotos e ${mb(a.maxBytes)} MB).`; syncForm(); return;}
  const reconcile = d.uncertain;uploading = true; d.error = '';d.uncertain = true;savePhotoText(d);syncForm('Enviando a foto…');
  const body = new FormData();
  body.append('id', d.id); body.append('profile', owner); body.append('target', d.target); body.append('caption', d.caption.trim());
  body.append('photo', d.blob, `foto-${d.id}.jpg`);
  try {
   // Sem signal: o envio termina mesmo se a tela mudar; repetir é seguro porque o servidor é idempotente pelo id.
   const result = await deliverPhoto(deps.api, {id:d.id,body,reconcile});
   photoDrafts.delete(owner);try {sessionStorage.removeItem(`habla-album:${owner}`);} catch {}
   deps.toast(result?.created === false ? 'Esta foto já estava no álbum.' : 'Foto compartilhada no álbum a dois.');
  } catch (error) {
   d.uncertain = error.uncertain ?? (!error.status || error.status >= 500 || error.status === 409);
   d.error = `${error.message || 'Não foi possível enviar a foto.'} A foto e a legenda continuam aqui.${d.uncertain ? ' Toque em tentar de novo: conferimos o álbum antes de reenviar. Aguarde a confirmação antes de editar.' : ' Você pode ajustar e tentar de novo.'}`; d.sendFailed = true;savePhotoText(d);
  } finally {uploading = false;}
  if (alive(g) && owner === profile && page === 'progress') {
   const album = slot('album'), fresh = draft();
   if (album && !d.error) {album.querySelector('textarea').value = fresh.caption; album.querySelector('select').value = fresh.target;}
   syncForm(); refreshAlbum(g, true);
  }
 }
 async function refreshAlbum(g, force = false) {
  if (s.inflight.album && !force) return;
  s.inflight.album = true;
  const seq = ++s.albumSeq;
  if (!s.album) s.albumStatus = 'loading';
  try {
   const data = await deps.api('/api/photos', {signal: ctl?.signal});
   if (!alive(g) || seq !== s.albumSeq) return;
   s.album = normalizeAlbum(data); s.albumStatus = 'ready'; s.albumAt = Date.now();
   const d=draft();
   if(d.uncertain && d.id && !uploading){
    if(s.album.items.some(p=>p.id===d.id)){
     photoDrafts.delete(profile);try{sessionStorage.removeItem(`habla-album:${profile}`);}catch{}
     const form=slot('album')?.querySelector('form');if(form){form.querySelector('textarea').value='';form.querySelector('select').value='both';}
     deps.toast('A foto já estava salva no álbum. Confirmação recuperada.');
    }else if(!d.blob){
     d.uncertain=false;d.resumeId=d.id;d.error='A confirmação não foi encontrada. Escolha novamente a mesma foto para concluir o envio; a legenda foi preservada.';savePhotoText(d);
    }
   }
  } catch {
   if (!alive(g) || seq !== s.albumSeq) return;
   s.albumStatus = 'error';
  } finally {if (alive(g) && seq === s.albumSeq) s.inflight.album = false;}
  if (!alive(g) || seq !== s.albumSeq) return;
  paintStorage(); syncForm(); paintAlbumList();
 }
 function paintStorage() {
  const el = slot('album')?.querySelector('[data-xp-storage]'); if (!el) return;
  const a = s.album; el.textContent = a ? `${a.items.length} de ${a.storage.maxCount} fotos · ${mb(a.storage.usedBytes)} de ${mb(a.storage.maxBytes)} MB` : '';
 }
 function paintAlbumList() {
  const el = slot('album')?.querySelector('[data-xp-album-list]'); if (!el) return;
  const stamp = slot('album')?.querySelector('[data-xp-album-updated]');
  if (stamp) stamp.innerHTML = updatedHTML(s.albumAt);
  // Mantém o foco de quem navega pelo álbum: repinta na próxima atualização (exceto no botão de tentar de novo).
  if (el.contains(document.activeElement) && !document.activeElement.matches('[data-xp-album-retry]')) return;
  const err = s.albumStatus === 'error' ? `<p class="notice action-error" role="status">${s.album ? 'Não foi possível atualizar o álbum. Mostrando as fotos anteriores.' : 'Não foi possível carregar o álbum agora.'} <button type="button" class="link-btn" data-xp-album-retry>Tentar de novo</button></p>` : '';
  let html;
  if (!s.album) html = err || '<div class="album-grid" aria-hidden="true"><span class="skeleton xp-skel-photo"></span><span class="skeleton xp-skel-photo"></span></div><p class="visually-hidden">Carregando o álbum.</p>';
  else if (!s.album.items.length) html = err + '<div class="empty">Ainda não há fotos. A primeira pode ser um momento de estudo, um lugar ou um bilhete de incentivo.</div>';
  else html = err + `<ul class="album-grid">${s.album.items.map(p => `<li><figure class="album-item"><a href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" alt="${esc(p.caption ? `Foto: ${p.caption}` : `Foto enviada por ${NAMES[p.profile]}`)}" loading="lazy" decoding="async"></a><figcaption>${p.caption ? `<p>${esc(p.caption)}</p>` : ''}<span class="sub">${esc(NAMES[p.profile])}${p.createdAt && Number.isFinite(Date.parse(p.createdAt)) ? `, ${esc(dateShort(p.createdAt))}` : ''}</span><span class="tag album-target">${p.target === 'both' ? 'Nós dois' : `Incentivo para ${esc(NAMES[p.target])}`}</span></figcaption></figure></li>`).join('')}</ul>`;
  paint(el, html);
 }

 // ---------- Referências: créditos e fontes das fotos ----------
 async function mountCredits(g) {
  const el = slot('credits'); if (!el) return;
  const mod = await loadCities();
  if (!alive(g)) return;
  const list = (mod?.list || []).map(normalizeCity).filter(Boolean);
  paint(el, list.length ? `<ul class="credits">${list.map(c => {const p = c.photo; return `<li><strong lang="es">${esc(c.name)}</strong><span class="sub">${p.author ? `Foto: ${esc(p.author)} / Wikimedia Commons${p.title ? ` / “${esc(p.title)}”` : ''}` : 'Foto sem crédito informado'}${p.license ? `, ${p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>` : esc(p.license)}` : ''}</span>${p.adaptation ? `<span class="sub">${esc(p.adaptation)} No app: recorte em faixa, contraste, escurecimento e fade. Versão adaptada sob a mesma licença.</span>` : ''}${p.sourceUrl ? `<a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons ↗</a>` : ''}${c.facts.some(f => f.sourceUrl) ? `<span class="sub">Curiosidades: ${c.facts.filter(f => f.sourceUrl).map((f, i) => `<a href="${esc(f.sourceUrl)}" target="_blank" rel="noopener noreferrer">fonte ${i + 1}</a>`).join(', ')}</span>` : ''}</li>`;}).join('')}</ul><p class="sub">Tempo estimado por modelo meteorológico do <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>, não por estação local em tempo real.</p>` : '<p class="sub">A paisagem de La Concha é uma ilustração original do app. Os créditos das fotos aparecem quando o catálogo de cidades estiver disponível.</p>');
 }

 function bind(el) {
  if (!ctl) return;
  const sig = {signal: ctl.signal}, g = gen;
  el.querySelectorAll('[data-xp-go]').forEach(b => b.addEventListener('click', () => deps.go(b.dataset.xpGo), sig));
  el.querySelectorAll('[data-xp-weather-retry]').forEach(b => b.addEventListener('click', () => s.city && loadWeather(g, s.city), sig));
  el.querySelectorAll('[data-xp-progress-retry]').forEach(b => b.addEventListener('click', () => refreshProgress(g), sig));
  el.querySelectorAll('[data-xp-album-retry]').forEach(b => b.addEventListener('click', () => refreshAlbum(g, true), sig));
 }

 return {
  mount, unmount,
  // O app consulta antes de trocar de página ou perfil.
  busy: () => uploading || preparing,
  // Após uma operação do app, os botões do álbum voltam ao estado correto.
  sync: () => {if (page === 'progress') syncForm();}
 };
}
