import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { gradeObjective } from '../src/worker.js';
import {
 LearningError, learningRoute, syncErrors, extractItems, backfillLearning, nextSchedule, reviewItem, recordEvent, savePlan, validatePlan,
 buildCalendar, dayState, buildRecommendations, qualitativeFromRewrite, weekStartFor, mondayOf, isDay, dayOfTimestamp, itemId, INTERVALS, LIMITS
} from '../src/learning.js';

// Quarta, 7 de outubro de 2026, meio-dia em Maceió (UTC-3); a semana começa em 05/10.
const NOW = new Date('2026-10-07T15:00:00.000Z');
const ORIGIN = 'https://habla.test';
const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort();
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// D1 mínimo sobre SQLite real, com chaves estrangeiras ligadas e batch transacional como no D1.
function createDB({ upTo = Infinity } = {}) {
 const sqlite = new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON');
 for (const file of MIGRATIONS.filter(f => Number(f.slice(0, 4)) <= upTo)) sqlite.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
 const db = {
  sqlite, beforeBatch: null,
  prepare(sql) {
   let args = [];
   const statement = {
    bind(...values) { args = values; return statement; },
    exec: kind => { const s = sqlite.prepare(sql); if (kind === 'first') return s.get(...args) ?? null; if (kind === 'all') return { results: s.all(...args) }; const r = s.run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
    first: () => Promise.resolve().then(() => statement.exec('first')),
    all: () => Promise.resolve().then(() => statement.exec('all')),
    run: () => Promise.resolve().then(() => statement.exec('run'))
   };
   return statement;
  },
  async batch(statements) {
   if (db.beforeBatch) { const hook = db.beforeBatch; db.beforeBatch = null; hook(); }
   sqlite.exec('BEGIN');
   try { const results = statements.map(s => s.exec('run')); sqlite.exec('COMMIT'); return results; }
   catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }
 };
 return db;
}

const SOURCE = 'El ayuntamiento aprobó el plan, aunque matizó que su alcance dependería del presupuesto. Los vecinos, por su parte, celebraron la medida con reservas.';
function objectiveTask(id = 'task-r1', profile = 'luiz', extra = {}) {
 const payload = {
  title: 'Plan municipal', source: SOURCE, trainingVersion: 'c1-v2',
  questions: [
   { prompt: '¿Qué condiciona el alcance del plan?', choices: ['El presupuesto', 'La opinión vecinal', 'El calendario'], correctIndex: 0, evidence: 'su alcance dependería del presupuesto', explanation: 'La fuente lo vincula explícitamente al presupuesto disponible.', skill: 'detail' },
   { prompt: '¿Cómo reciben los vecinos la medida?', choices: ['Con entusiasmo total', 'Con reservas', 'Con rechazo'], correctIndex: 1, evidence: 'celebraron la medida con reservas', explanation: 'Celebran, pero la expresión con reservas matiza el apoyo.', skill: 'attitude' },
   { prompt: '¿Qué implica el matiz del ayuntamiento?', choices: ['Que el plan es definitivo', 'Que puede reducirse', 'Que ya fracasó'], correctIndex: 1, evidence: 'aunque matizó', explanation: 'La concesión limita la consecuencia de la aprobación del plan.', skill: 'inference' }
  ],
  ...extra
 };
 return { id, profile_id: profile, kind: 'reading', title: payload.title, payload: JSON.stringify(payload) };
}
function productiveTask(id = 'task-w1', profile = 'luiz', kind = 'writing') {
 return { id, profile_id: profile, kind, title: 'Carta formal', payload: JSON.stringify({ title: 'Carta formal', source: 'Estímulo', questions: [] }) };
}
const ANSWER = 'Estimados señores: les escribo para quejarme porque el servicio fue muy malo y no me gustó nada la atención recibida.';
const productiveFeedback = (priorities, extra = {}) => ({ type: 'productive', summary: 'ok', strengths: [], priorities, nextAttempt: '', followUp: '', criteria: [], modelAnswer: '', ...extra });

function seedTask(db, task) {
 db.sqlite.prepare('INSERT INTO tasks(id,profile_id,kind,title,payload,created_at) VALUES (?,?,?,?,?,?)').run(task.id, task.profile_id, task.kind, task.title, task.payload, '2026-08-01T12:00:00.000Z');
}
function seedAttempt(db, { id, task, profile = 'luiz', answer = ANSWER, feedback = null, createdAt = '2026-10-05T15:00:00.000Z', parent = null }) {
 const fb = feedback === null ? null : typeof feedback === 'string' ? feedback : JSON.stringify(feedback);
 db.sqlite.prepare('INSERT INTO attempts(id,task_id,profile_id,answer,feedback,created_at,parent_attempt_id) VALUES (?,?,?,?,?,?,?)').run(id, task, profile, answer, fb, createdAt, parent);
 return { id, task_id: task, profile_id: profile, answer, created_at: createdAt, parent_attempt_id: parent };
}
const count = (db, sql, ...args) => db.sqlite.prepare(sql).get(...args).n;
const post = (path, body) => new Request(ORIGIN + path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Origin: ORIGIN } });
const get = path => new Request(ORIGIN + path);
const route = (db, request, now = NOW) => learningRoute(request, { DB: db }, { now });

