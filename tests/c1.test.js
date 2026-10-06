import test from 'node:test';
import assert from 'node:assert/strict';
import { blindSolvePrompt, assertBlindSolve, buildBlueprint, validateBlueprintTask, qualityReviewSchema, assertQualityReview, shuffleQuestionOptions, qualityReviewPrompt, sanitizeTaskPayload, sourceWordRange, countWords } from '../src/c1.js';

const FILLER = 'Los vecinos siguieron debatiendo la propuesta durante semanas enteras.'.split(' ');
function makeSource(sentences, target) {
 const words = sentences.join(' ').split(/\s+/);
 for (let i = 0; words.length < target; i++) words.push(FILLER[i % FILLER.length]);
 return words.join(' ');
}
const ARTICLE = [
 'La autora admite que la medida reducirá el tráfico, aunque duda de que compense la pérdida de comercios pequeños.',
 'Quien celebre la peatonalización como una victoria definitiva quizá no haya caminado nunca por el barrio un martes de febrero.',
 'No se trata de volver atrás, sino de escuchar a quienes sostienen la vida del barrio.',
 'El ayuntamiento prevé evaluar los resultados durante un plazo de dieciocho meses.'
];
const readingTask = (words = 260) => ({
 title: 'La calle sin coches', instruction: 'Lea el texto y elija la opción correcta.', source: makeSource(ARTICLE, words), minutes: 15, minWords: 0, maxWords: 0, focus: 'Inferencia',
 questions: [
  { prompt: '¿Qué se deduce de la postura de la autora sobre la medida?', skill: 'inference', choices: ['Reconoce un beneficio, pero teme un coste social', 'Cree que el tráfico seguirá creciendo sin remedio', 'Rechaza cualquier cambio en la organización urbana'], correctIndex: 0, evidence: 'aunque duda de que compense la pérdida de comercios pequeños', explanation: 'La autora acepta la reducción del tráfico, pero duda de que compense el cierre de comercios.' },
  { prompt: '¿Con qué intención menciona la autora «un martes de febrero»?', skill: 'intention', choices: ['Sugerir que el entusiasmo ignora la vida cotidiana', 'Indicar la fecha exacta de la inauguración', 'Recomendar visitar el barrio durante el invierno'], correctIndex: 0, evidence: 'quizá no haya caminado nunca por el barrio un martes de febrero', explanation: 'Un día corriente de invierno representa la rutina que los entusiastas no han observado.' },
  { prompt: '¿Qué actitud muestra la autora hacia los partidarios más entusiastas?', skill: 'attitude', choices: ['Una ironía moderada ante su optimismo', 'Una admiración sin reservas por su labor', 'Una indiferencia completa ante sus argumentos'], correctIndex: 0, evidence: 'Quien celebre la peatonalización como una victoria definitiva', explanation: 'La expresión «victoria definitiva» y el contraste posterior revelan una ironía contenida, no hostilidad.' },
  { prompt: '¿Durante cuánto tiempo se evaluarán los resultados?', skill: 'detail', choices: ['Aproximadamente un año y medio', 'Solo durante los primeros seis meses', 'Hasta el final del periodo electoral'], correctIndex: 0, evidence: 'durante un plazo de dieciocho meses', explanation: 'Dieciocho meses equivalen a un año y medio, de modo que las otras duraciones no coinciden.' }
 ]
});
const withQuestion = (task, index, patch) => ({ ...task, questions: task.questions.map((q, i) => i === index ? { ...q, ...patch } : q) });
const GAPS = [
 'El proyecto avanzó [1] ______ las críticas de los vecinos.',
 'Nadie esperaba que el alcalde [2] ______ marcha atrás tan pronto.',
 'Al final, la propuesta quedó en [3] ______ de borrajas.',
 '[4] ______, el debate sirvió para escuchar a todos.'
];
const languageTask = () => ({
 title: 'Un proyecto discutido', instruction: 'Complete el texto.', source: makeSource(GAPS, 190), minutes: 15, minWords: 0, maxWords: 0, focus: 'Uso de la lengua',
 questions: [
  { prompt: 'Complete el hueco [1].', skill: 'grammar', choices: ['a pesar de', 'aunque', 'sin que'], correctIndex: 0, evidence: 'avanzó [1] ______ las críticas', explanation: 'Ante un sustantivo se necesita una locución preposicional concesiva, no una conjunción.' },
  { prompt: 'Complete el hueco [2].', skill: 'grammar', choices: ['diera', 'dio', 'dará'], correctIndex: 0, evidence: 'que el alcalde [2] ______ marcha atrás', explanation: 'Esperar en pasado con negación exige imperfecto de subjuntivo en la subordinada.' },
  { prompt: 'Complete el hueco [3].', skill: 'idiom', choices: ['agua', 'nada', 'vino'], correctIndex: 0, evidence: 'quedó en [3] ______ de borrajas', explanation: 'La expresión fija quedar en agua de borrajas significa no llegar a nada.' },
  { prompt: 'Complete el hueco [4].', skill: 'cohesion', choices: ['Con todo', 'Por tanto', 'Es decir'], correctIndex: 0, evidence: '[4] ______, el debate sirvió', explanation: 'El conector concesivo introduce un balance positivo pese al fracaso de la propuesta.' }
 ]
});
const productiveTask = (bp, words, extra = {}) => ({
 title: 'Biblioteca del barrio', instruction: 'Escriba al ayuntamiento. ¿Qué propone usted?', source: makeSource(['El ayuntamiento anuncia el cierre temporal de la biblioteca del barrio.'], words),
 minutes: bp.minutes, minWords: bp.minWords, maxWords: bp.maxWords, focus: 'Registro', questions: [], ...extra
});
const reviewItems = (n, patch = {}) => Array.from({ length: n }, (_, index) => ({ index, unambiguous: true, distractorsPlausible: true, c1Demand: true, evidenceSufficient: true, ...patch }));
const shortReading = buildBlueprint({ kind: 'reading', mode: 'short', variant: 'inference' });

