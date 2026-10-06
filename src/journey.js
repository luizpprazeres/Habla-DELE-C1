// Jornada cooperativa: reconhece respostas enviadas, sem notas, streak, XP ou ranking.
// Tudo é recalculado a partir do histórico completo; conquistas nunca expiram.
export const PROFILE_IDS = ['luiz', 'alana'];
export const TIME_ZONE = 'America/Maceio';
const KINDS = ['reading', 'listening', 'writing', 'speaking'];
const KIND_LABELS = { reading: 'leitura', listening: 'escuta', writing: 'escrita', speaking: 'fala' };
const FALLBACK_NAMES = { luiz: 'Luiz', alana: 'Alana' };

export class JourneyError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

export const MILESTONES = [
 { id: 'first-step', title: 'Primeira resposta enviada', description: 'Uma resposta real registrada no histórico, em qualquer habilidade.' },
 { id: 'two-skills', title: 'Duas habilidades praticadas', description: 'Respostas enviadas em duas habilidades diferentes.' },
 { id: 'four-skills', title: 'As quatro habilidades praticadas', description: 'Leitura, escuta, escrita e fala já têm respostas enviadas. Registra prática, não nível.' },
 { id: 'first-revision', title: 'Primeira reescrita', description: 'Um texto reescrito a partir da correção recebida.' },
 { id: 'first-dialogue', title: 'Primeiro diálogo continuado', description: 'Resposta oral a uma pergunta de seguimento do tutor.' }
];
const MILESTONE_IDS = MILESTONES.map(m => m.id);

export const CELEBRATION_MESSAGES = {
 effort: 'Vi o seu esforço nesta etapa. Sigo com você.',
 revision: 'Voltar ao texto e ajustar é o trabalho que conta. Admiro isso.',
 together: 'Mais um passo nosso rumo a novembro.'
};

export const SHARED_GOAL = {
 title: 'Objetivo da semana a dois',
 description: 'Cada um envia respostas em duas tarefas diferentes e faz ao menos uma reescrita ou continuação de diálogo nesta semana.'
};

export const CITIES = [
 { church: 'Catedral del Buen Pastor', churchUrl: 'https://catedralbuenpastor.org/catedral/conoce-el-templo/', id: 'donostia', name: 'San Sebastián / Donostia', place: 'Paseo de La Concha', hospital: 'Hospital Universitario Donostia', cityUrl: 'https://donostia.eus/es/como-es-ciudad/parques-jardines/paseo-concha', hospitalUrl: 'https://www.osakidetza.euskadi.eus/osi-donostialdea-hospital-universitario-presentacion/webosk00-donoscon/es/' },
 { church: 'Catedral de Santiago de Bilbao', churchUrl: 'https://catedralbilbao.com/la-catedral/', id: 'bilbao', name: 'Bilbao', place: 'Bilbao en un día', hospital: 'Hospital Universitario Basurto', cityUrl: 'https://turismo.euskadi.eus/es/top-viajes/bilbao-en-un-dia/webtur00-exptop/es/', hospitalUrl: 'https://www.osakidetza.euskadi.eus/osi-bilbao-basurto-hospital-universitario-presentacion/webosk00-bibascon/es/' },
 { church: 'Catedral de Santiago de Compostela', churchUrl: 'https://catedraldesantiago.es/visitas/', id: 'santiago', name: 'Santiago de Compostela', place: 'Ciudad histórica', hospital: 'Hospital Clínico Universitario de Santiago', cityUrl: 'https://www.turismo.gal/que-visitar/cidades/santiago-de-compostela?langId=es_ES', hospitalUrl: 'https://xxisantiago.sergas.es/Paxinas/web.aspx?idContido=183&idLista=3&idTax=-1&tipo=paxtab' }
];

// Somente metadados: comparação de reescrita ocorre no SQL; nenhum texto sai do banco.
export const ATTEMPTS_SQL = `SELECT a.id,a.task_id,a.profile_id,a.parent_attempt_id,a.created_at,t.kind,
 CASE WHEN a.feedback IS NOT NULL AND json_valid(a.feedback) THEN 1 ELSE 0 END AS has_feedback,
 CASE WHEN a.feedback IS NOT NULL AND json_valid(a.feedback) THEN CASE WHEN length(trim(COALESCE(json_extract(a.feedback,'$.followUp'),'')))>0 THEN 1 ELSE 0 END ELSE 0 END AS has_follow_up,
 CASE WHEN a.parent_attempt_id IS NOT NULL AND trim(a.answer)<>trim(COALESCE((SELECT p.answer FROM attempts p WHERE p.id=a.parent_attempt_id),a.answer)) THEN 1 ELSE 0 END AS has_changed
 FROM attempts a JOIN tasks t ON t.id=a.task_id WHERE a.profile_id=t.profile_id`;