// ---------- Datas ----------

test('dias e semanas seguem o calendário de Maceió, inclusive na virada UTC', () => {
 assert.equal(isDay('2026-02-29'), false, 'data inexistente');
 assert.equal(isDay('2028-02-29'), true);
 assert.equal(isDay('2026-10-7'), false);
 assert.equal(mondayOf('2026-10-11'), '2026-10-05', 'domingo pertence à semana iniciada na segunda anterior');
 assert.equal(mondayOf('2026-10-05'), '2026-10-05');
 assert.equal(mondayOf('2026-11-01'), '2026-10-26');
 assert.equal(weekStartFor(null, NOW), '2026-10-05');
 assert.equal(weekStartFor('2026-10-09', NOW), '2026-10-05');
 assert.throws(() => weekStartFor('2026-13-01', NOW), LearningError);
 // 02:30Z de terça ainda é segunda 23:30 em Maceió.
 assert.equal(dayOfTimestamp('2026-10-06T02:30:00.000Z'), '2026-10-05');
 assert.equal(dayOfTimestamp('2026-10-06T03:00:00.000Z'), '2026-10-06');
 assert.equal(dayOfTimestamp('não é data'), null);
});

// ---------- Extração ----------

test('caderno objetivo: só questões incorretas com evidência literal da fonte e habilidade C1 válida', () => {
 const task = objectiveTask();
 const feedback = gradeObjective(JSON.parse(task.payload), [0, 0, 2]); // acerta 1, erra 2 e 3
 const attempt = { id: 'a1', profile_id: 'luiz', task_id: task.id, answer: '[0,0,2]', created_at: '2026-10-05T15:00:00.000Z' };
 const items = extractItems(attempt, JSON.stringify(feedback), task);
 assert.deepEqual(items.map(i => i.index), [1, 2]);
 assert.deepEqual(items[0], { index: 1, origin: 'question', skill: 'attitude', prompt: '¿Cómo reciben los vecinos la medida?', response: 'Con entusiasmo total', expected: 'Con reservas', explanation: 'Celebran, pero la expresión con reservas matiza el apoyo.', evidence: 'celebraron la medida con reservas' });

 const tampered = structuredClone(feedback);
 tampered.questions[1].evidence = 'texto que não está na fonte';
 tampered.questions[2].skill = 'vocabulary';
 assert.deepEqual(extractItems(attempt, tampered, task), [], 'evidência não literal ou habilidade fora do conjunto não entram');

 const legacy = structuredClone(feedback);
 delete legacy.questions[1].skill; delete legacy.questions[2].skill;
 assert.deepEqual(extractItems(attempt, legacy, task), [], 'tarefa antiga sem habilidade não vira item');

 const swapped = structuredClone(feedback);
 swapped.questions[1].prompt = 'Outra pergunta';
 assert.deepEqual(extractItems(attempt, swapped, task).map(i => i.index), [2], 'questão divergente da tarefa guardada é descartada');

 const inconsistent = structuredClone(feedback);
 inconsistent.questions[1].selected = inconsistent.questions[1].correctIndex;
 assert.deepEqual(extractItems(attempt, inconsistent, task).map(i => i.index), [2], 'correct=false com escolha igual ao gabarito não é erro defensável');
});

test('caderno produtivo: só prioridades com trecho literal não vazio da resposta', () => {
 const task = productiveTask();
 const attempt = { id: 'w1', profile_id: 'luiz', task_id: task.id, answer: ANSWER, created_at: '2026-10-05T15:00:00.000Z' };
 const feedback = productiveFeedback([
  { issue: 'Registro informal para carta formal', quote: 'no me gustó nada', explanation: 'Em carta formal, prefira uma formulação mitigada.', improved: 'no resultó satisfactoria' },
  { issue: 'Estrutura global', quote: '', explanation: 'Falta conclusão.', improved: '' },
  { issue: 'Citação parafraseada', quote: 'el servicio fue malo…', explanation: 'x', improved: 'y' },
  { issue: 'Espaço extra', quote: '   ', explanation: 'x', improved: 'y' }
 ]);
 const items = extractItems(attempt, feedback, task);
 assert.equal(items.length, 1);
 assert.deepEqual(items[0], { index: 0, origin: 'priority', skill: 'writing', prompt: 'Registro informal para carta formal', response: 'no me gustó nada', expected: 'no resultó satisfactoria', explanation: 'Em carta formal, prefira uma formulação mitigada.', evidence: '' });
 assert.equal(extractItems(attempt, feedback, productiveTask('task-w1', 'luiz', 'speaking'))[0].skill, 'speaking');
});