test('blueprints fix C1 bounds per kind, subtype and mode', () => {
 const expected = [
  [{ kind: 'reading', mode: 'block', variant: 'inference' }, { minutes: 25, sourceMinWords: 550, sourceMaxWords: 650, questionCount: 6, minWords: 0, maxWords: 0 }],
  [{ kind: 'reading', mode: 'short', variant: 'inference' }, { minutes: 15, sourceMinWords: 220, sourceMaxWords: 300, questionCount: 4 }],
  [{ kind: 'reading', mode: 'block', variant: 'language' }, { minutes: 25, sourceMinWords: 375, sourceMaxWords: 425, questionCount: 6 }],
  [{ kind: 'reading', mode: 'short', variant: 'language' }, { minutes: 15, sourceMinWords: 170, sourceMaxWords: 220, questionCount: 4 }],
  [{ kind: 'listening', mode: 'block', variant: 'pragmatics' }, { minutes: 25, sourceMinWords: 650, sourceMaxWords: 750, questionCount: 6, sourceMode: 'audio' }],
  [{ kind: 'listening', mode: 'short', variant: 'inference' }, { minutes: 15, sourceMinWords: 250, sourceMaxWords: 350, questionCount: 4, sourceMode: 'audio' }],
  [{ kind: 'writing', mode: 'block', variant: 'formal' }, { minutes: 40, minWords: 180, maxWords: 220, sourceMinWords: 100, sourceMaxWords: 180, questionCount: 0, sourceMode: 'text' }],
  [{ kind: 'writing', mode: 'block', variant: 'mediation' }, { minutes: 40, minWords: 220, maxWords: 250, sourceMinWords: 450, sourceMaxWords: 550, sourceMode: 'audio' }],
  [{ kind: 'writing', mode: 'short', variant: 'mediation' }, { minutes: 15, minWords: 80, maxWords: 120, sourceMinWords: 200, sourceMaxWords: 260 }],
  [{ kind: 'writing', mode: 'short', variant: 'formal' }, { minutes: 15, minWords: 80, maxWords: 120, sourceMinWords: 100, sourceMaxWords: 180 }],
  [{ kind: 'speaking', mode: 'block', variant: 'mediation' }, { minutes: 25, minWords: 0, maxWords: 0, sourceMinWords: 400, sourceMaxWords: 500, questionCount: 0 }],
  [{ kind: 'speaking', mode: 'short', variant: 'mediation' }, { minutes: 15, sourceMinWords: 230, sourceMaxWords: 300 }],
  [{ kind: 'speaking', mode: 'block', variant: 'negotiation' }, { minutes: 25, sourceMinWords: 180, sourceMaxWords: 240 }],
  [{ kind: 'speaking', mode: 'short', variant: 'negotiation' }, { minutes: 15, sourceMinWords: 120, sourceMaxWords: 180 }]
 ];
 for (const [input, fields] of expected) {
  const bp = buildBlueprint(input);
  assert.equal(bp.version, 'c1-v2');
  assert.equal(bp.subtype, input.variant);
  for (const [key, value] of Object.entries(fields)) assert.equal(bp[key], value, `${input.kind}/${input.variant}/${input.mode}: ${key}`);
  assert.match(bp.notice, /não equivale a simulado/);
  assert.ok(bp.requirements.includes(`${bp.sourceMinWords}-${bp.sourceMaxWords} palavras`));
  assert.ok(bp.requirements.includes(`minutes=${bp.minutes}`));
 }
});

