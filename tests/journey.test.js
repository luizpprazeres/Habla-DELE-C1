import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { buildJourney, journeyWeek, inWeek, normalizeAttempts, memberProgress, validateCelebration, celebrate, loadJourney, MILESTONES, CITIES, ATTEMPTS_SQL } from '../src/journey.js';

// Quarta, 7 de outubro de 2026, meio-dia em Maceió (UTC-3); a semana começa em 05/10.
const NOW = new Date('2026-10-07T15:00:00.000Z');
const SECRET_ANSWER = 'RESPOSTA-PRIVADA-DO-ALUNO';
const SECRET_FEEDBACK = 'GABARITO-E-CORRECAO-PRIVADOS';
let seq = 0;
const row = (profile, kind, task, created, extra = {}) => ({ id: extra.id || `${profile}-${++seq}`, task_id: task, profile_id: profile, parent_attempt_id: null, created_at: created, kind, has_feedback: 1, has_follow_up: 0, has_changed: 1, answer: SECRET_ANSWER, feedback: SECRET_FEEDBACK, ...extra });
const member = (journey, id) => journey.members.find(m => m.id === id);
const milestone = (m, id) => m.milestones.find(x => x.id === id);

function fakeDB({ attempts = [], celebrations = [], profiles = [{ id: 'luiz', name: 'Luiz' }, { id: 'alana', name: 'Alana' }] } = {}) {
 const log = [];
 const db = {
  log, celebrations,
  prepare(sql) {
   let args = [];
   const statement = {
    bind(...values) { args = values; return statement; },
    async all() {
     log.push(sql);
     if (sql.includes('FROM profiles')) return { results: profiles };
     if (sql.includes('FROM attempts')) return { results: args.length ? attempts.filter(a => a.profile_id === args[0]) : attempts };
     if (sql.includes('FROM journey_celebrations')) return { results: celebrations };
     return { results: [] };
    },
    async first() {
     log.push(sql);
     if (sql.startsWith('INSERT INTO journey_celebrations')) {
      const [id, from_profile, to_profile, milestone_id, message_id, created_at] = args;
      if (celebrations.some(c => c.from_profile === from_profile && c.to_profile === to_profile && c.milestone_id === milestone_id)) return null;
      const created = { id, from_profile, to_profile, milestone_id, message_id, created_at };
      celebrations.push(created);
      return created;
     }
     if (sql.includes('FROM journey_celebrations')) return celebrations.find(c => c.from_profile === args[0] && c.to_profile === args[1] && c.milestone_id === args[2]) || null;
     return null;
    }
   };
   return statement;
  }
 };
 return db;
}

test('a semana começa na segunda-feira em Maceió, inclusive na virada de domingo para segunda', () => {
 assert.deepEqual(journeyWeek(NOW), { start: '2026-10-05', end: '2026-10-12', label: 'Semana de 05/10 a 11/10' });
 // Domingo 23:59 em Maceió ainda pertence à semana anterior, embora já seja segunda em UTC.
 assert.equal(journeyWeek(new Date('2026-10-12T02:59:00.000Z')).start, '2026-10-05');
 assert.equal(journeyWeek(new Date('2026-10-12T03:00:00.000Z')).start, '2026-10-12');
 const week = journeyWeek(NOW);
 assert.equal(inWeek('2026-10-05T02:59:00.000Z', week), false, 'domingo 23:59 local fica fora');
 assert.equal(inWeek('2026-10-05T03:00:00.000Z', week), true, 'segunda 00:00 local entra');
 assert.equal(inWeek('2026-10-12T02:59:59.000Z', week), true, 'domingo seguinte 23:59 local ainda entra');
 assert.equal(inWeek('2026-10-12T03:00:00.000Z', week), false);
 assert.equal(inWeek('data inválida', week), false);
});