const CELEBRATIONS_SQL = 'SELECT id,from_profile,to_profile,milestone_id,message_id,created_at FROM journey_celebrations';

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short' });
const WEEKDAY = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export function localDay(date) { return dayFormat.format(date); }
function addDays(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const short = day => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

// Semana de segunda a domingo no horário de Maceió.
export function journeyWeek(now = new Date()) {
 const today = localDay(now), start = addDays(today, -WEEKDAY[weekdayFormat.format(now)]), end = addDays(start, 7);
 return { start, end, label: `Semana de ${short(start)} a ${short(addDays(start, 6))}` };
}
export function inWeek(createdAt, week) { const date = new Date(createdAt); if (Number.isNaN(date.getTime())) return false; const day = localDay(date); return day >= week.start && day < week.end; }

export function normalizeAttempts(rows) {
 const byId = new Map();
 for (const r of rows || []) {
  if (!r || typeof r.id !== 'string' || byId.has(r.id) || !PROFILE_IDS.includes(r.profile_id) || !KINDS.includes(r.kind) || typeof r.task_id !== 'string') continue;
  const time = new Date(r.created_at).getTime();
  if (Number.isNaN(time)) continue;
  byId.set(r.id, { id: r.id, taskId: r.task_id, profileId: r.profile_id, parentId: r.parent_attempt_id || null, kind: r.kind, createdAt: new Date(time).toISOString(), time, hasFeedback: !!Number(r.has_feedback), hasFollowUp: !!Number(r.has_follow_up), hasChanged: !!Number(r.has_changed) });
 }
 return [...byId.values()].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
}

// Revisão: escrita filha de tentativa corrigida da mesma tarefa e perfil.
// Diálogo: fala filha de tentativa cujo feedback trouxe pergunta de seguimento real.
export function linkedType(attempt, byId) {
 if (!attempt.parentId || attempt.parentId === attempt.id) return null;
 const parent = byId.get(attempt.parentId);
 if (!parent || parent.profileId !== attempt.profileId || parent.taskId !== attempt.taskId || parent.kind !== attempt.kind || parent.time > attempt.time || !parent.hasFeedback) return null;
 if (attempt.kind === 'writing' && attempt.hasChanged) return 'revision';
 if (attempt.kind === 'speaking' && parent.hasFollowUp) return 'dialogue';
 return null;
}

export function memberProgress(all, profileId, week) {
 const byId = new Map(all.map(a => [a.id, a])), mine = all.filter(a => a.profileId === profileId);
 const earned = Object.fromEntries(MILESTONE_IDS.map(id => [id, null])), kinds = new Set();
 const weeklyTasks = new Set(), weeklyLinkedTasks = new Set();
 for (const a of mine) {
  earned['first-step'] ??= a.createdAt;
  kinds.add(a.kind);
  if (kinds.size >= 2) earned['two-skills'] ??= a.createdAt;
  if (kinds.size === KINDS.length) earned['four-skills'] ??= a.createdAt;
  const linked = linkedType(a, byId);
  if (linked === 'revision') earned['first-revision'] ??= a.createdAt;
  if (linked === 'dialogue') earned['first-dialogue'] ??= a.createdAt;
  if (inWeek(a.createdAt, week)) { weeklyTasks.add(a.taskId); if (linked) weeklyLinkedTasks.add(a.taskId); }
 }
 const weekly = { practice: weeklyTasks.size, revision: weeklyLinkedTasks.size };
 return { earned, weekly, kinds, nextAction: nextAction(mine.length, weekly, kinds) };
}

function nextAction(total, weekly, kinds) {
 if (!total) return 'Enviar uma primeira resposta, em qualquer habilidade.';
 if (weekly.practice < 2) return weekly.practice ? 'Responder a mais uma tarefa diferente nesta semana.' : 'Responder a duas tarefas diferentes nesta semana.';
 if (weekly.revision < 1) return 'Reescrever um texto corrigido ou responder à pergunta de seguimento de uma fala.';
 const missing = KINDS.find(k => !kinds.has(k));
 if (missing) return `Experimentar ${KIND_LABELS[missing]}: ainda não há resposta nessa habilidade.`;
 return 'Parte da semana concluída. Seguir no ritmo que a agenda permitir.';
}

export const sharedDone = weekly => weekly.practice >= 2 && weekly.revision >= 1;

function celebrationView(row) {
 if (!row || !MILESTONE_IDS.includes(row.milestone_id) || !CELEBRATION_MESSAGES[row.message_id] || !PROFILE_IDS.includes(row.from_profile) || !PROFILE_IDS.includes(row.to_profile)) return null;
 return { id: row.id, from: row.from_profile, to: row.to_profile, milestoneId: row.milestone_id, messageId: row.message_id, message: CELEBRATION_MESSAGES[row.message_id], createdAt: row.created_at };
}

export function buildJourney({ viewer, profiles = [], attempts = [], celebrations = [], now = new Date() }) {
 if (!PROFILE_IDS.includes(viewer)) throw new JourneyError('Escolha Luiz ou Alana.');
 const week = journeyWeek(now), all = normalizeAttempts(attempts), cels = celebrations.map(celebrationView).filter(Boolean);
 const names = Object.fromEntries(PROFILE_IDS.map(id => [id, profiles.find(p => p.id === id)?.name || FALLBACK_NAMES[id]]));
 const order = [viewer, ...PROFILE_IDS.filter(id => id !== viewer)];
 const members = order.map(id => {
  const progress = memberProgress(all, id, week);
  const milestones = MILESTONES.map(m => {
   const celebratedBy = [...new Set(cels.filter(c => c.to === id && c.milestoneId === m.id).map(c => c.from))];
   const earnedAt = progress.earned[m.id];
   return { ...m, earnedAt, celebratedBy, canCelebrate: viewer !== id && !!earnedAt && !celebratedBy.includes(viewer) };
  });
  return { id, name: names[id], milestones, weekly: progress.weekly, nextAction: progress.nextAction };
 });
 const contributions = members.map(m => ({ profile: m.id, name: m.name, done: sharedDone(m.weekly) }));
 return {
  week: { start: week.start, label: week.label },
  members,
  shared: { ...SHARED_GOAL, complete: contributions.every(c => c.done), contributions },
  cities: CITIES.map(c => ({ ...c })),
  celebrations: cels
 };
}

export function validateCelebration(input) {
 const { profile, target, milestoneId, messageId } = input || {};
 if (!PROFILE_IDS.includes(profile) || !PROFILE_IDS.includes(target)) throw new JourneyError('Escolha Luiz ou Alana.');
 if (profile === target) throw new JourneyError('A celebração é para o outro perfil.');
 if (!MILESTONE_IDS.includes(milestoneId)) throw new JourneyError('Conquista desconhecida.');
 if (typeof messageId !== 'string' || !Object.hasOwn(CELEBRATION_MESSAGES, messageId)) throw new JourneyError('Mensagem inválida.');
 return { profile, target, milestoneId, messageId };
}

async function loadAttempts(db, profileId) {
 const sql = profileId ? `${ATTEMPTS_SQL} AND a.profile_id=? ORDER BY a.created_at,a.id` : `${ATTEMPTS_SQL} ORDER BY a.created_at,a.id`;
 const statement = db.prepare(sql);
 return (await (profileId ? statement.bind(profileId) : statement).all()).results || [];
}

export async function loadJourney(db, viewer, now = new Date()) {
 if (!PROFILE_IDS.includes(viewer)) throw new JourneyError('Escolha Luiz ou Alana.');
 const [profiles, attempts, celebrations] = await Promise.all([
  db.prepare('SELECT id,name FROM profiles').all().then(r => r.results || []),
  loadAttempts(db),
  db.prepare(`${CELEBRATIONS_SQL} ORDER BY created_at,id`).all().then(r => r.results || [])
 ]);
 return buildJourney({ viewer, profiles, attempts, celebrations, now });
}

// Idempotente por (from, to, milestone): repetir devolve a celebração original sem alterá-la.
export async function celebrate(db, input, now = new Date(), newId = () => crypto.randomUUID()) {
 const valid = validateCelebration(input);
 const progress = memberProgress(normalizeAttempts(await loadAttempts(db, valid.target)), valid.target, journeyWeek(now));
 if (!progress.earned[valid.milestoneId]) throw new JourneyError('Esta conquista ainda não foi registrada no histórico.', 409);
 const inserted = await db.prepare('INSERT INTO journey_celebrations(id,from_profile,to_profile,milestone_id,message_id,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(from_profile,to_profile,milestone_id) DO NOTHING RETURNING id,from_profile,to_profile,milestone_id,message_id,created_at')
  .bind(newId(), valid.profile, valid.target, valid.milestoneId, valid.messageId, now.toISOString()).first();
 const row = inserted || await db.prepare(`${CELEBRATIONS_SQL} WHERE from_profile=? AND to_profile=? AND milestone_id=?`).bind(valid.profile, valid.target, valid.milestoneId).first();
 const celebration = celebrationView(row);
 if (!celebration) throw new JourneyError('Não foi possível registrar a celebração.', 500);
 return { celebration, created: !!inserted };
}
