import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverPhoto,photoResizeOptions} from '../public/experience-ui.js';

test('confirmação perdida é recuperada pelo id sem postar outra foto',async()=>{
 const calls=[],stored=[];const body={photo:'pixels'};
 const api=async(path,options)=>{calls.push(options?.method||'GET');if(options?.method==='POST'){stored.push({id:'same-id'});throw new Error('rede caiu após gravar');}return {items:stored};};
 await assert.rejects(deliverPhoto(api,{id:'same-id',body}),e=>e.uncertain===true);
 assert.deepEqual(await deliverPhoto(api,{id:'same-id',body,reconcile:true}),{created:false});
 assert.deepEqual(calls,['POST','GET']);assert.equal(stored.length,1);
});
test('envio que não chegou consulta o álbum e repete o corpo original',async()=>{
 const calls=[],body={photo:'original'};const api=async(path,options)=>{calls.push({method:options?.method||'GET',body:options?.body});return options?{created:true}:{items:[]};};
 assert.equal((await deliverPhoto(api,{id:'same-id',body,reconcile:true})).created,true);
 assert.equal(calls[0].method,'GET');assert.equal(calls[1].method,'POST');assert.equal(calls[1].body,body);
});
test('falha ao conferir não dispara POST e mantém resultado incerto',async()=>{
 let calls=0;const api=async()=>{calls++;const e=new Error('sem sessão');e.status=401;throw e;};
 await assert.rejects(deliverPhoto(api,{id:'id',body:{},reconcile:true}),e=>e.uncertain===true);assert.equal(calls,1);
});
test('rejeição definitiva libera ajustes; falha de servidor mantém confirmação pendente',async()=>{
 for(const status of [400,401,413,409,500]){const api=async()=>{const e=new Error('rejeição');e.status=status;throw e;};await assert.rejects(deliverPhoto(api,{id:'id',body:{}}),e=>e.uncertain===(status===409||status>=500));}
});


test('PNG pequeno não é ampliado; foto retrato grande reduz pelo maior lado',()=>{
 const b=new Uint8Array(24);b.set([137,80,78,71]);const view=new DataView(b.buffer);view.setUint32(16,1080);view.setUint32(20,1350);assert.deepEqual(photoResizeOptions(b),{});
 view.setUint32(16,4000);view.setUint32(20,6000);assert.deepEqual(photoResizeOptions(b),{resizeHeight:1600,resizeQuality:'high'});
});
test('JPEG com segmento EXIF e WebP reais usam dimensão declarada; truncado não inventa dimensão',()=>{
 const jpg=new Uint8Array([255,216,255,225,0,4,0,0,255,192,0,7,8,15,160,23,112]);
 assert.deepEqual(photoResizeOptions(jpg),{resizeWidth:1600,resizeQuality:'high'});
 assert.deepEqual(photoResizeOptions(jpg.slice(0,14)),{});
 const webp=new Uint8Array(30);webp.set([...Buffer.from('RIFF')]);webp.set([...Buffer.from('WEBPVP8X')],8);webp[24]=0x6f;webp[25]=0x17;webp[27]=0x9f;webp[28]=0x0f;
 assert.deepEqual(photoResizeOptions(webp),{resizeWidth:1600,resizeQuality:'high'});
});