test('blueprints label partial and reduced formats honestly', () => {
 assert.match(buildBlueprint({ kind: 'writing', mode: 'short', variant: 'formal' }).label, /treino parcial/);
 assert.match(buildBlueprint({ kind: 'reading', mode: 'block', variant: 'language' }).notice, /6 lacunas.*14/);
 assert.match(buildBlueprint({ kind: 'listening', mode: 'block' }).notice, /não imita a seleção de 6 entre 12/);
 const negotiation = buildBlueprint({ kind: 'speaking', mode: 'block', variant: 'negotiation' });
 assert.match(negotiation.requirements, /restrição explícita/);
 assert.match(negotiation.requirements, /discorda/);
 assert.match(negotiation.requirements, /pergunta/);
 assert.match(buildBlueprint({ kind: 'reading', mode: 'block' }).requirements, /nunca reduzem extensão/);
});

test('blueprints reject unknown kind, mode or variant', () => {
 assert.throws(() => buildBlueprint({ kind: 'grammar', mode: 'short' }));
 assert.throws(() => buildBlueprint({ kind: 'constructor', mode: 'short' }));
 assert.throws(() => buildBlueprint({ kind: 'reading', mode: 'long' }));
 assert.throws(() => buildBlueprint({ kind: 'reading', mode: 'short', variant: 'pragmatics' }));
});

test('auto variant alternates subtypes from recent history of the same kind', () => {
 assert.equal(buildBlueprint({ kind: 'reading', mode: 'block' }).subtype, 'inference');
 assert.equal(buildBlueprint({ kind: 'reading', mode: 'block', recent: [{ kind: 'reading', subtype: 'inference' }] }).subtype, 'language');
 assert.equal(buildBlueprint({ kind: 'reading', mode: 'block', recentTasks: [{ kind: 'reading', payload: JSON.stringify({ subtype: 'language' }) }] }).subtype, 'inference');
 assert.equal(buildBlueprint({ kind: 'speaking', mode: 'short', recent: [{ kind: 'writing', subtype: 'mediation' }] }).subtype, 'mediation');
 assert.equal(buildBlueprint({ kind: 'writing', mode: 'block', recent: [{ kind: 'writing', subtype: 'mediation' }, { kind: 'writing', subtype: 'formal' }] }).subtype, 'formal');
 assert.equal(buildBlueprint({ kind: 'listening', mode: 'short', recent: [{ kind: 'listening', payload: 'not json' }, null] }).subtype, 'inference');
});

