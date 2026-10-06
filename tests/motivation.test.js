import test from 'node:test';
import assert from 'node:assert/strict';
import {motivationFor} from '../public/motivation.js';

test('a mensagem permanece estável no dia e varia sem rede entre dias e perfis',()=>{
 const context={profile:'alana',kind:'writing',dateISO:'2026-10-06'};
 assert.deepEqual(motivationFor(context),motivationFor({...context}));
 assert.notEqual(motivationFor(context).id,motivationFor({...context,dateISO:'2026-10-07'}).id);
 assert.notEqual(motivationFor(context).id,motivationFor({...context,profile:'luiz'}).id);
});
test('retomar e revisar têm prioridade sobre uma dica de atividade nova',()=>{
 for(const kind of ['reading','listening','writing','speaking']){
  assert.match(motivationFor({kind,dateISO:'2026-10-06',hasDraft:true,review:true}).id,/^draft-/);
  assert.match(motivationFor({kind,dateISO:'2026-10-06',review:true}).id,/^review-/);
  assert.match(motivationFor({kind,dateISO:'2026-10-06'}).id,new RegExp('^'+kind+'-'));
 }
});
test('contexto incompleto ainda produz orientação legível sem erro',()=>{
 for(const c of [undefined,{}, {profile:'desconhecido',kind:'outro',dateISO:'inválida'},{dateISO:'1969-12-31'}]){
  const m=motivationFor(c);assert.equal(typeof m.line,'string');assert.ok(m.line.trim());assert.equal(typeof m.action,'string');assert.ok(m.action.trim());
 }
});

test('retomar áudio e questões não recebe orientação exclusiva de texto escrito',()=>{
 for(let n=1;n<=20;n++){
  const dateISO=`2026-10-${String(n).padStart(2,'0')}`;
  for(const kind of ['reading','listening','speaking']){
   const m=motivationFor({kind,dateISO,hasDraft:true});assert.doesNotMatch(m.line,/uma frase que ainda/);assert.doesNotMatch(m.action,/parágrafo|reescreva/);
  }
  assert.doesNotMatch(motivationFor({kind:'speaking',dateISO,review:true}).line,/Reescrever/);
 }
});