test('entrada estruturalmente inválida é erro explícito, não item silencioso', () => {
 const task = productiveTask();
 const attempt = { id: 'w1', profile_id: 'luiz', task_id: task.id, answer: ANSWER, created_at: '2026-10-05T15:00:00.000Z' };
 assert.throws(() => extractItems(attempt, '{quebrado', task), /JSON válido/);
 assert.throws(() => extractItems(attempt, [], task), LearningError);
 assert.throws(() => extractItems({ ...attempt, created_at: undefined }, productiveFeedback([]), task), /created_at/);
 assert.throws(() => extractItems({ ...attempt, profile_id: 'outro' }, productiveFeedback([]), task), /perfil inválido/);
 assert.throws(() => extractItems(attempt, productiveFeedback([]), { ...task, profile_id: 'alana' }), /outro perfil/);
 assert.throws(() => extractItems(attempt, productiveFeedback([]), { ...task, id: 'outra' }), /não pertence/);
 assert.throws(() => extractItems(attempt, productiveFeedback([]), { ...task, kind: 'quiz' }), /Tarefa inválida/);
});

test('syncErrors é idempotente, usa IDs attempt:índice e não reinicia agenda já revisada', async () => {
 const db = createDB(), task = objectiveTask();
 seedTask(db, task);
 const feedback = gradeObjective(JSON.parse(task.payload), [0, 0, 2]);
 const attempt = seedAttempt(db, { id: 'a1', task: task.id, answer: '[0,0,2]', feedback, createdAt: '2026-10-06T02:30:00.000Z' });
 const first = await syncErrors(db, attempt, feedback, task, NOW);
 assert.deepEqual(first, { attemptId: 'a1', extracted: 2, inserted: 2, ids: ['a1:1', 'a1:2'] });
 const row = db.sqlite.prepare('SELECT * FROM learning_items WHERE id=?').get('a1:1');
 assert.equal(row.due_day, '2026-10-06', 'primeira revisão no dia seguinte ao envio, em Maceió (enviado 05/10 23:30 local)');
 assert.equal(row.attempt_id, 'a1');
 assert.equal(row.task_title, 'Plan municipal');

 await reviewItem(db, { profile: 'luiz', id: 'a1:1', rating: 'good', requestId: uuid(1) }, NOW);
 const second = await syncErrors(db, attempt, feedback, task, new Date('2026-10-20T12:00:00.000Z'));
 assert.equal(second.inserted, 0);
 assert.equal(count(db, 'SELECT COUNT(*) AS n FROM learning_items'), 2);
 const after = db.sqlite.prepare('SELECT step,due_day,review_count FROM learning_items WHERE id=?').get('a1:1');
 assert.deepEqual({ ...after }, { step: 1, due_day: '2026-10-10', review_count: 1 }, 'agenda preservada');
 assert.equal(itemId('a1', 1), 'a1:1');
});

// ---------- Backfill ----------

test('backfill percorre todo o histórico em páginas, sem reescrever feedback e sem tocar o outro perfil', async () => {
 const db = createDB(), task = productiveTask(), other = productiveTask('task-a1', 'alana');
 seedTask(db, task); seedTask(db, other);
 const total = LIMITS.backfillPage * 2 + 7;
 for (let i = 0; i < total; i++) {
  const createdAt = new Date(Date.UTC(2026, 6, 1) + i * 3600000).toISOString();
  seedAttempt(db, { id: `h${String(i).padStart(3, '0')}`, task: task.id, feedback: productiveFeedback([{ issue: 'Registro', quote: 'muy malo', explanation: 'e', improved: 'deficiente' }]), createdAt });
 }
 seedAttempt(db, { id: 'broken', task: task.id, feedback: '{nao-json', createdAt: '2026-06-01T12:00:00.000Z' });
 seedAttempt(db, { id: 'pending', task: task.id, feedback: null, createdAt: '2026-06-02T12:00:00.000Z' });
 seedAttempt(db, { id: 'alana-1', task: other.id, profile: 'alana', feedback: productiveFeedback([{ issue: 'x', quote: 'muy malo', explanation: 'e', improved: 'd' }]) });
 const before = db.sqlite.prepare('SELECT id,feedback FROM attempts ORDER BY id').all();

 const pages = [];
 let result;
 do { result = await backfillLearning(db, 'luiz', { now: NOW }); pages.push(result); } while (result.pending && pages.length < 10);
 assert.equal(pages.length, 3);
 assert.deepEqual(pages.map(p => p.processed + p.skipped), [LIMITS.backfillPage, LIMITS.backfillPage, 8]);
 assert.equal(pages.reduce((n, p) => n + p.skipped, 0), 1, 'feedback ilegível fica registrado como ignorado');
 assert.equal(count(db, 'SELECT COUNT(*) AS n FROM learning_items WHERE profile_id=?', 'luiz'), total);
 assert.equal(count(db, 'SELECT COUNT(*) AS n FROM learning_items WHERE profile_id=?', 'alana'), 0);
 assert.match(db.sqlite.prepare('SELECT reason FROM learning_sync WHERE attempt_id=?').get('broken').reason, /JSON/);
 assert.equal(count(db, 'SELECT COUNT(*) AS n FROM learning_sync WHERE attempt_id=?', 'pending'), 0, 'tentativa sem correção espera');
 assert.deepEqual(db.sqlite.prepare('SELECT id,feedback FROM attempts ORDER BY id').all(), before, 'feedback antigo intacto');

 const again = await backfillLearning(db, 'luiz', { now: NOW });
 assert.deepEqual(again, { processed: 0, skipped: 0, inserted: 0, pending: false });

 // Correção concluída depois: entra no próximo GET com a mesma extração.
 db.sqlite.prepare('UPDATE attempts SET feedback=? WHERE id=?').run(JSON.stringify(productiveFeedback([{ issue: 'x', quote: 'servicio', explanation: '', improved: '' }])), 'pending');
 assert.equal((await backfillLearning(db, 'luiz', { now: NOW })).inserted, 1);
});