test('diagnostic keeps a stable subtype and the same C1 demand', () => {
 const bp = buildBlueprint({ kind: 'reading', mode: 'block', diagnostic: true, recent: [{ kind: 'reading', subtype: 'inference' }] });
 assert.equal(bp.subtype, 'inference');
 assert.equal(bp.questionCount, 6);
 assert.match(bp.requirements, /Triagem inicial: mesma exigência C1/);
});

test('a well-built inference task passes validation', () => {
 const task = readingTask();
 assert.equal(validateBlueprintTask(task, shortReading), task);
});

test('source bounds allow 10% tolerance and nothing beyond', () => {
 assert.deepEqual(sourceWordRange(shortReading), { min: 198, max: 330 });
 assert.equal(countWords(readingTask(198).source), 198);
 assert.doesNotThrow(() => validateBlueprintTask(readingTask(198), shortReading));
 assert.doesNotThrow(() => validateBlueprintTask(readingTask(330), shortReading));
 assert.throws(() => validateBlueprintTask(readingTask(197), shortReading), /fonte tem 197/);
 assert.throws(() => validateBlueprintTask(readingTask(331), shortReading), /fonte tem 331/);
});

test('minutes, word targets and question count are strict', () => {
 assert.throws(() => validateBlueprintTask({ ...readingTask(), minutes: 20 }, shortReading), /tempo/);
 assert.throws(() => validateBlueprintTask({ ...readingTask(), maxWords: 120 }, shortReading), /extensão/);
 const task = readingTask();
 assert.throws(() => validateBlueprintTask({ ...task, questions: task.questions.slice(0, 3) }, shortReading), /exatamente 4/);
 assert.throws(() => validateBlueprintTask({ ...task, questions: [...task.questions, { ...task.questions[0], prompt: '¿Qué otra idea se deduce?' }] }, shortReading), /exatamente 4/);
});

test('skills must be allowed and at least half go beyond literal detail', () => {
 const task = readingTask();
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { skill: 'vocabulary' }), shortReading), /habilidade inválida/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { skill: 'grammar' }), shortReading), /habilidade inválida/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { skill: undefined }), shortReading), /habilidade inválida/);
 const twoDetail = withQuestion(task, 0, { skill: 'detail' });
 assert.doesNotThrow(() => validateBlueprintTask(twoDetail, shortReading));
 assert.throws(() => validateBlueprintTask(withQuestion(twoDetail, 1, { skill: 'detail' }), shortReading), /além do detalhe/);
});

test('options must be three, distinct after normalization and comparable in length', () => {
 const task = readingTask();
 assert.throws(() => validateBlueprintTask(withQuestion(task, 2, { choices: ['Una ironía moderada ante su optimismo', 'una ironía moderada, ante su optimismo!', 'Una indiferencia completa ante sus argumentos'] }), shortReading), /repetidas/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 2, { choices: task.questions[2].choices.slice(0, 2) }), shortReading), /três opções/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 3, { choices: ['Aproximadamente un año y medio', 'Solo durante los primeros seis meses según el calendario aprobado por el pleno municipal tras un largo debate con los vecinos y comerciantes', 'Hasta el final del periodo electoral'] }), shortReading), /comprimentos/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 3, { correctIndex: 3 }), shortReading), /gabarito/);
});

test('correct option cannot always be the longest', () => {
 const task = readingTask();
 const giveaway = { ...task, questions: task.questions.map(q => ({ ...q, choices: q.choices.map((c, i) => i === q.correctIndex ? `${c} en el contexto descrito` : c) })) };
 assert.throws(() => validateBlueprintTask(giveaway, shortReading), /mais longa/);
});

test('evidence must be literal and anchored', () => {
 const task = readingTask();
 assert.throws(() => validateBlueprintTask(withQuestion(task, 1, { evidence: 'quizá no ha caminado nunca por el barrio' }), shortReading), /literal/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 1, { evidence: 'febrero.' }), shortReading), /evidência/);
});

