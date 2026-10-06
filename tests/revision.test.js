import test from 'node:test';
import assert from 'node:assert/strict';
import {revisionDraft,linkWritingRevision,hasUnsubmittedDraft} from '../public/revision-draft.js';
test('reescrita a partir do histórico mantém resposta, pai e prioridades, e zera tempo e áudio',()=>{
 const d=revisionDraft({id:'original',kind:'writing',answer:'Mi texto original',seconds:900,audio_key:'antigo',feedback:{priorities:[{issue:'Desenvolver a conclusão'},{issue:null}]}});
 assert.equal(d.parentAttemptId,'original');assert.equal(d.answer,'Mi texto original');assert.deepEqual(d.rewriteIssues,['Desenvolver a conclusão']);assert.equal(d.clockMs,0);assert.equal(d.attemptId,null);assert.equal(d.audioId,null);assert.equal(d.followUp,null);
});
test('continuação oral mantém pergunta e pai, mas começa sem a transcrição anterior',()=>{
 const d=revisionDraft({id:'fala',kind:'speaking',answer:'Resposta anterior',feedback:{followUp:'¿Qué harías ante esta objeción?'}});
 assert.equal(d.parentAttemptId,'fala');assert.equal(d.answer,'');assert.equal(d.audioId,null);assert.equal(d.followUp,'¿Qué harías ante esta objeción?');assert.equal(d.rewriteIssues,null);
});
test('correção pendente e questão objetiva não criam vínculo de revisão falso',()=>{
 for(const a of [{id:'p',kind:'writing',feedback:null},{id:'p',kind:'reading',feedback:{type:'objective'}},{id:'p',kind:'speaking',feedback:{followUp:'  '}},{kind:'writing',feedback:{priorities:[]}}])assert.equal(revisionDraft(a),null);
});

test('editar no mesmo formulário mantém o vínculo sem apagar texto novo ou tempo ativo',()=>{
 const draft={answer:'Texto já editado',clockMs:12000,attemptId:null};
 const linked=linkWritingRevision(draft,{id:'corrigida',kind:'writing',feedback:{priorities:[{issue:'Conclusão'}]}});
 assert.equal(linked.answer,draft.answer);assert.equal(linked.clockMs,12000);assert.equal(linked.parentAttemptId,'corrigida');assert.deepEqual(linked.rewriteIssues,['Conclusão']);
 assert.equal(linkWritingRevision(draft,{id:'pendente',kind:'writing',feedback:null}),draft);
 assert.equal(linkWritingRevision(draft,{id:'oral',kind:'speaking',feedback:{followUp:'Sigue'}}),draft);
});

test('resposta já enviada não ocupa o atalho de rascunho; edição nova continua protegida',()=>{
 const a={kind:'writing',answer:'Mi texto',audio_key:null};
 assert.equal(hasUnsubmittedDraft({answer:'Mi texto'},a),false);
 assert.equal(hasUnsubmittedDraft({answer:'Mi texto mejorado'},a),true);
 assert.equal(hasUnsubmittedDraft({answer:'Mi texto',attemptId:'envio-pendente'},a),true);
 assert.equal(hasUnsubmittedDraft({answers:[0,1]}, {kind:'reading',answer:'[0,1]'}),false);
 assert.equal(hasUnsubmittedDraft({answers:[1,1]}, {kind:'reading',answer:'[0,1]'}),true);
 assert.equal(hasUnsubmittedDraft({answer:'',answers:[]},null),false);
});