// ---------- Agenda ----------

test('agenda 1/3/7/14 por autoavaliação, inclusive na virada de mês', () => {
 assert.deepEqual(INTERVALS, [1, 3, 7, 14]);
 const today = '2026-10-30';
 assert.deepEqual(nextSchedule(0, 'good', today), { step: 1, intervalDays: 3, dueDay: '2026-11-02' });
 assert.deepEqual(nextSchedule(1, 'good', today), { step: 2, intervalDays: 7, dueDay: '2026-11-06' });
 assert.deepEqual(nextSchedule(2, 'good', today), { step: 3, intervalDays: 14, dueDay: '2026-11-13' });
 assert.deepEqual(nextSchedule(3, 'good', today), { step: 3, intervalDays: 14, dueDay: '2026-11-13' }, 'teto em 14 dias');
 assert.deepEqual(nextSchedule(2, 'hard', today), { step: 2, intervalDays: 7, dueDay: '2026-11-06' });
 assert.deepEqual(nextSchedule(3, 'again', today), { step: 0, intervalDays: 1, dueDay: '2026-10-31' });
 assert.throws(() => nextSchedule(0, 'easy', today), LearningError);
});

async function reviewFixture() {
 const db = createDB(), task = productiveTask(), alanaTask = productiveTask('task-a1', 'alana');
 seedTask(db, task); seedTask(db, alanaTask);
 const fb = productiveFeedback([{ issue: 'Registro', quote: 'muy malo', explanation: 'e', improved: 'deficiente' }]);
 await syncErrors(db, seedAttempt(db, { id: 'w1', task: task.id, feedback: fb }), fb, task, NOW);
 await syncErrors(db, seedAttempt(db, { id: 'al1', task: alanaTask.id, profile: 'alana', feedback: fb }), fb, alanaTask, NOW);
 return db;
}

test('revisão com o mesmo requestId não avança a agenda duas vezes', async () => {
 const db = await reviewFixture();
 const input = { profile: 'luiz', id: 'w1:0', rating: 'good', requestId: uuid(7).toUpperCase() };
 const first = await reviewItem(db, input, NOW);
 assert.equal(first.duplicate, false);
 assert.equal(first.dueDate, '2026-10-10');
 assert.equal(first.status, 'scheduled');
 assert.match(first.notice, /não domínio certificado/);
 const repeat = await reviewItem(db, input, new Date('2026-10-08T15:00:00.000Z'));
 assert.equal(repeat.duplicate, true);
 assert.equal(repeat.dueDate, '2026-10-10', 'repetição devolve o resultado original');
 const row = db.sqlite.prepare('SELECT step,review_count FROM learning_items WHERE id=?').get('w1:0');
 assert.deepEqual({ ...row }, { step: 1, review_count: 1 });
 assert.equal(count(db, 'SELECT COUNT(*) AS n FROM learning_reviews'), 1);
 await assert.rejects(reviewItem(db, { ...input, rating: 'again' }, NOW), e => e.status === 409, 'mesmo requestId com outra avaliação');
 const next = await reviewItem(db, { ...input, requestId: uuid(8) }, NOW);
 assert.equal(next.reviewCount, 2);
 assert.equal(next.dueDate, '2026-10-14');
});

