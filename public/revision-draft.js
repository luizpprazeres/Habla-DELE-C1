// A nova tentativa parte da resposta corrigida, sem herdar tempo, áudio ou ID de envio.
export function revisionDraft(attempt) {
 const feedback=attempt?.feedback;
 if(!attempt?.id || !feedback || typeof feedback!=='object')return null;
 const base={parentAttemptId:attempt.id,attemptId:null,clockMs:0,started:0,audioId:null,answers:[]};
 if(attempt.kind==='writing')return {...base,answer:String(attempt.answer || ''),followUp:null,rewriteIssues:(Array.isArray(feedback.priorities)?feedback.priorities:[]).map(p=>p?.issue).filter(x=>typeof x==='string' && x.trim())};
 if(attempt.kind==='speaking' && typeof feedback.followUp==='string' && feedback.followUp.trim())return {...base,answer:'',followUp:feedback.followUp,rewriteIssues:null};
 return null;
}

// Vincula a edição direta à correção recebida sem substituir texto ainda não enviado.
export function linkWritingRevision(draft,attempt){
 const revision=revisionDraft(attempt);
 if(attempt?.kind!=='writing' || !revision)return draft;
 return {...draft,parentAttemptId:revision.parentAttemptId,rewriteIssues:revision.rewriteIssues};
}

export function hasUnsubmittedDraft(draft,attempt){
 if(!draft)return false;
 const filled=!!(draft.answer?.trim() || draft.audioId || draft.answers?.some(Number.isInteger));
 if(!filled || !attempt)return filled;
 if(draft.attemptId)return true;
 if(['reading','listening'].includes(attempt.kind)){
  try{return JSON.stringify(draft.answers)!==JSON.stringify(JSON.parse(attempt.answer));}catch{return true;}
 }
 return String(draft.answer || '').trim()!==String(attempt.answer || '').trim() || !!(draft.audioId && draft.audioId!==attempt.audio_key);
}