test('inference answers cannot be copied from the source or given away in the prompt', () => {
 const task = readingTask();
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { choices: ['duda de que compense la pérdida de comercios', 'Cree que el tráfico seguirá creciendo sin remedio', 'Rechaza cualquier cambio en la organización urbana'] }), shortReading), /copia a fonte/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 3, { prompt: '¿Durante cuánto tiempo, aproximadamente un año y medio, se evaluarán?' }), shortReading), /entrega a resposta/);
});

test('explanations need substance and cannot cite option letters or positions', () => {
 const task = readingTask();
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { explanation: 'Lo dice el texto.' }), shortReading), /explicação/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { explanation: 'La opción B es incorrecta porque el texto no sugiere ese rechazo.' }), shortReading), /posição/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { explanation: 'La primera opción interpreta bien la duda de la autora sobre los comercios.' }), shortReading), /posição/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { explanation: 'A alternativa C exagera, pois a autora reconhece a redução do tráfego.' }), shortReading), /posição/);
 assert.doesNotThrow(() => validateBlueprintTask(withQuestion(task, 0, { explanation: 'La autora nunca rechaza el cambio; siempre matiza sus costes sociales para el barrio.' }), shortReading));
 assert.doesNotThrow(() => validateBlueprintTask(withQuestion(task, 0, { explanation: 'La respuesta a la pregunta exige ver que la autora acepta un beneficio y teme un coste.' }), shortReading));
});

test('language-use tasks accept short grammatical options and require ordered gaps', () => {
 const bp = buildBlueprint({ kind: 'reading', mode: 'short', variant: 'language' });
 const task = languageTask();
 assert.equal(validateBlueprintTask(task, bp), task);
 const renumbered = { ...task, source: task.source.replace('[4]', '[5]'), questions: task.questions.map((q, i) => i === 3 ? { ...q, evidence: q.evidence.replace('[4]', '[5]') } : q) };
 assert.throws(() => validateBlueprintTask(renumbered, bp), /lacunas \[1\] a \[4\]/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 1, { evidence: 'Nadie esperaba que el alcalde' }), bp), /lacuna \[2\]/);
 assert.throws(() => validateBlueprintTask(withQuestion(task, 0, { skill: 'inference' }), bp), /habilidade inválida/);
});

test('productive tasks enforce exact targets, no questions and negotiation interaction', () => {
 const formal = buildBlueprint({ kind: 'writing', mode: 'block', variant: 'formal' });
 assert.doesNotThrow(() => validateBlueprintTask(productiveTask(formal, 140), formal));
 assert.throws(() => validateBlueprintTask(productiveTask(formal, 140, { minWords: 150 }), formal), /extensão/);
 assert.throws(() => validateBlueprintTask(productiveTask(formal, 60), formal), /fonte tem 60/);
 assert.throws(() => validateBlueprintTask(productiveTask(formal, 140, { questions: [readingTask().questions[0]] }), formal), /produção/);
 const negotiation = buildBlueprint({ kind: 'speaking', mode: 'block', variant: 'negotiation' });
 assert.throws(() => validateBlueprintTask(productiveTask(negotiation, 200, { instruction: 'Negocie con su compañero una solución.' }), negotiation), /pergunta/);
 assert.doesNotThrow(() => validateBlueprintTask(productiveTask(negotiation, 200, { instruction: 'Negocie con su compañero. ¿Por qué prefiere usted esa opción?' }), negotiation));
 const mediation = buildBlueprint({ kind: 'speaking', mode: 'short', variant: 'mediation' });
 assert.doesNotThrow(() => validateBlueprintTask(productiveTask(mediation, 260), mediation));
});

test('quality review schema is strict at every object level', () => {
 let objects = 0;
 const walk = node => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'object') {
   objects++;
   assert.equal(node.additionalProperties, false);
   assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort());
  }
  Object.values(node).forEach(walk);
 };
 walk(qualityReviewSchema);
 assert.equal(objects, 2);
 assert.deepEqual([...qualityReviewSchema.properties.level.enum], ['C1', 'below_C1']);
 assert.equal(qualityReviewSchema.properties.items.items.properties.index.type, 'integer');
});