test('revisão verifica propriedade, existência, formato e mudança concorrente', async () => {
 const db = await reviewFixture();
 await assert.rejects(reviewItem(db, { profile: 'luiz', id: 'al1:0', rating: 'good', requestId: uuid(1) }, NOW), e => e.status === 409 && /outro perfil/.test(e.message));
 await assert.rejects(reviewItem(db, { profile: 'luiz', id: 'nada:0', rating: 'good', requestId: uuid(2) }, NOW), e => e.status === 404);
 await assert.rejects(reviewItem(db, { profile: 'luiz', id: 'w1:0', rating: 'good', requestId: 'abc' }, NOW), /UUID/);
 await assert.rejects(reviewItem(db, { profile: 'ana', id: 'w1:0', rating: 'good', requestId: uuid(3) }, NOW), /Luiz ou Alana/);
 assert.equal(db.sqlite.prepare('SELECT review_count FROM learning_items WHERE id=?').get('al1:0').review_count, 0, 'item do outro perfil intacto');
 // Outra revisão grava entre a leitura e o batch: esta não pode avançar sobre estado obsoleto.
 db.beforeBatch = () => db.sqlite.prepare('UPDATE learning_items SET review_count=review_count+1 WHERE id=?').run('w1:0');
 await assert.rejects(reviewItem(db, { profile: 'luiz', id: 'w1:0', rating: 'good', requestId: uuid(4) }, NOW), e => e.status === 409 && /Recarregue/.test(e.message));
 assert.equal(count(db, 'SELECT COUNT(*) AS n FROM learning_reviews WHERE request_id=?', uuid(4)), 0);
});

// ---------- Eventos, plano e calendário ----------

test('visita deduplica por dia de Maceió e início exige tarefa existente do próprio perfil', async () => {
 const db = createDB(), task = productiveTask(), alanaTask = productiveTask('task-a1', 'alana');
 seedTask(db, task); seedTask(db, alanaTask);
 const v1 = await recordEvent(db, { profile: 'luiz', type: 'visit' }, new Date('2026-10-07T03:10:00.000Z'));
 const v2 = await recordEvent(db, { profile: 'luiz', type: 'visit' }, new Date('2026-10-08T02:50:00.000Z'));
 const v3 = await recordEvent(db, { profile: 'luiz', type: 'visit' }, new Date('2026-10-08T03:00:00.000Z'));
 assert.deepEqual([v1.created, v2.created, v3.created], [true, false, true]);
 assert.deepEqual([v1.day, v2.day, v3.day], ['2026-10-07', '2026-10-07', '2026-10-08']);
 await assert.rejects(recordEvent(db, { profile: 'luiz', type: 'start', taskId: alanaTask.id }, NOW), e => e.status === 409);
 await assert.rejects(recordEvent(db, { profile: 'luiz', type: 'start', taskId: 'inexistente' }, NOW), e => e.status === 404);
 await assert.rejects(recordEvent(db, { profile: 'luiz', type: 'start' }, NOW), LearningError);
 await assert.rejects(recordEvent(db, { profile: 'luiz', type: 'visit', taskId: task.id }, NOW), /Visita não recebe tarefa/);
 await assert.rejects(recordEvent(db, { profile: 'luiz', type: 'submit' }, NOW), LearningError);
 assert.equal((await recordEvent(db, { profile: 'luiz', type: 'start', taskId: task.id }, NOW)).created, true);
 assert.equal((await recordEvent(db, { profile: 'luiz', type: 'start', taskId: task.id }, NOW)).created, false);
 assert.equal(count(db, 'SELECT COUNT(*) AS n FROM learning_events'), 3);
});

test('plano é explícito, prospectivo, 1..4, e 0 remove', async () => {
 const db = createDB();
 assert.deepEqual(await savePlan(db, { profile: 'luiz', day: '2026-10-07', target: 2 }, NOW), { day: '2026-10-07', target: 2, removed: false });
 assert.deepEqual(await savePlan(db, { profile: 'luiz', day: '2026-10-07', target: 3 }, NOW), { day: '2026-10-07', target: 3, removed: false });
 assert.equal(db.sqlite.prepare('SELECT target FROM learning_plans WHERE profile_id=? AND day=?').get('luiz', '2026-10-07').target, 3);
 assert.deepEqual(await savePlan(db, { profile: 'luiz', day: '2026-10-07', target: 0 }, NOW), { day: '2026-10-07', target: null, removed: true });
 assert.deepEqual(await savePlan(db, { profile: 'luiz', day: '2026-10-07', target: 0 }, NOW), { day: '2026-10-07', target: null, removed: false });
 const today = '2026-10-07';
 assert.throws(() => validatePlan({ profile: 'luiz', day: '2026-10-06', target: 1 }, today), /já passou/);
 assert.throws(() => validatePlan({ profile: 'luiz', day: '2026-12-31', target: 1 }, today), /dias à frente/);
 assert.throws(() => validatePlan({ profile: 'luiz', day: '2026-10-08', target: 5 }, today), /entre 1 e 4/);
 assert.throws(() => validatePlan({ profile: 'luiz', day: '2026-10-08', target: '2' }, today), /entre 1 e 4/);
 assert.throws(() => validatePlan({ profile: 'luiz', day: '2026-02-30', target: 1 }, today), /Dia inválido/);
});

