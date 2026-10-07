// Voz reutilizável: limite de entrada, concorrência controlada e cache privado em D1.
export class SpeechError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function splitSpeech(text,limit=4096){
 if(typeof text!=='string'||!text.trim())throw new SpeechError('Fonte de áudio vazia.');
 const chunks=[];let rest=text.trim();
 while(rest.length>limit){const prefix=rest.slice(0,limit);let cut=Math.max(prefix.lastIndexOf('. '),prefix.lastIndexOf('? '),prefix.lastIndexOf('! '),prefix.lastIndexOf('\n'));if(cut<limit/2)cut=prefix.lastIndexOf(' ');if(cut<1)cut=limit;else if(['.','?','!'].includes(rest[cut]))cut++;chunks.push(rest.slice(0,cut).trim());rest=rest.slice(cut).trim();}
 if(rest)chunks.push(rest);return chunks;
}
export async function cachedSpeech(db,id){
 const cached=await db.prepare('SELECT mime,bytes,data,cache_token FROM generated_audio WHERE task_id=?').bind(id).first();if(!cached)return null;
 const parts=(await db.prepare('SELECT data FROM generated_audio_chunks WHERE task_id=? AND cache_token=? ORDER BY part').bind(id,cached.cache_token).all()).results;
 const arrays=[cached,...parts].map(p=>new Uint8Array(p.data));if(arrays.reduce((n,a)=>n+a.length,0)!==cached.bytes)return null;
 const audio=new Uint8Array(cached.bytes);let offset=0;for(const a of arrays){audio.set(a,offset);offset+=a.length;}return {bytes:audio.buffer,mime:cached.mime};
}
export async function prepareSpeech(env,row,synthesize){
 const hit=await cachedSpeech(env.DB,row.id);if(hit)return {...hit,cache:'hit'};
 const token=crypto.randomUUID(),now=Date.now();
 const lock=await env.DB.prepare('INSERT INTO speech_locks(task_id,token,expires_at) VALUES (?,?,?) ON CONFLICT(task_id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE expires_at<? RETURNING token').bind(row.id,token,now+180000,now).first();
 if(!lock)throw new SpeechError('O áudio já está sendo preparado. Aguarde um pouco e abra novamente; não vamos gerar outra cópia.',409);
 try{
  const second=await cachedSpeech(env.DB,row.id);if(second)return {...second,cache:'hit'};
  const payload=typeof row.payload==='string'?JSON.parse(row.payload):row.payload;
  const chunks=splitSpeech(payload.source);
  // Trechos longos seguem a mesma voz; no máximo dois pedidos simultâneos.
  const buffers=[];for(let i=0;i<chunks.length;i+=2){buffers.push(...await Promise.all(chunks.slice(i,i+2).map(synthesize)));}
  const length=buffers.reduce((n,b)=>n+b.byteLength,0);if(!length||length>10000000)throw new SpeechError('Áudio fora do limite de armazenamento.',413);
  const bytes=new Uint8Array(length);let offset=0;for(const b of buffers){bytes.set(new Uint8Array(b),offset);offset+=b.byteLength;}
  const cacheToken=crypto.randomUUID();
  const writes=[env.DB.prepare('INSERT INTO generated_audio(task_id,mime,bytes,data,cache_token) SELECT ?,?,?,?,? WHERE (SELECT COALESCE(SUM(bytes),0) FROM generated_audio WHERE task_id<>?)+?<=100000000 ON CONFLICT(task_id) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes,data=excluded.data,cache_token=excluded.cache_token').bind(row.id,'audio/mpeg',length,bytes.buffer.slice(0,900000),cacheToken,row.id,length)];
  for(let offset=900000,part=1;offset<length;offset+=900000,part++)writes.push(env.DB.prepare('INSERT OR IGNORE INTO generated_audio_chunks(task_id,cache_token,part,data) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM generated_audio WHERE task_id=? AND cache_token=?)').bind(row.id,cacheToken,part,bytes.buffer.slice(offset,offset+900000),row.id,cacheToken));
  writes.push(env.DB.prepare('DELETE FROM generated_audio_chunks WHERE task_id=? AND cache_token<>? AND EXISTS(SELECT 1 FROM generated_audio WHERE task_id=? AND cache_token=?)').bind(row.id,cacheToken,row.id,cacheToken));
  await env.DB.batch(writes);
  const saved=await env.DB.prepare('SELECT task_id FROM generated_audio WHERE task_id=? AND cache_token=?').bind(row.id,cacheToken).first();
  console.info(JSON.stringify({event:'speech_ready',taskId:row.id,elapsedMs:Date.now()-now,parts:chunks.length,cached:!!saved}));
  return {bytes:bytes.buffer,mime:'audio/mpeg',cache:saved?'miss':'uncached'};
 }finally{await env.DB.prepare('DELETE FROM speech_locks WHERE task_id=? AND token=?').bind(row.id,token).run();}
}
