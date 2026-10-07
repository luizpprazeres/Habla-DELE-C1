// Aprendizagem: caderno automático de erros, agenda de autorrevisão, calendário honesto e plano diário opcional.
// Sem IA e sem métricas derivadas: itens só nascem de evidência objetiva já registrada no feedback.
// As rotas chegam aqui depois do gate de acesso e de origem do worker; este módulo não autentica.
import { PROFILE_IDS, TIME_ZONE, localDay, journeyWeek } from './journey.js';
import { QUESTION_SKILLS } from './c1.js';

const KINDS = ['reading', 'listening', 'writing', 'speaking'];
const OBJECTIVE = new Set(['reading', 'listening']);
export const RATINGS = Object.freeze(['again', 'hard', 'good']);
export const EVENT_TYPES = Object.freeze(['visit', 'start']);
// Intervalos em dias; step indexa esta lista. Não é algoritmo de memória, só uma agenda simples.
export const INTERVALS = Object.freeze([1, 3, 7, 14]);
export const LIMITS = Object.freeze({ backfillPage: 25, notebook: 200, due: 3, recommendations: 3, qualitative: 10, planAheadDays: 60, maxPlanTarget: 4, body: 8000 });
export const REVIEW_NOTICE = 'Agenda ajustada pela sua autoavaliação. Indica quando rever, não domínio certificado.';
export const QUALITATIVE_NOTICE = 'Observações registradas pelo tutor na correção da reescrita, em comparação com o texto anterior. Não são selo de domínio nem nota.';
const SKILL_LABELS = { inference: 'inferência', intention: 'intenção', attitude: 'atitude', detail: 'detalhe', cohesion: 'coesão', grammar: 'gramática', idiom: 'expressões', writing: 'escrita', speaking: 'fala' };
const KIND_LABELS = { reading: 'leitura', listening: 'escuta', writing: 'escrita', speaking: 'fala' };
// Variante de tarefa só quando a habilidade pertence a um único recorte do blueprint C1.
const VARIANT_HINTS = { reading: { grammar: 'language', idiom: 'language', inference: 'inference', intention: 'inference', attitude: 'inference', detail: 'inference' }, listening: { idiom: 'pragmatics' } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ITEM_COLUMNS = 'id,profile_id,attempt_id,parent_attempt_id,task_id,kind,task_title,item_index,origin,skill,prompt,response,expected,explanation,evidence,attempt_created_at,created_at,step,due_day,review_count,last_rating,last_reviewed_at';

export class LearningError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const missingTable = error => /no such table/i.test(String(error?.message || error));
const text = value => (typeof value === 'string' ? value : '');

// ---------- Datas (calendário de Maceió) ----------

export function isDay(value) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const date = new Date(value + 'T00:00:00Z');
 return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function addDays(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
// Segunda-feira da semana que contém o dia (o dia já é local).
export function mondayOf(day) { return addDays(day, -((new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7)); }
export function dayOfTimestamp(value) {
 const date = new Date(value);
 if (typeof value !== 'string' || Number.isNaN(date.getTime())) return null;
 return localDay(date);
}
export function validateProfile(id) { if (!PROFILE_IDS.includes(id)) throw new LearningError('Escolha Luiz ou Alana.'); return id; }

// ---------- Extração do caderno ----------

function parseObject(value, what) {
 let parsed = value;
 if (typeof value === 'string') { try { parsed = JSON.parse(value); } catch { throw new LearningError(`${what} não é JSON válido.`, 422); } }
 if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new LearningError(`${what} inválido.`, 422);
 return parsed;
}

function checkInputs(attempt, taskRow) {
 if (!attempt || typeof attempt.id !== 'string' || !attempt.id) throw new LearningError('Tentativa sem identificador.', 422);
 if (!PROFILE_IDS.includes(attempt.profile_id)) throw new LearningError('Tentativa com perfil inválido.', 422);
 if (typeof attempt.task_id !== 'string' || !attempt.task_id) throw new LearningError('Tentativa sem tarefa.', 422);
 if (typeof attempt.answer !== 'string') throw new LearningError('Tentativa sem resposta.', 422);
 if (!dayOfTimestamp(attempt.created_at)) throw new LearningError('Tentativa sem data válida (created_at).', 422);
 if (!taskRow || !KINDS.includes(taskRow.kind) || typeof taskRow.title !== 'string') throw new LearningError('Tarefa inválida para o caderno.', 422);
 if (taskRow.id !== undefined && taskRow.id !== attempt.task_id) throw new LearningError('A tentativa não pertence a esta tarefa.', 422);
 if (taskRow.profile_id !== undefined && taskRow.profile_id !== attempt.profile_id) throw new LearningError('A tarefa pertence ao outro perfil.', 422);
}

// Questão objetiva incorreta: a avaliação gravada (correct=false) não é refeita; exige evidência
// literal da fonte da tarefa e habilidade do conjunto C1. Sem isso, nada entra no caderno.
function questionItem(q, index, payload) {
 if (!q || typeof q !== 'object' || q.correct !== false) return null;
 const { selected, correctIndex, choices, evidence, skill, prompt } = q;
 if (!Number.isInteger(selected) || !Number.isInteger(correctIndex) || selected === correctIndex || !Array.isArray(choices)) return null;
 const response = text(choices[selected]), expected = text(choices[correctIndex]);
 if (!response.trim() || !expected.trim() || !text(prompt).trim()) return null;
 if (!text(evidence).trim() || !text(payload.source).includes(evidence)) return null;
 if (!QUESTION_SKILLS.includes(skill)) return null;
 // Se a tarefa guardada tiver a questão, ela precisa ser a mesma do feedback.
 const stored = Array.isArray(payload.questions) ? payload.questions[index] : undefined;
 if (stored && ((typeof stored.prompt === 'string' && stored.prompt !== prompt) || (typeof stored.skill === 'string' && stored.skill !== skill))) return null;
 return { index, origin: 'question', skill, prompt, response, expected, explanation: text(q.explanation), evidence };
}

// Prioridade produtiva: só com quote literal, não vazio, presente na resposta enviada.
function priorityItem(p, index, answer, kind) {
 if (!p || typeof p !== 'object') return null;
 const quote = text(p.quote), issue = text(p.issue);
 if (!quote.trim() || !answer.includes(quote) || !issue.trim()) return null;
 return { index, origin: 'priority', skill: kind, prompt: issue, response: quote, expected: text(p.improved), explanation: text(p.explanation), evidence: '' };
}

// Pura: devolve os itens defensáveis, sem agenda. Lança LearningError para entrada estruturalmente inválida.
export function extractItems(attempt, feedback, taskRow) {
 checkInputs(attempt, taskRow);
 const fb = parseObject(feedback, 'Feedback');
 const payload = parseObject(taskRow.payload ?? {}, 'Payload da tarefa');
 if (OBJECTIVE.has(taskRow.kind)) return (Array.isArray(fb.questions) ? fb.questions : []).map((q, i) => questionItem(q, i, payload)).filter(Boolean);
 return (Array.isArray(fb.priorities) ? fb.priorities : []).map((p, i) => priorityItem(p, i, attempt.answer, taskRow.kind)).filter(Boolean);
}

export const itemId = (attemptId, index) => `${attemptId}:${index}`;

// Primeira revisão no dia seguinte ao envio (mesma regra do review_at do worker).
export function itemRows(attempt, taskRow, items, now = new Date()) {
 const firstDue = addDays(dayOfTimestamp(attempt.created_at), INTERVALS[0]);
 const createdAt = new Date(attempt.created_at).toISOString();
 return items.map(item => ({
  id: itemId(attempt.id, item.index), profile_id: attempt.profile_id, attempt_id: attempt.id, parent_attempt_id: attempt.parent_attempt_id || null,
  task_id: attempt.task_id, kind: taskRow.kind, task_title: taskRow.title, item_index: item.index, origin: item.origin, skill: item.skill,
  prompt: item.prompt, response: item.response, expected: item.expected, explanation: item.explanation, evidence: item.evidence,
  attempt_created_at: createdAt, created_at: now.toISOString(), step: 0, due_day: firstDue
 }));
}

// INSERT OR IGNORE: reprocessar nunca sobrescreve agenda nem revisões já feitas.
export const ITEM_INSERT_SQL = `INSERT OR IGNORE INTO learning_items(id,profile_id,attempt_id,parent_attempt_id,task_id,kind,task_title,item_index,origin,skill,prompt,response,expected,explanation,evidence,attempt_created_at,created_at,step,due_day)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
const SYNC_SQL = `INSERT INTO learning_sync(attempt_id,profile_id,status,items,reason,synced_at) VALUES (?,?,?,?,?,?)
 ON CONFLICT(attempt_id) DO UPDATE SET status=excluded.status,items=excluded.items,reason=excluded.reason,synced_at=excluded.synced_at WHERE learning_sync.status<>'ok'`;

const changes = result => Number(result?.meta?.changes ?? result?.changes ?? 0);

// Idempotente. Chamar depois de salvar o feedback de uma tentativa (o backfill usa a mesma função).
export async function syncErrors(db, attempt, feedback, taskRow, now = new Date()) {
 const items = extractItems(attempt, feedback, taskRow);
 const rows = itemRows(attempt, taskRow, items, now);
 const statements = rows.map(r => db.prepare(ITEM_INSERT_SQL).bind(r.id, r.profile_id, r.attempt_id, r.parent_attempt_id, r.task_id, r.kind, r.task_title, r.item_index, r.origin, r.skill, r.prompt, r.response, r.expected, r.explanation, r.evidence, r.attempt_created_at, r.created_at, r.step, r.due_day));
 statements.push(db.prepare(SYNC_SQL).bind(attempt.id, attempt.profile_id, 'ok', rows.length, '', now.toISOString()));
 const results = await db.batch(statements);
 const inserted = results.slice(0, rows.length).reduce((sum, r) => sum + changes(r), 0);
 return { attemptId: attempt.id, extracted: rows.length, inserted, ids: rows.map(r => r.id) };
}

// ---------- Backfill paginado ----------

// Tentativas corrigidas ainda não examinadas, da mais antiga para a mais nova; feedback nunca é reescrito.
export const BACKFILL_SQL = `SELECT a.id,a.profile_id,a.task_id,a.answer,a.feedback,a.created_at,a.parent_attempt_id,t.id AS t_id,t.profile_id AS t_profile_id,t.kind,t.title,t.payload
 FROM attempts a JOIN tasks t ON t.id=a.task_id
 WHERE a.profile_id=? AND a.feedback IS NOT NULL AND NOT EXISTS (SELECT 1 FROM learning_sync s WHERE s.attempt_id=a.id)
 ORDER BY a.created_at,a.id LIMIT ?`;

export async function backfillLearning(db, profile, { limit = LIMITS.backfillPage, now = new Date() } = {}) {
 const rows = (await db.prepare(BACKFILL_SQL).bind(profile, limit + 1).all()).results || [];
 let processed = 0, skipped = 0, inserted = 0;
 for (const row of rows.slice(0, limit)) {
  const attempt = { id: row.id, profile_id: row.profile_id, task_id: row.task_id, answer: row.answer, created_at: row.created_at, parent_attempt_id: row.parent_attempt_id };
  const taskRow = { id: row.t_id, profile_id: row.t_profile_id, kind: row.kind, title: row.title, payload: row.payload };
  try { inserted += (await syncErrors(db, attempt, row.feedback, taskRow, now)).inserted; processed++; }
  catch (error) {
   if (!(error instanceof LearningError)) throw error;
   // Dado histórico inválido fica registrado como ignorado, com motivo, para não travar a fila.
   await db.prepare(SYNC_SQL).bind(row.id, row.profile_id, 'skipped', 0, error.message, now.toISOString()).run();
   skipped++;
  }
 }
 return { processed, skipped, inserted, pending: rows.length > limit };
}

// ---------- Agenda de revisão ----------

export function nextSchedule(step, rating, today) {
 if (!RATINGS.includes(rating)) throw new LearningError('Avaliação inválida: use again, hard ou good.');
 if (!isDay(today)) throw new LearningError('Dia inválido.', 500);
 const current = Number.isInteger(step) ? Math.min(INTERVALS.length - 1, Math.max(0, step)) : 0;
 const next = rating === 'again' ? 0 : rating === 'hard' ? current : Math.min(INTERVALS.length - 1, current + 1);
 return { step: next, intervalDays: INTERVALS[next], dueDay: addDays(today, INTERVALS[next]) };
}

export function itemView(row, today) {
 const payload=safeParse(row.task_payload) || {};
 return {
  context:{source:text(payload.source),instruction:text(payload.instruction),choices:row.origin==='question'?(payload.questions?.[row.item_index]?.choices || []):[]},
  id: row.id, attemptId: row.attempt_id, parentAttemptId: row.parent_attempt_id || null, taskId: row.task_id, taskTitle: row.task_title,
  lastReviewAnswer:row.last_review_answer || '',kind: row.kind, origin: row.origin, skill: row.skill, skillLabel: SKILL_LABELS[row.skill] || row.skill,
  prompt: row.prompt, response: row.response, attemptAt: row.attempt_created_at,
  // Correção só nesta rota; o integrador decide quando revelar na UI.
  correction: { expected: row.expected, explanation: row.explanation, evidence: row.evidence },
  review: { dueDate: row.due_day, status: row.due_day <= today ? 'due' : 'scheduled', step: Number(row.step), intervalDays: INTERVALS[Number(row.step)] ?? null, reviewCount: Number(row.review_count) || 0, lastRating: row.last_rating || null, lastReviewedAt: row.last_reviewed_at || null }
 };
}

export function validateReview(input) {
 const { profile, id, rating, requestId } = input || {};
 validateProfile(profile);
 if (typeof id !== 'string' || !id || id.length > 200) throw new LearningError('Item do caderno inválido.');
 if (!RATINGS.includes(rating)) throw new LearningError('Avaliação inválida: use again, hard ou good.');
 const request = typeof requestId === 'string' ? requestId.toLowerCase() : '';
 if (!UUID.test(request)) throw new LearningError('requestId precisa ser um UUID.');
 const answer=input.answer ?? '';if(typeof answer!=='string'||answer.length>4000)throw new LearningError('Resposta de revisão longa demais. Use até 4000 caracteres.');
 return { profile, id, rating, requestId: request,answer };
}

const REVIEW_INSERT_SQL = `INSERT INTO learning_reviews(request_id,item_id,profile_id,rating,from_count,to_step,to_due_day,created_at,answer)
 SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM learning_items WHERE id=? AND profile_id=? AND review_count=?)
 ON CONFLICT(request_id) DO NOTHING`;
// Só avança se a revisão desta requisição acabou de ser registrada a partir do mesmo estado lido.
const REVIEW_APPLY_SQL = `UPDATE learning_items SET step=?,due_day=?,review_count=review_count+1,last_rating=?,last_reviewed_at=?
 WHERE id=? AND profile_id=? AND review_count=? AND EXISTS (SELECT 1 FROM learning_reviews WHERE request_id=? AND item_id=? AND from_count=?)`;

function reviewResult(review, today, duplicate) {
 return { id: review.item_id, rating: review.rating, dueDate: review.to_due_day, status: review.to_due_day <= today ? 'due' : 'scheduled', intervalDays: INTERVALS[Number(review.to_step)], reviewCount: Number(review.from_count) + 1, duplicate, notice: REVIEW_NOTICE };
}

export async function reviewItem(db, input, now = new Date()) {
 const v = validateReview(input), today = localDay(now);
 const findReview = () => db.prepare('SELECT request_id,item_id,profile_id,rating,from_count,to_step,to_due_day,answer FROM learning_reviews WHERE request_id=?').bind(v.requestId).first();
 const earlier = await findReview();
 if (earlier) {
  if (earlier.item_id !== v.id || earlier.profile_id !== v.profile || earlier.rating !== v.rating || earlier.answer !== v.answer) throw new LearningError('Este requestId já foi usado em outra revisão.', 409);
  return reviewResult(earlier, today, true);
 }
 const item = await db.prepare('SELECT id,profile_id,step,review_count FROM learning_items WHERE id=?').bind(v.id).first();
 if (!item) throw new LearningError('Item do caderno não encontrado.', 404);
 if (item.profile_id !== v.profile) throw new LearningError('Este item pertence ao outro perfil.', 409);
 const next = nextSchedule(Number(item.step), v.rating, today), count = Number(item.review_count);
 await db.batch([
  db.prepare(REVIEW_INSERT_SQL).bind(v.requestId, v.id, v.profile, v.rating, count, next.step, next.dueDay, now.toISOString(),v.answer, v.id, v.profile, count),
  db.prepare(REVIEW_APPLY_SQL).bind(next.step, next.dueDay, v.rating, now.toISOString(), v.id, v.profile, count, v.requestId, v.id, count)
 ]);
 const saved = await findReview();
 if (!saved) throw new LearningError('A agenda deste item mudou enquanto você revisava. Recarregue e tente de novo.', 409);
 if (saved.item_id !== v.id || saved.profile_id !== v.profile || saved.rating !== v.rating || saved.answer !== v.answer) throw new LearningError('Este requestId já foi usado em outra revisão.', 409);
 return reviewResult(saved, today, false);
}

// ---------- Recomendações ----------

// Frequência de registros no caderno por competência. Não é diagnóstico de nível.
export function buildRecommendations(rows) {
 return (rows || [])
  .filter(r => KINDS.includes(r?.kind) && Object.hasOwn(SKILL_LABELS, r.skill) && Number(r.items) > 0)
  .map(r => ({ kind: r.kind, skill: r.skill, items: Number(r.items), due: Number(r.due) || 0, lastAt: r.last_at || null }))
  .sort((a, b) => b.items - a.items || b.due - a.due || String(b.lastAt).localeCompare(String(a.lastAt)) || a.skill.localeCompare(b.skill))
  .slice(0, LIMITS.recommendations)
  .map(r => ({
   ...r,
   label: r.skill === r.kind ? `${SKILL_LABELS[r.skill]}` : `${KIND_LABELS[r.kind]} · ${SKILL_LABELS[r.skill]}`,
   basis: `${r.items} ${r.items === 1 ? 'registro' : 'registros'} no caderno nesta competência.`,
   practice: { kind: r.kind, variant: VARIANT_HINTS[r.kind]?.[r.skill] || 'auto' }
  }));
}

// ---------- Calendário ----------

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function dayState({ tasks, started, visited, target }) {
 if (target) {
  if (tasks >= target) return { state: 'complete', label: `Plano do dia concluído: ${tasks} de ${target}` };
  if (tasks > 0) return { state: 'partial', label: `${tasks} de ${plural(target, 'tarefa planejada', 'tarefas planejadas')}` };
 } else if (tasks > 0) return { state: 'submitted', label: tasks === 1 ? 'Resposta enviada' : `Respostas enviadas em ${tasks} tarefas` };
 if (started) return { state: 'started', label: 'Tarefa iniciada, sem resposta enviada' };
 if (visited) return { state: 'visited', label: 'Acesso registrado, sem prática' };
 if (target) return { state: 'planned', label: `Plano: ${plural(target, 'tarefa', 'tarefas')}` };
 return { state: 'none', label: 'Sem registro' };
}

// Pura. attempts: [{task_id,created_at}] reais; events: [{type,task_id,day}]; plans: [{day,target}].
export function buildCalendar({ weekStart, today, attempts = [], events = [], plans = [] }) {
 if (!isDay(weekStart) || mondayOf(weekStart) !== weekStart) throw new LearningError('A semana precisa começar numa segunda-feira.', 500);
 const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
 const slots = new Map(days.map(d => [d, { attempts: 0, tasks: new Set(), starts: new Set(), visited: false, target: null }]));
 for (const a of attempts) { const slot = slots.get(dayOfTimestamp(a?.created_at)); if (slot) { slot.attempts++; slot.tasks.add(a.task_id); } }
 for (const e of events) {
  const slot = slots.get(e?.day);
  if (!slot) continue;
  if (e.type === 'visit') slot.visited = true;
  if (e.type === 'start' && e.task_id) slot.starts.add(e.task_id);
 }
 for (const p of plans) { const slot = slots.get(p?.day), target = Number(p?.target); if (slot && Number.isInteger(target) && target >= 1 && target <= LIMITS.maxPlanTarget) slot.target = target; }
 const list = days.map(day => {
  const s = slots.get(day), tasks = s.tasks.size;
  return { day, future: day > today, today: day === today, ...dayState({ tasks, started: s.starts.size > 0, visited: s.visited, target: s.target }), visited: s.visited, startedTasks: s.starts.size, submitted: { attempts: s.attempts, tasks }, plan: s.target ? { target: s.target } : null };
 });
 const planned = list.filter(d => d.plan);
 // Meta só existe com plano explícito; sem plano a semana não tem "concluído".
 const metaSemana = planned.length ? (() => {
  const target = planned.reduce((n, d) => n + d.plan.target, 0), done = planned.reduce((n, d) => n + Math.min(d.submitted.tasks, d.plan.target), 0);
  return { plannedDays: planned.length, target, done, completeDays: planned.filter(d => d.state === 'complete').length, label: `Plano da semana: ${done} de ${plural(target, 'tarefa planejada', 'tarefas planejadas')}` };
 })() : null;
 const end = addDays(weekStart, 7);
 return { week: { start: weekStart, end, label: `Semana de ${weekStart.slice(8, 10)}/${weekStart.slice(5, 7)} a ${addDays(weekStart, 6).slice(8, 10)}/${addDays(weekStart, 6).slice(5, 7)}` }, timeZone: TIME_ZONE, days: list, metaSemana };
}

export async function loadCalendar(db, profile, weekStart, today) {
 const end = addDays(weekStart, 7);
 // Margem de um dia em UTC; o recorte exato acontece no fuso de Maceió.
 const since = addDays(weekStart, -1) + 'T00:00:00.000Z', until = addDays(end, 1) + 'T00:00:00.000Z';
 const [attempts, events, plans] = await Promise.all([
  db.prepare('SELECT a.task_id,a.created_at FROM attempts a JOIN tasks t ON t.id=a.task_id WHERE a.profile_id=? AND t.profile_id=a.profile_id AND a.created_at>=? AND a.created_at<?').bind(profile, since, until).all().then(r => r.results || []),
  db.prepare('SELECT type,task_id,day FROM learning_events WHERE profile_id=? AND day>=? AND day<?').bind(profile, weekStart, end).all().then(r => r.results || []),
  db.prepare('SELECT day,target FROM learning_plans WHERE profile_id=? AND day>=? AND day<?').bind(profile, weekStart, end).all().then(r => r.results || [])
 ]);
 return buildCalendar({ weekStart, today, attempts, events, plans });
}

// ---------- Eventos e plano ----------

export function validateEvent(input) {
 const { profile, type, taskId } = input || {};
 validateProfile(profile);
 if (!EVENT_TYPES.includes(type)) throw new LearningError('Evento inválido: use visit ou start.');
 if (type === 'visit' && taskId !== undefined && taskId !== null) throw new LearningError('Visita não recebe tarefa.');
 if (type === 'start' && (typeof taskId !== 'string' || !taskId || taskId.length > 100)) throw new LearningError('Informe a tarefa iniciada.');
 return { profile, type, taskId: type === 'start' ? taskId : null };
}
export const eventId = (profile, type, taskId, day) => (type === 'visit' ? `visit:${profile}:${day}` : `start:${profile}:${taskId}:${day}`);

export async function recordEvent(db, input, now = new Date()) {
 const v = validateEvent(input), day = localDay(now);
 if (v.type === 'start') {
  const task = await db.prepare('SELECT id,profile_id FROM tasks WHERE id=?').bind(v.taskId).first();
  if (!task) throw new LearningError('Tarefa não encontrada.', 404);
  if (task.profile_id !== v.profile) throw new LearningError('Esta tarefa pertence ao outro perfil.', 409);
 }
 const id = eventId(v.profile, v.type, v.taskId, day);
 const result = await db.prepare('INSERT OR IGNORE INTO learning_events(id,profile_id,type,task_id,day,created_at) VALUES (?,?,?,?,?,?)').bind(id, v.profile, v.type, v.taskId, day, now.toISOString()).run();
 return { id, type: v.type, taskId: v.taskId, day, created: changes(result) > 0 };
}

// Plano é prospectivo: hoje ou futuro próximo. Dias passados não recebem plano retroativo.
export function validatePlan(input, today) {
 const { profile, day, target } = input || {};
 validateProfile(profile);
 if (!isDay(day)) throw new LearningError('Dia inválido: use AAAA-MM-DD.');
 if (day < today) throw new LearningError('Não é possível planejar um dia que já passou.');
 if (day > addDays(today, LIMITS.planAheadDays)) throw new LearningError(`Planeje no máximo ${LIMITS.planAheadDays} dias à frente.`);
 if (!Number.isInteger(target) || target < 0 || target > LIMITS.maxPlanTarget) throw new LearningError('Meta do dia entre 1 e 4 tarefas, ou 0 para remover.');
 return { profile, day, target };
}

export async function savePlan(db, input, now = new Date()) {
 const v = validatePlan(input, localDay(now));
 if (v.target === 0) {
  const result = await db.prepare('DELETE FROM learning_plans WHERE profile_id=? AND day=?').bind(v.profile, v.day).run();
  return { day: v.day, target: null, removed: changes(result) > 0 };
 }
 await db.prepare('INSERT INTO learning_plans(profile_id,day,target,updated_at) VALUES (?,?,?,?) ON CONFLICT(profile_id,day) DO UPDATE SET target=excluded.target,updated_at=excluded.updated_at').bind(v.profile, v.day, v.target, now.toISOString()).run();
 return { day: v.day, target: v.target, removed: false };
}

// ---------- Observações qualitativas ----------

function safeParse(value) { try { const v = typeof value === 'string' ? JSON.parse(value) : value; return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } }

// Só reescrita de escrita com pai válido e texto alterado. Usa feedback.qualitative com quotes literais,
// se existir; senão, os pontos fortes que o tutor registrou ao comparar com o texto anterior.
// Nunca infere melhora por nota, contagem de palavras ou prioridade que sumiu.
export function qualitativeFromRewrite(row) {
 if (!row || !['writing','speaking'].includes(row.kind) || !row.parent_attempt_id || row.parent_attempt_id === row.id) return null;
 if (typeof row.answer !== 'string' || typeof row.parent_answer !== 'string' || row.answer.trim() === row.parent_answer.trim()) return null;
 if (!(new Date(row.parent_created_at).getTime() <= new Date(row.created_at).getTime())) return null;
 const fb = safeParse(row.feedback), parentFb = safeParse(row.parent_feedback);
 if (!fb || !parentFb || fb.type !== 'productive') return null;
 const basis='qualitative-quotes';
 const observations=(Array.isArray(fb.qualitative)?fb.qualitative:[]).filter(o=>
  ['argument','objection','grammar','cohesion'].includes(o?.competence) && text(o.beforeQuote).trim() && text(o.afterQuote).trim() && text(o.explanation).trim()
  && row.parent_answer.includes(o.beforeQuote) && row.answer.includes(o.afterQuote) && o.beforeQuote.trim()!==o.afterQuote.trim()
 ).map(o=>({competence:o.competence,beforeQuote:o.beforeQuote,afterQuote:o.afterQuote,explanation:o.explanation})).slice(0,2);
 if (!observations.length) return null;
 return { attemptId: row.id, parentAttemptId: row.parent_attempt_id, taskId: row.task_id, taskTitle: row.title, createdAt: row.created_at, source: 'observação do tutor', basis, certified: false, observations };
}

export const QUALITATIVE_SQL = `SELECT c.id,c.task_id,c.parent_attempt_id,c.answer,c.feedback,c.created_at,p.answer AS parent_answer,p.feedback AS parent_feedback,p.created_at AS parent_created_at,t.kind,t.title
 FROM attempts c JOIN attempts p ON p.id=c.parent_attempt_id JOIN tasks t ON t.id=c.task_id
 WHERE c.profile_id=? AND p.profile_id=c.profile_id AND p.task_id=c.task_id AND t.profile_id=c.profile_id AND t.kind IN ('writing','speaking') AND c.feedback IS NOT NULL AND p.feedback IS NOT NULL
 ORDER BY c.created_at DESC,c.id DESC LIMIT ?`;

// ---------- Leitura agregada ----------

export function weekStartFor(param, now = new Date()) {
 if (param === null || param === undefined || param === '') return journeyWeek(now).start;
 if (!isDay(param)) throw new LearningError('Semana inválida: use AAAA-MM-DD.');
 return mondayOf(param);
}

export async function loadLearning(db, profile, { week = null, offset=0, now = new Date() } = {}) {
 validateProfile(profile);
 if(!Number.isInteger(offset)||offset<0||offset>100000)throw new LearningError('Página inválida.');
 const today = localDay(now), weekStart = weekStartFor(week, now);
 // Backfill em páginas pequenas a cada GET; pending=true indica que ainda há histórico a examinar.
 const backfill = await backfillLearning(db, profile, { now });
 const [items, total, due, dueTotal, skills, rewrites, calendar] = await Promise.all([
  db.prepare(`SELECT l.*,t.payload AS task_payload,(SELECT r.answer FROM learning_reviews r WHERE r.item_id=l.id ORDER BY r.created_at DESC LIMIT 1) AS last_review_answer FROM learning_items l JOIN tasks t ON t.id=l.task_id WHERE l.profile_id=? ORDER BY l.attempt_created_at DESC,l.attempt_id,l.item_index LIMIT ? OFFSET ?`).bind(profile, LIMITS.notebook,offset).all().then(r => r.results || []),
  db.prepare('SELECT COUNT(*) AS n FROM learning_items WHERE profile_id=?').bind(profile).first(),
  db.prepare(`SELECT l.*,t.payload AS task_payload,(SELECT r.answer FROM learning_reviews r WHERE r.item_id=l.id ORDER BY r.created_at DESC LIMIT 1) AS last_review_answer FROM learning_items l JOIN tasks t ON t.id=l.task_id WHERE l.profile_id=? AND due_day<=? ORDER BY l.due_day,l.attempt_created_at,l.attempt_id,l.item_index LIMIT ?`).bind(profile, today, LIMITS.due).all().then(r => r.results || []),
  db.prepare('SELECT COUNT(*) AS n FROM learning_items WHERE profile_id=? AND due_day<=?').bind(profile, today).first(),
  db.prepare('SELECT kind,skill,COUNT(*) AS items,SUM(CASE WHEN due_day<=? THEN 1 ELSE 0 END) AS due,MAX(attempt_created_at) AS last_at FROM learning_items WHERE profile_id=? GROUP BY kind,skill').bind(today, profile).all().then(r => r.results || []),
  db.prepare(QUALITATIVE_SQL).bind(profile, LIMITS.qualitative).all().then(r => r.results || []),
  loadCalendar(db, profile, weekStart, today)
 ]);
 return {
  profile, today, timeZone: TIME_ZONE,
  notebook: { items: items.map(r => itemView(r, today)), total: Number(total?.n) || 0, limit: LIMITS.notebook,offset,hasMore:offset+items.length<Number(total?.n || 0) },
  due: { items: due.map(r => itemView(r, today)), total: Number(dueTotal?.n) || 0 },
  calendar,
  metaSemana: calendar.metaSemana,
  recommendations: buildRecommendations(skills),
  qualitative: { notice: QUALITATIVE_NOTICE, items: rewrites.map(qualitativeFromRewrite).filter(Boolean) },
  backfill
 };
}

// ---------- Roteamento ----------

async function readJSON(request) {
 const raw = await request.text();
 if (raw.length > LIMITS.body) throw new LearningError('Requisição muito longa.', 413);
 let input;
 try { input = JSON.parse(raw); } catch { throw new LearningError('Não foi possível ler a requisição.'); }
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LearningError('Requisição inválida.');
 return input;
}

// Devolve Response para /api/learning*, ou null para o worker seguir adiante.
export async function learningRoute(request, env, deps = {}) {
 const url = new URL(request.url), path = url.pathname, method = request.method, now = deps.now || new Date();
 if (path !== '/api/learning' && !path.startsWith('/api/learning/')) return null;
 try {
  if (path === '/api/learning' && method === 'GET') return json(await loadLearning(env.DB, validateProfile(url.searchParams.get('profile')), { week: url.searchParams.get('week'),offset:Number(url.searchParams.get('offset') || 0), now }));
  if (path === '/api/learning/events' && method === 'POST') { const result = await recordEvent(env.DB, await readJSON(request), now); return json(result, result.created ? 201 : 200); }
  if (path === '/api/learning/plan' && method === 'POST') return json(await savePlan(env.DB, await readJSON(request), now));
  if (path === '/api/learning/review' && method === 'POST') { const result = await reviewItem(env.DB, await readJSON(request), now); return json(result, result.duplicate ? 200 : 201); }
  return null;
 } catch (error) {
  if (error instanceof LearningError) return json({ message: error.message }, error.status);
  if (missingTable(error)) return json({ message: 'O caderno ainda não foi ativado. O restante do estudo segue normal.' }, 503);
  throw error;
 }
}