test('estados do dia distinguem acesso, início, resposta e plano; "concluído" só com plano', () => {
 assert.equal(dayState({ tasks: 0, started: false, visited: false, target: null }).state, 'none');
 assert.equal(dayState({ tasks: 0, started: false, visited: true, target: null }).state, 'visited');
 assert.equal(dayState({ tasks: 0, started: true, visited: true, target: null }).state, 'started');
 const submitted = dayState({ tasks: 3, started: true, visited: true, target: null });
 assert.equal(submitted.state, 'submitted');
 assert.doesNotMatch(submitted.label, /conclu|previst|meta/i);
 assert.equal(dayState({ tasks: 1, started: false, visited: false, target: null }).label, 'Resposta enviada');
 assert.equal(dayState({ tasks: 0, started: false, visited: false, target: 2 }).state, 'planned');
 assert.equal(dayState({ tasks: 0, started: true, visited: false, target: 2 }).state, 'started');
 assert.equal(dayState({ tasks: 1, started: false, visited: false, target: 2 }).state, 'partial');
 assert.equal(dayState({ tasks: 2, started: false, visited: false, target: 2 }).state, 'complete');
});

test('calendário usa tentativas reais retroativas no fuso de Maceió; visita não conta como prática', () => {
 const calendar = buildCalendar({
  weekStart: '2026-10-05', today: '2026-10-07',
  attempts: [
   { task_id: 't1', created_at: '2026-10-06T02:30:00.000Z' }, // segunda 23:30 local
   { task_id: 't1', created_at: '2026-10-06T12:00:00.000Z' },
   { task_id: 't2', created_at: '2026-10-06T13:00:00.000Z' },
   { task_id: 't3', created_at: '2026-10-05T02:59:00.000Z' }, // domingo anterior, fora da semana
   { task_id: 't4', created_at: '2026-10-07T13:00:00.000Z' }
  ],
  events: [{ type: 'visit', day: '2026-10-08' }, { type: 'start', task_id: 't9', day: '2026-10-09' }, { type: 'visit', day: '2026-10-05' }],
  plans: [{ day: '2026-10-07', target: 2 }, { day: '2026-10-06', target: 2 }, { day: '2026-10-10', target: 1 }]
 });
 const by = Object.fromEntries(calendar.days.map(d => [d.day, d]));
 assert.equal(calendar.days.length, 7);
 assert.deepEqual([by['2026-10-05'].state, by['2026-10-05'].submitted], ['submitted', { attempts: 1, tasks: 1 }]);
 assert.deepEqual([by['2026-10-06'].state, by['2026-10-06'].submitted], ['complete', { attempts: 2, tasks: 2 }]);
 assert.equal(by['2026-10-07'].state, 'partial');
 assert.deepEqual([by['2026-10-08'].state, by['2026-10-08'].submitted.tasks], ['visited', 0]);
 assert.equal(by['2026-10-09'].state, 'started');
 assert.deepEqual([by['2026-10-10'].state, by['2026-10-10'].future], ['planned', true]);
 assert.equal(by['2026-10-11'].state, 'none');
 assert.deepEqual(calendar.metaSemana, { plannedDays: 3, target: 5, done: 3, completeDays: 1, label: 'Plano da semana: 3 de 5 tarefas planejadas' });
 assert.equal(buildCalendar({ weekStart: '2026-10-05', today: '2026-10-07', attempts: [{ task_id: 't', created_at: '2026-10-06T12:00:00.000Z' }] }).metaSemana, null, 'sem plano não há meta');
 assert.throws(() => buildCalendar({ weekStart: '2026-10-06', today: '2026-10-07' }), LearningError);
});

// ---------- Recomendações e observações ----------

test('recomendações ordenam competências pela frequência no caderno, sem nota', () => {
 const recs = buildRecommendations([
  { kind: 'reading', skill: 'detail', items: 2, due: 2, last_at: '2026-10-01' },
  { kind: 'reading', skill: 'grammar', items: 5, due: 0, last_at: '2026-09-01' },
  { kind: 'writing', skill: 'writing', items: 2, due: 1, last_at: '2026-10-05' },
  { kind: 'listening', skill: 'idiom', items: 1, due: 1, last_at: '2026-10-06' },
  { kind: 'reading', skill: 'inventada', items: 9, due: 9 }
 ]);
 assert.deepEqual(recs.map(r => `${r.kind}:${r.skill}`), ['reading:grammar', 'reading:detail', 'writing:writing']);
 assert.deepEqual(recs[0].practice, { kind: 'reading', variant: 'language' });
 assert.equal(recs[0].basis, '5 registros no caderno nesta competência.');
 assert.equal(recs[2].label, 'escrita');
 assert.ok(recs.every(r => !('score' in r) && !('level' in r)));
});

const rewrite = (extra = {}) => ({
 id: 'c1', parent_attempt_id: 'p1', task_id: 'w', title: 'Carta', kind: 'writing', created_at: '2026-10-06T12:00:00.000Z', parent_created_at: '2026-10-05T12:00:00.000Z',
 answer: 'Les escribo porque el servicio no resultó satisfactorio.', parent_answer: 'Les escribo porque el servicio fue muy malo.',
 feedback: JSON.stringify(productiveFeedback([], { strengths: ['Agora o registro está adequado à carta formal.'] })), parent_feedback: JSON.stringify(productiveFeedback([])), ...extra
});