test('quality review gate rejects ambiguity, weak items and incomplete coverage', () => {
 const ok = { approved: true, level: 'C1', issues: [], items: reviewItems(4) };
 assert.equal(assertQualityReview(ok, shortReading), true);
 assert.throws(() => assertQualityReview({ ...ok, approved: false }, shortReading), /não aprovou/);
 assert.throws(() => assertQualityReview({ ...ok, level: 'below_C1' }, shortReading), /abaixo de C1/);
 assert.throws(() => assertQualityReview({ ...ok, items: reviewItems(3) }, shortReading), /exatamente 4/);
 assert.throws(() => assertQualityReview({ ...ok, items: [...reviewItems(3), { ...reviewItems(1)[0] }] }, shortReading), /repetido/);
 assert.throws(() => assertQualityReview({ ...ok, items: reviewItems(4).map(item => ({ ...item, index: item.index + 1 })) }, shortReading), /fora do intervalo/);
 assert.throws(() => assertQualityReview({ ...ok, items: reviewItems(4).map((item, i) => i === 2 ? { ...item, unambiguous: false } : item) }, shortReading), /ambígua a questão 3/);
 assert.throws(() => assertQualityReview({ ...ok, items: reviewItems(4).map((item, i) => i === 1 ? { ...item, evidenceSufficient: false } : item) }, shortReading), /evidência/);
 assert.throws(() => assertQualityReview({ ...ok, items: reviewItems(4).map((item, i) => i === 0 ? { ...item, distractorsPlausible: false } : item) }, shortReading), /distratores/);
 assert.equal(assertQualityReview({ ...ok, items: reviewItems(4).map((item, i) => ({ ...item, c1Demand: i < 2 })) }, shortReading), true);
 assert.throws(() => assertQualityReview({ ...ok, items: reviewItems(4).map((item, i) => ({ ...item, c1Demand: i === 0 })) }, shortReading), /metade/);
 const writing = buildBlueprint({ kind: 'writing', mode: 'block', variant: 'mediation' });
 assert.equal(assertQualityReview({ approved: true, level: 'C1', issues: [], items: [] }, writing), true);
 assert.throws(() => assertQualityReview({ approved: true, level: 'C1', issues: [], items: reviewItems(1) }, writing), /produção/);
 assert.throws(() => assertQualityReview({ approved: false, level: 'C1', issues: ['Instrução vaga.'], items: [] }, writing), /não aprovou/);
});

test('shuffle preserves the answer key and never mutates the original', () => {
 const task = readingTask(), snapshot = structuredClone(task);
 const shuffled = shuffleQuestionOptions(task, () => 0);
 assert.deepEqual(task, snapshot);
 assert.notEqual(shuffled, task);
 assert.notEqual(shuffled.questions[0], task.questions[0]);
 assert.notEqual(shuffled.questions[0].choices, task.questions[0].choices);
 const [a, b, c] = task.questions[0].choices;
 assert.deepEqual(shuffled.questions[0].choices, [b, c, a]);
 assert.equal(shuffled.questions[0].correctIndex, 2);
 shuffled.questions.forEach((q, i) => {
  assert.equal(q.choices[q.correctIndex], task.questions[i].choices[task.questions[i].correctIndex]);
  assert.deepEqual([...q.choices].sort(), [...task.questions[i].choices].sort());
 });
 shuffled.questions[1].choices.push('mutación');
 assert.equal(task.questions[1].choices.length, 3);
});