test('semanal deduplica tentativas repetidas por ID e várias tentativas na mesma tarefa', () => {
 const a = row('luiz', 'reading', 't1', '2026-10-05T12:00:00.000Z', { id: 'same' });
 const attempts = [a, { ...a }, row('luiz', 'reading', 't1', '2026-10-06T12:00:00.000Z'), row('luiz', 'reading', 't1', '2026-10-06T13:00:00.000Z')];
 assert.equal(normalizeAttempts(attempts).length, 3);
 const journey = buildJourney({ viewer: 'luiz', attempts, now: NOW });
 assert.deepEqual(member(journey, 'luiz').weekly, { practice: 1, revision: 0 });
 assert.equal(member(journey, 'luiz').nextAction, 'Responder a mais uma tarefa diferente nesta semana.');
});

test('reescrita conta apenas com pai válido: mesma tarefa, mesmo perfil e correção salva', () => {
 const parent = row('luiz', 'writing', 'w1', '2026-10-05T12:00:00.000Z', { id: 'parent' });
 const child = row('luiz', 'writing', 'w1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'parent', has_feedback: 0 });
 const journey = buildJourney({ viewer: 'luiz', attempts: [parent, child], now: NOW });
 const luiz = member(journey, 'luiz');
 assert.equal(milestone(luiz, 'first-revision').earnedAt, '2026-10-05T13:00:00.000Z', 'a reescrita não depende da correção da própria reescrita');
 assert.deepEqual(luiz.weekly, { practice: 1, revision: 1 });
});

test('pai falso, de outro perfil ou tarefa, ou sem correção não conta como revisão nem diálogo', () => {
 const cases = [
  [row('luiz', 'writing', 'w1', '2026-10-05T12:00:00.000Z', { id: 'p', has_feedback: 0 }), row('luiz', 'writing', 'w1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'p' })],
  [row('alana', 'writing', 'w1', '2026-10-05T12:00:00.000Z', { id: 'p' }), row('luiz', 'writing', 'w1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'p' })],
  [row('luiz', 'writing', 'w2', '2026-10-05T12:00:00.000Z', { id: 'p' }), row('luiz', 'writing', 'w1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'p' })],
  [row('luiz', 'writing', 'w1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'inexistente' })],
  [row('luiz', 'writing', 'w1', '2026-10-05T13:00:00.000Z', { id: 'self', parent_attempt_id: 'self' })],
  [row('luiz', 'writing', 'w1', '2026-10-05T14:00:00.000Z', { id: 'p' }), row('luiz', 'writing', 'w1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'p' })],
  // Fala corrigida sem pergunta de seguimento real não abre diálogo.
  [row('luiz', 'speaking', 's1', '2026-10-05T12:00:00.000Z', { id: 'p', has_follow_up: 0 }), row('luiz', 'speaking', 's1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'p' })],
  [row('luiz', 'speaking', 's1', '2026-10-05T12:00:00.000Z', { id: 'p', has_feedback: 0, has_follow_up: 1 }), row('luiz', 'speaking', 's1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'p' })],
  // Leitura vinculada não é revisão.
  [row('luiz', 'reading', 'r1', '2026-10-05T12:00:00.000Z', { id: 'p' }), row('luiz', 'reading', 'r1', '2026-10-05T13:00:00.000Z', { parent_attempt_id: 'p' })]
 ];
 for (const [i, attempts] of cases.entries()) {
  const luiz = member(buildJourney({ viewer: 'luiz', attempts, now: NOW }), 'luiz');
  assert.equal(luiz.weekly.revision, 0, `caso ${i}`);
  assert.equal(milestone(luiz, 'first-revision').earnedAt, null, `caso ${i}`);
  assert.equal(milestone(luiz, 'first-dialogue').earnedAt, null, `caso ${i}`);
 }
});

test('diálogo exige pergunta de seguimento real do pai', () => {
 const attempts = [row('alana', 'speaking', 's1', '2026-09-01T12:00:00.000Z', { id: 'p', has_follow_up: 1 }), row('alana', 'speaking', 's1', '2026-09-01T12:10:00.000Z', { parent_attempt_id: 'p', has_feedback: 0 })];
 const alana = member(buildJourney({ viewer: 'luiz', attempts, now: NOW }), 'alana');
 assert.equal(milestone(alana, 'first-dialogue').earnedAt, '2026-09-01T12:10:00.000Z');
 assert.equal(milestone(alana, 'first-revision').earnedAt, null);
});

test('marcos retroativos usam respostas enviadas, sem depender de nota ou correção', () => {
 const attempts = [
  row('luiz', 'reading', 'r1', '2026-08-01T12:00:00.000Z', { has_feedback: 0 }),
  row('luiz', 'reading', 'r2', '2026-08-02T12:00:00.000Z'),
  row('luiz', 'writing', 'w1', '2026-08-03T12:00:00.000Z', { has_feedback: 0 }),
  row('luiz', 'listening', 'l1', '2026-08-04T12:00:00.000Z'),
  row('luiz', 'speaking', 's1', '2026-08-05T12:00:00.000Z', { has_feedback: 0 })
 ];
 const luiz = member(buildJourney({ viewer: 'alana', attempts, now: NOW }), 'luiz');
 assert.deepEqual(Object.fromEntries(luiz.milestones.map(m => [m.id, m.earnedAt])), {
  'first-step': '2026-08-01T12:00:00.000Z', 'two-skills': '2026-08-03T12:00:00.000Z', 'four-skills': '2026-08-05T12:00:00.000Z', 'first-revision': null, 'first-dialogue': null
 });
 assert.deepEqual(luiz.milestones.map(m => m.id), ['first-step', 'two-skills', 'four-skills', 'first-revision', 'first-dialogue']);
 assert.ok(luiz.milestones.every(m => m.title && m.description));
});

test('semanas novas não apagam conquistas antigas e zeram somente o semanal', () => {
 const attempts = [row('alana', 'writing', 'w1', '2026-06-01T12:00:00.000Z', { id: 'p' }), row('alana', 'writing', 'w1', '2026-06-01T13:00:00.000Z', { parent_attempt_id: 'p' }), row('alana', 'reading', 'r1', '2026-06-02T12:00:00.000Z')];
 const alana = member(buildJourney({ viewer: 'alana', attempts, now: NOW }), 'alana');
 assert.deepEqual(alana.weekly, { practice: 0, revision: 0 });
 assert.ok(['first-step', 'two-skills', 'first-revision'].every(id => milestone(alana, id).earnedAt));
 assert.equal(alana.nextAction, 'Responder a duas tarefas diferentes nesta semana.');
});

test('objetivo compartilhado exige duas tarefas distintas e uma revisão ou diálogo de cada um', () => {
 const week = (profile, kind, linkedKind, extra = {}) => [
  row(profile, kind, `${profile}-a`, '2026-10-05T12:00:00.000Z'),
  row(profile, linkedKind, `${profile}-b`, '2026-10-06T12:00:00.000Z', { id: `${profile}-parent`, has_follow_up: 1 }),
  row(profile, linkedKind, `${profile}-b`, '2026-10-06T12:30:00.000Z', { parent_attempt_id: `${profile}-parent`, ...extra })
 ];
 const both = [...week('luiz', 'reading', 'writing'), ...week('alana', 'listening', 'speaking')];
 const journey = buildJourney({ viewer: 'luiz', attempts: both, now: NOW });
 assert.equal(journey.shared.complete, true);
 assert.deepEqual(journey.shared.contributions, [{ profile: 'luiz', name: 'Luiz', done: true }, { profile: 'alana', name: 'Alana', done: true }]);
 const onlyLuiz = buildJourney({ viewer: 'luiz', attempts: [...week('luiz', 'reading', 'writing'), row('alana', 'reading', 'x', '2026-10-05T12:00:00.000Z'), row('alana', 'reading', 'y', '2026-10-05T13:00:00.000Z')], now: NOW });
 assert.equal(onlyLuiz.shared.complete, false);
 assert.equal(onlyLuiz.shared.contributions.find(c => c.profile === 'alana').done, false);
 assert.equal(member(onlyLuiz, 'alana').nextAction, 'Reescrever um texto corrigido ou responder à pergunta de seguimento de uma fala.');
 // Uma única tarefa com reescrita não atinge as duas tarefas distintas.
 const oneTask = buildJourney({ viewer: 'luiz', attempts: week('luiz', 'writing', 'writing').slice(1), now: NOW });
 assert.deepEqual(member(oneTask, 'luiz').weekly, { practice: 1, revision: 1 });
 assert.equal(oneTask.shared.contributions[0].done, false);
});

test('resposta segue o contrato, sem ranking, notas, transcrições ou gabaritos', () => {
 const attempts = [row('luiz', 'speaking', 's1', '2026-10-05T12:00:00.000Z', { id: 'p', has_follow_up: 1 }), row('luiz', 'speaking', 's1', '2026-10-05T12:05:00.000Z', { parent_attempt_id: 'p' })];
 const journey = buildJourney({ viewer: 'alana', attempts, celebrations: [{ id: 'c1', from_profile: 'alana', to_profile: 'luiz', milestone_id: 'first-step', message_id: 'together', created_at: '2026-10-05T15:00:00.000Z' }], now: NOW });
 assert.deepEqual(Object.keys(journey), ['week', 'members', 'shared', 'cities', 'celebrations']);
 assert.deepEqual(journey.members.map(m => m.id), ['alana', 'luiz'], 'perfil ativo primeiro, ordem não é classificação');
 assert.deepEqual(Object.keys(journey.members[0]), ['id', 'name', 'milestones', 'weekly', 'nextAction']);
 assert.deepEqual(Object.keys(journey.members[0].milestones[0]), ['id', 'title', 'description', 'earnedAt', 'celebratedBy', 'canCelebrate']);
 const text = JSON.stringify(journey);
 assert.ok(!text.includes(SECRET_ANSWER) && !text.includes(SECRET_FEEDBACK));
 const keys = new Set(), walk = value => { if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { if (!Array.isArray(value)) keys.add(k.toLowerCase()); walk(v); } };
 walk(journey);
 for (const key of keys) assert.ok(!/answer|feedback|transcri|rank|score|streak|^xp$|points|band|grade|nota|level|percent/.test(key), key);
 assert.ok(!/ranking|pontua|aprova|\bnota\b|nível C1|streak|sequência/i.test(text), 'textos sem ranking, nota ou aprovação');
 assert.deepEqual(journey.cities.map(c => c.id), ['donostia', 'bilbao', 'santiago']);
 for (const city of journey.cities) { assert.match(city.cityUrl, /^https:\/\//); assert.match(city.hospitalUrl, /^https:\/\//); }
 const luiz = member(journey, 'luiz');
 assert.deepEqual(milestone(luiz, 'first-step').celebratedBy, ['alana']);
 assert.equal(milestone(luiz, 'first-step').canCelebrate, false, 'já celebrado por quem vê');
 assert.equal(milestone(luiz, 'first-dialogue').canCelebrate, true);
 assert.equal(milestone(luiz, 'first-revision').canCelebrate, false, 'bloqueada não pode ser celebrada');
 assert.ok(member(journey, 'alana').milestones.every(m => !m.canCelebrate), 'ninguém celebra a si mesmo');
 assert.deepEqual(journey.celebrations[0], { id: 'c1', from: 'alana', to: 'luiz', milestoneId: 'first-step', messageId: 'together', message: 'Mais um passo nosso rumo a novembro.', createdAt: '2026-10-05T15:00:00.000Z' });
 assert.equal(CITIES.length, 3);
 assert.equal(MILESTONES.length, 5);
});

test('celebração valida perfis, alvo, marco e mensagem predeterminada', () => {
 assert.throws(() => validateCelebration({ profile: 'luiz', target: 'luiz', milestoneId: 'first-step', messageId: 'effort' }), /outro perfil/);
 assert.throws(() => validateCelebration({ profile: 'admin', target: 'luiz', milestoneId: 'first-step', messageId: 'effort' }));
 assert.throws(() => validateCelebration({ profile: 'alana', target: 'luiz', milestoneId: 'top-1', messageId: 'effort' }), /desconhecida/);
 assert.throws(() => validateCelebration({ profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'Parabéns, você venceu!' }), /Mensagem/);
 assert.throws(() => validateCelebration({ profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'toString' }), /Mensagem/);
 assert.throws(() => validateCelebration(null));
 assert.deepEqual(validateCelebration({ profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'effort', extra: 'x' }), { profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'effort' });
});

test('celebrar é idempotente por remetente, alvo e marco, e exige conquista registrada', async () => {
 const db = fakeDB({ attempts: [row('luiz', 'reading', 'r1', '2026-10-05T12:00:00.000Z')] });
 let ids = 0;
 const newId = () => `cel-${++ids}`;
 const first = await celebrate(db, { profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'effort' }, NOW, newId);
 assert.equal(first.created, true);
 assert.deepEqual(first.celebration, { id: 'cel-1', from: 'alana', to: 'luiz', milestoneId: 'first-step', messageId: 'effort', message: 'Vi o seu esforço nesta etapa. Sigo com você.', createdAt: NOW.toISOString() });
 const again = await celebrate(db, { profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'together' }, NOW, newId);
 assert.equal(again.created, false);
 assert.deepEqual(again.celebration, first.celebration, 'repetir não troca a mensagem nem cria outra linha');
 assert.equal(db.celebrations.length, 1);
 await assert.rejects(celebrate(db, { profile: 'alana', target: 'luiz', milestoneId: 'four-skills', messageId: 'together' }, NOW, newId), e => e.status === 409);
 await assert.rejects(celebrate(db, { profile: 'luiz', target: 'alana', milestoneId: 'first-step', messageId: 'together' }, NOW, newId), e => e.status === 409, 'Alana não tem respostas');
 assert.equal(db.celebrations.length, 1);
});

test('GET /api/journey usa histórico completo e não vaza conteúdo das tentativas', async () => {
 const attempts = Array.from({ length: 150 }, (_, i) => row('alana', 'reading', `r${i}`, new Date(Date.UTC(2026, 3, 1) + i * 3600000).toISOString()));
 attempts.push(row('alana', 'speaking', 'last', '2026-05-01T12:00:00.000Z'));
 const db = fakeDB({ attempts });
 const response = await worker.fetch(new Request('https://habla.test/api/journey?profile=luiz'), { LOCAL_DEV: 'true', DB: db });
 assert.equal(response.status, 200);
 assert.equal(response.headers.get('Cache-Control'), 'no-store');
 const text = await response.text();
 assert.ok(!text.includes(SECRET_ANSWER) && !text.includes(SECRET_FEEDBACK));
 const alana = JSON.parse(text).members.find(m => m.id === 'alana');
 assert.equal(alana.milestones.find(m => m.id === 'two-skills').earnedAt, '2026-05-01T12:00:00.000Z', 'a 151ª tentativa também conta');
 const sql = db.log.find(s => s.includes('FROM attempts'));
 assert.ok(!/LIMIT/i.test(sql));
 assert.ok(!/SELECT\s+(?:a\.answer|a\.\*|\*)/i.test(ATTEMPTS_SQL), 'nenhum texto de resposta é retornado como coluna');
 assert.match(ATTEMPTS_SQL, /json_valid/);
});

test('rotas da jornada respeitam acesso, origem, método e validação', async () => {
 const env = { APP_ACCESS_KEY: 'test-access' };
 assert.equal((await worker.fetch(new Request('https://habla.test/api/journey?profile=luiz'), env)).status, 401);
 const crossOrigin = await worker.fetch(new Request('https://habla.test/api/journey/celebrate', { method: 'POST', headers: { Origin: 'https://untrusted.test' }, body: '{}' }), env);
 assert.equal(crossOrigin.status, 403);
 const local = { LOCAL_DEV: 'true', DB: fakeDB({ attempts: [row('luiz', 'reading', 'r1', '2026-10-05T12:00:00.000Z')] }) };
 assert.equal((await worker.fetch(new Request('https://habla.test/api/journey?profile=admin'), local)).status, 400);
 assert.equal((await worker.fetch(new Request('https://habla.test/api/journey/celebrate'), local)).status, 404, 'GET não celebra');
 const post = input => worker.fetch(new Request('https://habla.test/api/journey/celebrate', { method: 'POST', body: JSON.stringify(input) }), local);
 const self = await post({ profile: 'luiz', target: 'luiz', milestoneId: 'first-step', messageId: 'effort' });
 assert.equal(self.status, 400);
 assert.match((await self.json()).message, /outro perfil/);
 assert.equal((await post({ profile: 'alana', target: 'luiz', milestoneId: 'first-revision', messageId: 'revision' })).status, 409);
 const created = await post({ profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'together' });
 assert.equal(created.status, 201);
 const repeated = await post({ profile: 'alana', target: 'luiz', milestoneId: 'first-step', messageId: 'together' });
 assert.equal(repeated.status, 200);
 assert.equal((await repeated.json()).celebration.id, (await created.json()).celebration.id);
 const view = await (await worker.fetch(new Request('https://habla.test/api/journey?profile=alana'), local)).json();
 assert.deepEqual(view.members.find(m => m.id === 'luiz').milestones[0].celebratedBy, ['alana']);
 assert.equal(view.celebrations.length, 1);
});

test('loadJourney rejeita perfil inválido antes de consultar o banco', async () => {
 const db = fakeDB();
 await assert.rejects(loadJourney(db, 'admin'), e => e.status === 400);
 assert.equal(db.log.length, 0);
 assert.equal(memberProgress([], 'luiz', journeyWeek(NOW)).nextAction, 'Enviar uma primeira resposta, em qualquer habilidade.');
});

test('exportação inclui celebrações e continua funcionando antes da migração', async () => {
 const db = fakeDB({ celebrations: [{ id: 'c1', from_profile: 'luiz', to_profile: 'alana', milestone_id: 'first-step', message_id: 'effort', created_at: '2026-10-05T12:00:00.000Z' }] });
 const exported = await (await worker.fetch(new Request('https://habla.test/api/export'), { LOCAL_DEV: 'true', DB: db })).json();
 assert.equal(exported.celebrations.length, 1);
 const missingTable = { prepare(sql) { return { async all() { if (sql.includes('journey_celebrations')) throw new Error('no such table'); return { results: [] }; } }; } };
 const response = await worker.fetch(new Request('https://habla.test/api/export'), { LOCAL_DEV: 'true', DB: missingTable });
 assert.equal(response.status, 200);
 assert.deepEqual((await response.json()).celebrations, []);
});


test('reenviar o mesmo texto não registra reescrita nem cumpre a parte de revisão',()=>{
 const parent=row('luiz','writing','w','2026-10-05T12:00:00Z',{id:'unchanged-parent'});
 const child=row('luiz','writing','w','2026-10-05T13:00:00Z',{parent_attempt_id:parent.id,has_changed:0});
 const j=buildJourney({viewer:'luiz',attempts:[parent,child],now:NOW});
 assert.equal(milestone(member(j,'luiz'),'first-revision').earnedAt,null);
 assert.equal(member(j,'luiz').weekly.revision,0);
});