test('observações qualitativas vêm só do feedback da reescrita, marcadas como do tutor', () => {
 const item = qualitativeFromRewrite(rewrite({feedback:JSON.stringify(productiveFeedback([],{qualitative:[{competence:'grammar',beforeQuote:'fue muy malo',afterQuote:'no resultó satisfactorio',explanation:'Substituiu uma crítica informal por formulação mitigada.'}]}))}));
 assert.deepEqual(item, { attemptId: 'c1', parentAttemptId: 'p1', taskId: 'w', taskTitle: 'Carta', createdAt: '2026-10-06T12:00:00.000Z', source: 'observação do tutor', basis:'qualitative-quotes',certified:false,observations:[{competence:'grammar',beforeQuote:'fue muy malo',afterQuote:'no resultó satisfactorio',explanation:'Substituiu uma crítica informal por formulação mitigada.'}] });
 assert.equal(qualitativeFromRewrite(rewrite({ answer: '  Les escribo porque el servicio fue muy malo. ' })), null, 'texto igual não é reescrita');
 assert.equal(qualitativeFromRewrite(rewrite({ kind: 'speaking' })), null);
 assert.equal(qualitativeFromRewrite(rewrite({ parent_created_at: '2026-10-07T12:00:00.000Z' })), null, 'pai posterior ao filho');
 // Menos prioridades, mais palavras ou nota maior não geram observação sem declaração do tutor.
 assert.equal(qualitativeFromRewrite(rewrite({ feedback: JSON.stringify(productiveFeedback([], { strengths: [], criteria: [{ name: 'x', band: 3, evidence: '' }] })), parent_feedback: JSON.stringify(productiveFeedback([{ issue: 'a', quote: 'muy malo', explanation: '', improved: '' }], { criteria: [{ name: 'x', band: 1, evidence: '' }] })) })), null);
 assert.equal(qualitativeFromRewrite(rewrite()),null,'ponto forte genérico não comprova melhora comparada');
});

test('rota GET entrega caderno com correção, até 3 vencidos, calendário e observações do perfil', async () => {
 const db = createDB(), reading = objectiveTask(), writing = productiveTask(), alanaTask = productiveTask('task-a1', 'alana');
 [reading, writing, alanaTask].forEach(t => seedTask(db, t));
 const graded = gradeObjective(JSON.parse(reading.payload), [1, 0, 0]);
 seedAttempt(db, { id: 'r1', task: reading.id, answer: '[1,0,0]', feedback: graded, createdAt: '2026-10-01T12:00:00.000Z' });
 const wfb = productiveFeedback([{ issue: 'Registro', quote: 'muy malo', explanation: 'e', improved: 'deficiente' }, { issue: 'Queixa vaga', quote: 'la atención recibida', explanation: 'e', improved: 'el trato en ventanilla' }]);
 seedAttempt(db, { id: 'w1', task: writing.id, feedback: wfb, createdAt: '2026-10-05T12:00:00.000Z' });
 seedAttempt(db, { id: 'w2', task: writing.id, parent: 'w1', answer: ANSWER.replace('muy malo', 'deficiente'), feedback: productiveFeedback([], { strengths: ['O registro agora é formal.'] }), createdAt: '2026-10-06T12:00:00.000Z' });
 seedAttempt(db, { id: 'al1', task: alanaTask.id, profile: 'alana', feedback: wfb });
 await savePlan(db, { profile: 'luiz', day: '2026-10-07', target: 2 }, NOW);

 const response = await route(db, get('/api/learning?profile=luiz'));
 assert.equal(response.status, 200);
 const body = await response.json();
 assert.equal(body.today, '2026-10-07');
 assert.equal(body.notebook.total, 5, '3 erros objetivos + 2 prioridades com trecho literal');
 assert.ok(body.notebook.items.every(i => i.id.startsWith('r1:') || i.id.startsWith('w1:')), 'nada do outro perfil');
 const item = body.notebook.items.find(i => i.id === 'r1:0');
 assert.deepEqual(item.correction, { expected: 'El presupuesto', explanation: 'La fuente lo vincula explícitamente al presupuesto disponible.', evidence: 'su alcance dependería del presupuesto' });
 assert.equal(body.due.items.length, 3);
 assert.equal(body.due.total, 5);
 assert.deepEqual(body.due.items.map(i => i.id), ['r1:0', 'r1:1', 'r1:2'], 'mais antigos primeiro');
 assert.equal(body.calendar.week.start, '2026-10-05');
 assert.deepEqual(body.calendar.days.map(d => d.state), ['submitted', 'submitted', 'planned', 'none', 'none', 'none', 'none']);
 assert.equal(body.metaSemana.target, 2);
 assert.deepEqual(body.recommendations.map(r => [r.skill, r.items]), [['writing', 2], ['attitude', 1], ['detail', 1]], 'escrita tem mais registros; empates pela data e depois pelo nome');
 assert.equal(body.qualitative.items.length,0,'ponto forte sem trechos comparados não vira conquista');
 assert.equal(body.backfill.pending, false);

 const week = await (await route(db, get('/api/learning?profile=luiz&week=2026-09-30'))).json();
 assert.equal(week.calendar.week.start, '2026-09-28');
 assert.equal(week.calendar.days.find(d => d.day === '2026-10-01').state, 'submitted');
});