test('shuffle validates the random source and works with the default crypto source', () => {
 assert.throws(() => shuffleQuestionOptions(readingTask(), limit => limit), /índice inválido/);
 assert.throws(() => shuffleQuestionOptions(readingTask(), () => 0.5), /índice inválido/);
 const limits = [];
 shuffleQuestionOptions(readingTask(), limit => { limits.push(limit); return 0; });
 assert.deepEqual(limits.slice(0, 2), [3, 2]);
 const task = readingTask();
 for (let run = 0; run < 30; run++) {
  shuffleQuestionOptions(task).questions.forEach((q, i) => assert.equal(q.choices[q.correctIndex], task.questions[i].choices[task.questions[i].correctIndex]));
 }
});

test('review prompt asks to solve each item from the source before seeing the key', () => {
 const task = readingTask(), prompt = qualityReviewPrompt(task, shortReading);
 assert.match(prompt, /sem reescrevê-la/);
 assert.match(prompt, /independente/);
 assert.ok(prompt.includes(task.source));
 task.questions.forEach(q => assert.ok(prompt.includes(q.prompt)));
 const solveAt = prompt.indexOf('ITENS PARA RESOLVER'), keyAt = prompt.indexOf('CHAVE (consulte');
 assert.ok(solveAt > 0 && keyAt > solveAt);
 assert.ok(!prompt.slice(0, keyAt).includes('"correctIndex"'));
 assert.ok(prompt.slice(keyAt).includes('"correctIndex"'));
 assert.match(prompt, /exatamente 4 objetos/);
});

test('review prompt for productive tasks checks clarity, register, mediation and constraints', () => {
 const bp = buildBlueprint({ kind: 'writing', mode: 'block', variant: 'mediation' });
 const prompt = qualityReviewPrompt(productiveTask(bp, 500), bp);
 assert.match(prompt, /items deve ser \[\]/);
 assert.match(prompt, /Registro/);
 assert.match(prompt, /Mediação/);
 assert.match(prompt, /Restrições/);
 assert.match(prompt, /220–250 palavras/);
 assert.match(prompt, /transcrição de áudio/);
});

test('sanitized payload hides keys, evidence, review and audio source', () => {
 const payload = { ...readingTask(), sourceMode: 'audio', trainingVersion: 'c1-v2', subtype: 'inference', qualityReview: { approved: true } };
 payload.questions[0].review = { unambiguous: true };
 const safe = sanitizeTaskPayload(payload);
 assert.equal(safe.source, '');
 assert.equal('qualityReview' in safe, false);
 assert.equal(safe.trainingVersion, 'c1-v2');
 safe.questions.forEach((q, i) => {
  assert.deepEqual(Object.keys(q).sort(), ['choices', 'prompt', 'skill']);
  assert.equal(q.skill, payload.questions[i].skill);
 });
 assert.ok(!JSON.stringify(safe).includes('plazo de dieciocho'));
 assert.ok(payload.source.length > 0);
 assert.equal(payload.questions[0].correctIndex, 0);
 assert.ok(payload.questions[0].review);
 const visible = sanitizeTaskPayload({ ...readingTask(), sourceMode: 'text' });
 assert.ok(visible.source.includes('martes de febrero'));
 assert.deepEqual(sanitizeTaskPayload({ title: 'Escritura', source: 'texto', questions: [] }).questions, []);
 assert.throws(() => sanitizeTaskPayload(null));
});

test('rejects sets that repeatedly make distractors extreme and the key moderate',()=>{const task=readingTask();task.questions=task.questions.map(q=>({...q,choices:q.choices.map((c,k)=>k===q.correctIndex?c:'Todos los vecinos rechazan siempre la propuesta '+k)}));assert.throws(()=>validateBlueprintTask(task,shortReading),/extremos/);});

test('blind solver sees neither key nor explanation and disagreement blocks publication',()=>{const task=readingTask();const prompt=blindSolvePrompt(task);assert.equal(prompt.includes('correctIndex'),false);assert.equal(prompt.includes('evidence'),false);assert.equal(prompt.includes('explanation'),false);assert.equal(assertBlindSolve([0,0,0,0],task),true);assert.throws(()=>assertBlindSolve([0,1,0,0],task),/divergiu/);assert.throws(()=>assertBlindSolve([0,-1,0,0],task),/divergiu/);});