test('rota valida entrada, devolve null fora de /api/learning e 503 sem a migração', async () => {
 const db = createDB();
 assert.equal(await route(db, get('/api/learningx')), null);
 assert.equal(await route(db, get('/api/journey?profile=luiz')), null);
 assert.equal(await route(db, new Request(ORIGIN + '/api/learning', { method: 'DELETE' })), null);
 assert.equal((await route(db, get('/api/learning?profile=ana'))).status, 400);
 assert.equal((await route(db, get('/api/learning?profile=luiz&week=2026-02-30'))).status, 400);
 assert.equal((await route(db, new Request(ORIGIN + '/api/learning/plan', { method: 'POST', body: '{x' }))).status, 400);
 assert.equal((await route(db, new Request(ORIGIN + '/api/learning/plan', { method: 'POST', body: JSON.stringify({ pad: 'x'.repeat(LIMITS.body+1) }) }))).status, 413);
 const created = await route(db, post('/api/learning/events', { profile: 'alana', type: 'visit' }));
 assert.equal(created.status, 201);
 assert.equal((await route(db, post('/api/learning/events', { profile: 'alana', type: 'visit' }))).status, 200);
 const plan = await route(db, post('/api/learning/plan', { profile: 'alana', day: '2026-10-08', target: 1 }));
 assert.deepEqual(await plan.json(), { day: '2026-10-08', target: 1, removed: false });
 const old = createDB({ upTo: 6 });
 const missing = await route(old, get('/api/learning?profile=luiz'));
 assert.equal(missing.status, 503);
 assert.match((await missing.json()).message, /ainda não foi ativado/);
});

test('autorrevisão preserva a nova resposta e recusa reaproveitar UUID com conteúdo diferente',async()=>{
 const db=await reviewFixture();const input={profile:'luiz',id:'w1:0',rating:'good',requestId:uuid(909),answer:'El servicio no resultó satisfactorio.'};
 await reviewItem(db,input,NOW);await reviewItem(db,input,NOW);
 const saved=db.sqlite.prepare('SELECT answer FROM learning_reviews WHERE request_id=?').get(input.requestId);
 assert.equal(saved.answer,input.answer);assert.equal(db.sqlite.prepare('SELECT review_count FROM learning_items WHERE id=?').get(input.id).review_count,1);
 await assert.rejects(reviewItem(db,{...input,answer:'Outra resposta'},NOW),e=>e.status===409);
});


test('biblioteca e POST preferReady reutilizam somente áudio próprio v2 sem chamar IA nem revelar gabarito', async () => {
 const db=createDB();
 for(const [id,profile,caution] of [['ready','luiz',false],['flagged','luiz',true],['other','alana',false]]) {
  const task=objectiveTask(id,profile,{minutes:10,quality:{requiresLinguisticReview:caution}});task.kind='listening';seedTask(db,task);
  db.sqlite.prepare('INSERT INTO generated_audio(task_id,mime,bytes,data) VALUES (?,?,?,?)').run(id,'audio/mpeg',3,new Uint8Array([1,2,3]));
 }
 const secret='only-test-access',hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const env={DB:db,APP_ACCESS_KEY:secret};
 const request=(path,input)=>new Request(ORIGIN+path,{method:input?'POST':'GET',headers:{Cookie:'dele_session='+hash,Origin:ORIGIN,'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});
 const library=await worker.fetch(request('/api/listening-library?profile=luiz'),env);
 assert.equal(library.status,200);const items=(await library.json()).items;assert.deepEqual(items.map(t=>t.id),['ready']);
 const ready=await worker.fetch(request('/api/tasks',{profile:'luiz',kind:'listening',mode:'short',preferReady:true}),env);
 assert.equal(ready.status,200);const task=await ready.json();assert.equal(task.id,'ready');
 assert.equal(task.payload.source,'');assert.ok(task.payload.questions.every(q=>q.correctIndex===undefined && q.evidence===undefined));
 assert.equal(count(db,'SELECT COUNT(*) AS n FROM ai_usage'),0);assert.equal(count(db,'SELECT COUNT(*) AS n FROM generation_locks'),0);
 const invalid=await worker.fetch(new Request(ORIGIN+'/api/tasks',{method:'POST',headers:{Cookie:'dele_session='+hash,Origin:ORIGIN,'Content-Type':'application/json'},body:'broken-json'}),env);
 assert.equal(invalid.status,400);
});
