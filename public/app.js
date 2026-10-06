import {StudyClock} from './study-clock.js';
import {hasUnsubmittedDraft,linkWritingRevision,revisionDraft} from './revision-draft.js';
import {motivationFor} from './motivation.js';
const main = document.getElementById('main');
const speechUrls=new Map();
const labels = {reading:'Leitura',listening:'Escuta',writing:'Escrita',speaking:'Fala'};
const variants={reading:[['auto','Alternar inferência e uso da língua'],['inference','Inferência, intenção e atitude'],['language','Coesão, gramática e léxico']],listening:[['auto','Alternar escuta e pragmática'],['inference','Informação implícita'],['pragmatics','Intenção e expressões idiomáticas']],writing:[['auto','Alternar as duas tarefas'],['formal','Carta ou texto formal'],['mediation','Mediação de áudio']],speaking:[['auto','Alternar mediação e negociação'],['mediation','Resumir, argumentar e entrevistar'],['negotiation','Negociar diante de objeções']]};
const desc = {reading:'Encontre a ideia, a intenção e a evidência.',listening:'Ouça, selecione as ideias e interprete.',writing:'Desenvolva um texto com propósito e estrutura.',speaking:'Resuma, argumente e sustente a interação.'};
// Storage pode estar bloqueado (modo privado, cota cheia, política do navegador). Cai para memória sem quebrar o treino.
const store=(()=>{const memory=new Map();let persistent=true,warned=false;try{const probe='habla-probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);}catch{persistent=false;}
 return {get persistent(){return persistent;},get(key){if(memory.has(key))return memory.get(key);try{return localStorage.getItem(key);}catch{return null;}},
  set(key,value){try{localStorage.setItem(key,value);memory.delete(key);}catch{memory.set(key,String(value));persistent=false;if(!warned){warned=true;toast('Este navegador não está guardando dados. O rascunho fica só nesta aba aberta.');}}},
  remove(key){memory.delete(key);try{localStorage.removeItem(key);}catch{}}};})();
const state = {profile:store.get('habla-profile') || 'luiz',page:'today',mode:store.get('habla-mode') || 'short',data:null,task:null,status:null,recorder:null,audioId:null,recording:false,started:0,clock:null,journey:null,journeyStatus:'idle'};
if(!['short','block'].includes(state.mode))state.mode='short';
if (!['luiz','alana'].includes(state.profile)) state.profile='luiz';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayLabel = date => new Date(date).toLocaleDateString('pt-BR',{timeZone:'America/Maceio',day:'numeric',month:'short'});
const draftKey = () => `habla-draft:${state.profile}:${state.task.id}`;
const uid = () => crypto.randomUUID?crypto.randomUUID():([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
const draftNote = () => store.persistent?'Rascunho salvo neste aparelho':'Rascunho guardado só nesta aba';
function toast(message) {const el=document.getElementById('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,6000);}
async function api(path,options={}) {
 let response;try{response=await fetch(path,{...options,headers:{...(options.body && typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});}catch{throw new Error('Sem conexão com o servidor. Tente novamente quando a conexão voltar.');}
 if(!response.ok){let data;try{data=await response.json();}catch{data={};}throw new Error(data.message || 'Falha de conexão. Tente novamente.');}
 try{return await response.json();}catch{throw new Error('O servidor não concluiu a resposta. Tente novamente.');}
}
let pendingOperations=0;
let blockedControls=new Map();
let busyButtonLabel=null;
async function busy(button,action) {
 if(!pendingOperations){blockedControls=new Map([...document.querySelectorAll('[data-profile],[data-page],main button,main select,main textarea,main input')].map(b=>[b,b.disabled]));blockedControls.forEach((_,b)=>b.disabled=true);main.setAttribute('aria-busy','true');}
 pendingOperations++;if(button){busyButtonLabel={button,text:button.textContent};button.textContent=button.matches('[data-generate],[data-diagnostic]')?'Criando e revisando…':button.matches('[data-listen]')?'Gerando áudio…':button.matches('[data-transcribe]')?'Transcrevendo…':button.matches('[data-pick-audio]')?'Enviando áudio…':button.matches('[data-retry]')?'Corrigindo…':button.matches('[data-celebrate]')?'Enviando…':button.matches('[data-profile]')?'Abrindo…':button.type==='submit' && state.task?'Salvando e corrigindo…':'Aguarde…';busyButtonLabel.busyText=button.textContent;button.setAttribute('aria-busy','true');}try{main.querySelector('.action-error')?.remove();if(button?.type==='submit' && state.task){const note=document.createElement('p');note.className='notice operation-status';note.setAttribute('role','status');note.textContent='Enviando e preparando a correção. Pode levar alguns instantes. Se a correção ficar pendente, sua resposta salva estará no histórico.';button.after(note);}await action();}catch(error){const note=document.createElement('p');note.className='notice action-error';note.setAttribute('role','alert');note.textContent=error.message;if(button?.isConnected && main.contains(button))button.after(note);else main.prepend(note);toast(error.message);}finally{main.querySelector('.operation-status')?.remove();pendingOperations--;if(!pendingOperations){blockedControls.forEach((disabled,b)=>{if(b.isConnected)b.disabled=disabled;});main.removeAttribute('aria-busy');if(busyButtonLabel?.button.isConnected){if(busyButtonLabel.button.textContent===busyButtonLabel.busyText)busyButtonLabel.button.textContent=busyButtonLabel.text;busyButtonLabel.button.removeAttribute('aria-busy');}busyButtonLabel=null;blockedControls.clear();}}
}
// Controles pintados durante uma operação nascem bloqueados e são liberados junto com os demais no fim dela.
function holdIfBusy(root){if(!pendingOperations || !root)return;root.querySelectorAll('button,select,textarea,input').forEach(b=>{if(!blockedControls.has(b)){blockedControls.set(b,b.disabled);b.disabled=true;}});}
function profileName(){return state.profile==='luiz'?'Luiz':'Alana';}
function syncChrome(){document.querySelectorAll('[data-profile]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.profile===state.profile)));document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===state.page);if(b.dataset.page===state.page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
async function reloadData(){state.data=await api(`/api/dashboard?profile=${state.profile}`);}
function todayISO(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Maceio',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function daysLeft(){return Math.max(0,Math.ceil((Date.parse('2026-11-14T00:00:00Z')-Date.parse(todayISO()+'T00:00:00Z'))/86400000));}
function hasDraft(id){try{const d=JSON.parse(store.get(`habla-draft:${state.profile}:${id}`)) || {};return hasUnsubmittedDraft(d,state.data?.attempts.find(a=>a.task_id===id));}catch{return false;}}
function taskCard(task){return `<article class="card task-card"><span class="tag ${task.kind==='speaking'?'peach':task.kind==='writing'?'purple':''}">${labels[task.kind]}${task.payload.trainingVersion==='c1-v2'?' · C1':' · Aquecimento'}${task.diagnostic?' · Diagnóstico inicial':''}</span><h3>${esc(task.title)}</h3><small>${esc(task.payload.focus)}</small><div class="task-bottom"><span class="sub">${task.payload.minutes} min${hasDraft(task.id)?' · Rascunho em andamento':task.attempts_count?' · Já praticada':''}</span><button class="primary" data-open="${task.id}">${hasDraft(task.id)?'Continuar':task.attempts_count?'Abrir treino':'Começar'} →</button></div></article>`;}
function render(){if(!state.data)return;pauseStudy();syncChrome();state.task=null;state.started=0;state.clock=null;if(state.page==='today')renderToday();else if(state.page==='practice')renderPractice();else if(state.page==='progress')renderProgress();else renderSources();bindMain();window.scrollTo(0,0);}
function renderToday(){
 const pending=state.data.tasks.filter(t=>!t.attempts_count), reviews=state.data.attempts.filter(a=>a.review_at && Date.parse(a.review_at)<=Date.now());
 const diagnostics=new Set(state.data.attempts.filter(a=>a.diagnostic).map(a=>a.kind));
 const nextKind=Object.keys(labels).find(k=>!diagnostics.has(k));
 const nextTask=pending.find(t=>t.diagnostic && t.kind===nextKind && (t.payload.trainingVersion==='c1-v2' || hasDraft(t.id)));
 const draftTask=state.data.tasks.find(t=>hasDraft(t.id));
 const chosen=draftTask || nextTask || (!nextKind && pending[0]);
 const date=todayISO(),nudge=(kind,draft=false,review=false)=>{const m=motivationFor({profile:state.profile,kind,dateISO:date,hasDraft:draft,review});return `<p class="nudge" data-motivation="${esc(m.id)}"><span class="nudge-line">${esc(m.line)}</span><span class="nudge-action">${esc(m.action)}</span></p>`;};
 const nextPanel=chosen?`<section class="next-task"><span class="tag">${labels[chosen.kind]} · ${chosen.payload.minutes} min</span><h2>${esc(chosen.title)}</h2>${hasDraft(chosen.id)?'<p class="sub next-status">Seu rascunho está pronto para continuar.</p>':''}<button class="primary" data-open="${chosen.id}">${hasDraft(chosen.id)?'Continuar meu treino':'Começar este treino'} →</button>${nudge(chosen.kind,hasDraft(chosen.id))}</section>`:nextKind?`<section class="next-task"><span class="tag">${labels[nextKind]} · Diagnóstico inicial</span><h2>Seu próximo passo: ${labels[nextKind].toLowerCase()}.</h2><p class="sub next-status">${diagnostics.size} de 4 habilidades respondidas. O tutor prepara a próxima tarefa ao começar.</p><button class="primary" data-diagnostic ${!state.status.ai?'disabled':''}>Continuar diagnóstico →</button>${nudge(nextKind)}</section>`:reviews.length?`<section class="next-task"><span class="tag">Revisão</span><h2>${esc(reviews[0].title)}</h2><p class="sub next-status">Correção disponível para retomar.</p><button class="primary" data-feedback="${reviews[0].id}">Revisar minha resposta →</button>${nudge(reviews[0].kind,false,true)}</section>`:`<section class="next-task"><h2>Prepare seu próximo treino.</h2><button class="primary" data-go="practice">Escolher atividade →</button>${nudge(null)}</section>`;
 const days=daysLeft();
 main.innerHTML=`<header class="today-head"><figure class="donostia"><img src="/donostia.svg" width="480" height="100" decoding="async" alt="Ilustração estilizada da baía de La Concha"><figcaption><strong>San Sebastián / Donostia</strong> — La Concha</figcaption></figure><div class="today-greet"><h1>Vamos praticar, ${profileName()}.</h1><p class="sub">${days} ${days===1?'dia':'dias'} até a prova escrita · Recife, 14/11</p></div></header>
 ${!state.status.ai?'<div class="notice">A integração de IA ainda precisa ser configurada.</div>':''}${nextPanel}
 <section class="journey" data-journey-slot="summary" aria-labelledby="journey-title">${journeySummaryHTML()}</section>
 <div class="section-head"><h2>Seu próximo treino</h2><button data-go="practice">Escolher atividade →</button></div>${pending.length?`<details class="available-tasks"><summary>Ver ${pending.length} atividades disponíveis</summary><div class="grid">${pending.slice(0,6).map(taskCard).join('')}</div></details>`:'<div class="empty">Sua fila está livre. Escolha uma habilidade para criar o próximo treino.</div>'}
 ${reviews.length?`<div class="section-head"><h2>Voltar para aprender</h2><span class="sub">${reviews.length} revisões disponíveis</span></div>${reviews.slice(0,4).map(a=>`<div class="history-row"><div><strong>${esc(a.title)}</strong><p class="sub">${labels[a.kind]} · revise o erro, depois faça uma nova tentativa</p></div><button class="secondary" data-feedback="${a.id}">Revisar</button></div>`).join('')}`:''}
 <div class="section-head"><h2>Seu ritmo da semana</h2></div><div class="card"><h3>${state.profile==='luiz'?'4 blocos de 60 minutos':'5–6 blocos de 60 minutos'} + 10–15 min por dia</h3><p>Alterne compreensão, escrita e fala. Reserve os blocos para desenvolver respostas completas e os intervalos para corrigir um erro por vez.</p><small>Uma atividade reduzida treina uma habilidade. Não substitui o simulado oficial.</small></div>`;
}
function renderPractice(){main.innerHTML=`<div class="eyebrow">A prática que faz diferença</div><h1>O que vamos treinar?</h1><p class="sub">Exigência C1, com orientação adaptada ao seu contexto e às últimas correções.</p><p class="usage-note sub">${state.data.usage?.calls || 0} de ${state.data.usage?.limit || 40} chamadas de IA hoje, compartilhadas pelos dois perfis. Criar e revisar um treino usa pelo menos duas chamadas na produção e três em leitura/escuta.</p><div class="modes" role="group" aria-label="Tempo de estudo"><button data-mode="short" aria-pressed="${state.mode==='short'}">Tenho 10–15 minutos</button><button data-mode="block" aria-pressed="${state.mode==='block'}">Tenho um bloco de estudo</button></div><div class="grid">${Object.entries(labels).map(([kind,name])=>`<article class="card task-card"><span class="tag ${kind==='writing'?'purple':kind==='speaking'?'peach':''}">${name}</span><h3>${desc[kind]}</h3><p>${kind==='speaking'?'Grave sua resposta ou envie um áudio. Confira a transcrição e receba uma pergunta para continuar.':kind==='listening'?'Questões com áudio sintético em espanhol, identificado como voz de IA.':kind==='writing'?'Produza primeiro. Revise os pontos prioritários. Depois faça uma nova tentativa.':'Interpretação com evidências do texto e explicação das alternativas.'}</p><label class="sub variant-label" for="variant-${kind}">Foco do treino</label><select id="variant-${kind}" class="variant-select" data-variant="${kind}">${variants[kind].map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select><button class="primary" data-generate="${kind}" ${!state.status.ai?'disabled':''}>Criar meu treino →</button></article>`).join('')}</div><div class="section-head"><h2>Atividades disponíveis</h2></div>${state.data.tasks.length?`<div class="grid">${state.data.tasks.slice(0,24).map(taskCard).join('')}</div>`:'<div class="empty">Suas tarefas aparecerão aqui.</div>'}`;}
function renderProgress(){
 const attempts=state.data.attempts, kinds=new Set(attempts.map(a=>a.kind));
 main.innerHTML=`<div class="eyebrow">Evidências, não promessas</div><h1>Seu caminho até o C1.</h1><p class="sub">Acompanhe suas tentativas e o que precisa praticar novamente.</p><div class="grid"><div class="card"><span class="sub">Respostas registradas</span><div class="metric">${state.data.stats?.attempts ?? attempts.length}</div></div><div class="card"><span class="sub">Habilidades praticadas</span><div class="metric">${state.data.stats?.skills ?? kinds.size} de 4</div></div></div><div class="section-head"><h2>Prontidão para o C1</h2></div><div class="notice readiness">Leitura + escrita e escuta + oral formam dois grupos independentes: o exame exige 30/50 em cada um. Microtreinos e notas de IA não medem sua aprovação. Use provas inéditas completas e correção calibrada para avaliar prontidão.</div><div class="section-head"><h2>Marcos de prática a dois</h2></div><p class="sub milestones-intro">Reconhecem respostas enviadas, reescritas e diálogos continuados. Não indicam nível nem prontidão para a prova.</p><div data-journey-slot="detail">${journeyDetailHTML()}</div><div class="section-head"><h2>${state.data.stats?.attempts>attempts.length?"Suas últimas 100 tentativas":"Suas tentativas"}</h2><button data-export>Exportar histórico</button></div>${attempts.length?attempts.map(a=>`<div class="history-row"><div><strong>${esc(a.title)}</strong><p class="sub">${labels[a.kind]} · ${dayLabel(a.created_at)} · ${Math.floor(a.seconds/60)} min${a.feedback?.timingSource==='self_reported'?' informados':' estimados'} · ${a.feedback?(a.feedback.type==='objective'?a.feedback.correct+'/'+a.feedback.total+' acertos':'Feedback disponível'):'Correção pendente'}</p></div><button class="secondary" data-feedback="${a.id}">Abrir</button></div>`).join(''):'<div class="empty">Depois da primeira resposta, você verá seu histórico aqui.</div>'}`;
}
function renderSources(){main.innerHTML=`<div class="eyebrow">A prova como referência</div><h1>Estudar com direção.</h1><p class="sub">O tutor usa o formato e os critérios atualizados em 2024. Os exercícios gerados são materiais originais de treino.</p><div class="grid"><div class="card resource"><a href="https://examenes.cervantes.es/es/dele/preparar-prueba" target="_blank" rel="noopener noreferrer">Modelos, áudios e gabaritos oficiais ↗</a><p>Reserve um modelo inédito para avaliação. Faça sem ajuda, no tempo previsto, e treine a folha de respostas e a escrita à mão.</p></div><div class="card resource"><a href="https://examenes.cervantes.es/sites/default/files/Guia_examen_DELE_C1_2024_0.pdf" target="_blank" rel="noopener noreferrer">Guia oficial do DELE C1 ↗</a><p>Leitura: 90 min. Escuta: 50 min. Escrita: 80 min. Oral: 20 min + 20 min de preparo. Cumprimento e mediação fazem parte da avaliação.</p></div><div class="card resource"><a href="https://recife.cervantes.es/es/diplomas_espanol/precios_diplomas_espanol.htm" target="_blank" rel="noopener noreferrer">Sua prova em Recife ↗</a><p>Escrita em 14/11/2026. A data e o horário da oral são comunicados pelo centro. Confira a convocação recebida.</p></div><div class="card resource"><a href="https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/" target="_blank" rel="noopener noreferrer">Plano Curricular do Cervantes ↗</a><p>Conteúdos de referência para identificar lacunas de gramática, vocabulário e organização do discurso.</p></div></div><div class="section-head"><h2>Cidades da jornada</h2></div><p class="sub">San Sebastián é a cidade principal; Bilbao e Santiago de Compostela têm contexto semelhante. Para cada cidade, uma igreja e um hospital como referências culturais e profissionais, com links para páginas oficiais e sem vínculo com o app.</p><div data-journey-slot="cities">${citiesHTML()}</div><div class="banner"><div><h3>Uma correção humana ajuda a calibrar.</h3><p>Leve uma produção escrita e uma gravação ao professor. Compare a avaliação com o feedback do tutor. As estimativas de IA ainda não foram calibradas por um examinador.</p></div></div>`;}
// Jornada a dois: carrega à parte do painel principal; falha aqui nunca bloqueia o treino.
const CELEBRATION_LABELS={effort:'Vi o seu esforço nesta etapa. Sigo com você.',revision:'Voltar ao texto e ajustar é o trabalho que conta. Admiro isso.',together:'Mais um passo nosso rumo a novembro.'};
const CITY_FALLBACK=[
 {church:'Catedral del Buen Pastor',churchUrl:'https://catedralbuenpastor.org/catedral/conoce-el-templo/',id:'donostia',name:'San Sebastián / Donostia',place:'Paseo de La Concha',hospital:'Hospital Universitario Donostia',cityUrl:'https://donostia.eus/es/como-es-ciudad/parques-jardines/paseo-concha',hospitalUrl:'https://www.osakidetza.euskadi.eus/osi-donostialdea-hospital-universitario-presentacion/webosk00-donoscon/es/'},
 {church:'Catedral de Santiago de Bilbao',churchUrl:'https://catedralbilbao.com/la-catedral/',id:'bilbao',name:'Bilbao',place:'Bilbao en un día',hospital:'Hospital Universitario Basurto',cityUrl:'https://turismo.euskadi.eus/es/top-viajes/bilbao-en-un-dia/webtur00-exptop/es/',hospitalUrl:'https://www.osakidetza.euskadi.eus/osi-bilbao-basurto-hospital-universitario-presentacion/webosk00-bibascon/es/'},
 {church:'Catedral de Santiago de Compostela',churchUrl:'https://catedraldesantiago.es/visitas/',id:'santiago',name:'Santiago de Compostela',place:'Ciudad histórica',hospital:'Hospital Clínico Universitario de Santiago',cityUrl:'https://www.turismo.gal/que-visitar/cidades/santiago-de-compostela?langId=es_ES',hospitalUrl:'https://xxisantiago.sergas.es/Paxinas/web.aspx?idContido=183&idLista=3&idTax=-1&tipo=paxtab'}];
const safeUrl=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:'';}catch{return '';}};
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
let journeySeq=0;
function normalizeJourney(data){
 const list=x=>Array.isArray(x)?x:[];
 const members=list(data?.members).filter(m=>['luiz','alana'].includes(m?.id)).map(m=>({id:m.id,name:String(m.name || (m.id==='luiz'?'Luiz':'Alana')),nextAction:String(m.nextAction || ''),weekly:{practice:Number(m.weekly?.practice)||0,revision:Number(m.weekly?.revision)||0},milestones:list(m.milestones).filter(x=>x?.id).map(x=>({id:String(x.id),title:String(x.title || ''),description:String(x.description || ''),earnedAt:x.earnedAt || null,celebratedBy:list(x.celebratedBy),canCelebrate:!!x.canCelebrate}))}));
 members.sort((a,b)=>(b.id===state.profile)-(a.id===state.profile));
 return {week:{label:String(data?.week?.label || '')},members,shared:{title:String(data?.shared?.title || 'Objetivo da semana a dois'),description:String(data?.shared?.description || ''),complete:!!data?.shared?.complete,contributions:list(data?.shared?.contributions)},cities:list(data?.cities).filter(c=>c?.name),celebrations:list(data?.celebrations)};
}
async function loadJourney(){
 const seq=++journeySeq,profile=state.profile;
 if(!state.journey || state.journeyStatus==='error'){state.journeyStatus='loading';paintJourney();}
 try{const data=await api(`/api/journey?profile=${profile}`);if(seq!==journeySeq || profile!==state.profile)return;state.journey=normalizeJourney(data);state.journeyStatus='ready';}
 catch{if(seq!==journeySeq || profile!==state.profile)return;if(!state.journey)state.journeyStatus='error';}
 paintJourney();
}
function journeyName(id){return state.journey?.members.find(m=>m.id===id)?.name || (id==='luiz'?'Luiz':'Alana');}
function celebrationText(c){return c?.message || CELEBRATION_LABELS[c?.messageId] || '';}
function journeyFallbackHTML(title){
 if(state.journeyStatus==='error')return `${title}<p class="sub journey-error">Não foi possível carregar a jornada agora. O treino continua disponível normalmente.</p><button class="secondary" data-journey-retry>Tentar novamente</button>`;
 return `${title}<div class="journey-skeleton" aria-hidden="true"><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton short"></span></div><p class="visually-hidden">Carregando a jornada.</p>`;
}
function journeySummaryHTML(){
 const head=`<div class="journey-head"><h2 id="journey-title">Jornada a dois</h2>${state.journey?.week.label?`<span class="sub">${esc(state.journey.week.label)}</span>`:''}</div>`;
 if(state.journeyStatus!=='ready' || !state.journey)return journeyFallbackHTML(head);
 const j=state.journey,me=j.members.find(m=>m.id===state.profile),done=new Map(j.shared.contributions.map(c=>[c.profile,!!c.done]));
 const since=Date.now()-7*86400000,received=j.celebrations.filter(c=>c.to===state.profile && Date.parse(c.createdAt)>=since).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
 const milestone=received && me?.milestones.find(m=>m.id===received.milestoneId);
 const city=(j.cities.length?j.cities:CITY_FALLBACK)[0];
 return `${head}<p class="journey-goal">${j.shared.complete?'Objetivo da semana concluído pelos dois.':'Nesta semana, cada um pratica duas tarefas e volta a uma correção.'}</p><p class="sub">${j.members.map(m=>`${esc(m.name)}: ${done.get(m.id)?'parte feita':'em andamento'}`).join(' · ')}</p>${received?`<p class="celebration-note">${esc(journeyName(received.from))}: “${esc(celebrationText(received))}”</p>`:''}<div class="journey-foot"><button class="link-btn" data-go="sources">San Sebastián · igrejas e cidades</button><button class="link-btn" data-go="progress">Ver nossos marcos →</button></div>`;
}
function milestoneHTML(member,m){
 const own=member.id===state.profile,earned=!!m.earnedAt,mine=own?state.journey.celebrations.filter(c=>c.to===member.id && c.milestoneId===m.id):[];
 const celebrated=!own && m.celebratedBy.includes(state.profile),key=`${member.id}:${m.id}`;
 return `<li class="milestone" data-earned="${earned}" data-milestone-row="${esc(key)}" tabindex="-1"><div class="milestone-head"><strong>${esc(m.title)}</strong><span class="milestone-state">${earned?`Registrado em ${dayLabel(m.earnedAt)}`:'Ainda não'}</span></div>${m.description?`<p class="sub">${esc(m.description)}</p>`:''}
 ${mine.map(c=>`<p class="celebration-note">${esc(journeyName(c.from))}: “${esc(celebrationText(c))}”</p>`).join('')}
 ${celebrated?'<p class="sub celebrated">Você já reconheceu este marco.</p>':!own && earned && m.canCelebrate?`<details class="celebrate"><summary>Reconhecer este marco</summary><div class="celebrate-options" role="group" aria-label="Escolha uma mensagem para ${esc(member.name)}">${Object.entries(CELEBRATION_LABELS).map(([id,text])=>`<button class="secondary" data-celebrate data-target="${esc(member.id)}" data-milestone="${esc(m.id)}" data-message="${id}">${esc(text)}</button>`).join('')}</div></details>`:''}</li>`;
}
function journeyDetailHTML(){
 if(state.journeyStatus!=='ready' || !state.journey)return `<div class="journey">${journeyFallbackHTML('')}</div>`;
 const j=state.journey;if(!j.members.length)return '<div class="empty">Os marcos aparecem depois das primeiras respostas enviadas.</div>';
 return `<p class="shared-goal"><strong>${esc(j.shared.title)}${j.week.label?` (${esc(j.week.label.toLowerCase())})`:''}.</strong> ${esc(j.shared.description)} ${j.shared.complete?'Concluído pelos dois.':''}</p>`+j.members.map(m=>{const earned=m.milestones.filter(x=>x.earnedAt).length;return `<section class="partner" aria-labelledby="partner-${esc(m.id)}"><div class="partner-head"><h3 id="partner-${esc(m.id)}">${m.id===state.profile?'Seus marcos':`Marcos de ${esc(m.name)}`}</h3><span class="sub">${m.id===state.profile?`${earned} de ${m.milestones.length} registrados`:'Cada conquista tem seu tempo'}</span></div><ul class="milestones">${m.milestones.map(x=>milestoneHTML(m,x)).join('')}</ul></section>`;}).join('');
}
function citiesHTML(){
 const cities=state.journey?.cities.length?state.journey.cities:CITY_FALLBACK;
 // Igreja e hospital rotulados em separado: o nome vem em espanhol, o link sempre diz de qual instituição é a página.
 const ref=(label,name,url,linkText)=>name?`<div class="city-ref"><dt>${label}</dt><dd><span class="city-ref-name" lang="es">${esc(name)}</span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${linkText} ↗</a>`:''}</dd></div>`:'';
 return `<div class="cities">${cities.map((c,i)=>{const city=safeUrl(c.cityUrl),refs=ref('Igreja',c.church,safeUrl(c.churchUrl),'Página oficial da igreja')+ref('Hospital',c.hospital,safeUrl(c.hospitalUrl),'Página oficial do hospital');return `<article class="card city" data-main="${i===0}">${i===0?'<div class="journey-scene" aria-hidden="true"></div>':''}<h3 lang="es">${esc(c.name)}</h3>${c.place?`<p class="sub" lang="es">${esc(c.place)}</p>`:''}${city?`<a href="${esc(city)}" target="_blank" rel="noopener noreferrer">Página oficial da cidade ↗</a>`:''}${refs?`<dl class="city-refs">${refs}</dl>`:''}</article>`;}).join('')}</div>`;
}
function paintJourney(){
 const focused=document.activeElement?.closest?.('[data-milestone-row]')?.dataset.milestoneRow;
 main.querySelectorAll('[data-journey-slot]').forEach(slot=>{
  try{const kind=slot.dataset.journeySlot;slot.innerHTML=kind==='summary'?journeySummaryHTML():kind==='detail'?journeyDetailHTML():citiesHTML();}
  catch{state.journeyStatus='error';state.journey=null;slot.innerHTML=slot.dataset.journeySlot==='cities'?'':journeyFallbackHTML(slot.dataset.journeySlot==='summary'?'<div class="journey-head"><h2 id="journey-title">Jornada a dois</h2></div>':'');}
  bindJourney(slot);holdIfBusy(slot);
 });
 if(focused)main.querySelector(`[data-milestone-row="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
}
function bindJourney(root){
 root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
 root.querySelectorAll('[data-journey-retry]').forEach(b=>b.onclick=()=>{state.journeyStatus='loading';loadJourney();});
 root.querySelectorAll('[data-celebrate]').forEach(b=>b.onclick=()=>celebrate(b));
}
// O estado só muda depois que a API confirma; repetir é seguro porque o servidor é idempotente.
async function celebrate(button){
 const {target,milestone,message}=button.dataset,profile=state.profile;
 await busy(button,async()=>{
  const result=await api('/api/journey/celebrate',{method:'POST',body:JSON.stringify({profile,target,milestoneId:milestone,messageId:message})});
  if(profile!==state.profile || !state.journey)return;
  const c=result?.celebration || {from:profile,to:target,milestoneId:milestone,messageId:message,createdAt:new Date().toISOString()};
  const m=state.journey.members.find(x=>x.id===target)?.milestones.find(x=>x.id===milestone);
  if(m){if(!m.celebratedBy.includes(profile))m.celebratedBy.push(profile);m.canCelebrate=false;}
  if(!state.journey.celebrations.some(x=>(c.id && x.id===c.id) || (x.from===c.from && x.to===c.to && x.milestoneId===c.milestoneId)))state.journey.celebrations.push(c);
  paintJourney();main.querySelector(`[data-milestone-row="${CSS.escape(`${target}:${milestone}`)}"]`)?.focus();
  toast(result?.created===false?'Este marco já tinha sido reconhecido.':`Reconhecimento enviado para ${journeyName(target)}.`);
  loadJourney();
 });
}
function go(page){if(pendingOperations){toast('Aguarde a operação em andamento terminar.');return;}if(state.recording){toast('Pare a gravação antes de sair.');return;}saveDraft();state.page=page;render();}
async function generate(kind,diagnostic=false,button){await busy(button,async()=>{
 toast('Criando e revisando seu treino C1…');
 const task=await api('/api/tasks',{method:'POST',body:JSON.stringify({profile:state.profile,kind,mode:diagnostic?'block':state.mode,diagnostic,variant:diagnostic?'auto':main.querySelector(`[data-variant="${kind}"]`)?.value || 'auto'})});
 await reloadData();openTask(task.id);
});}
function bindMain(){
 main.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
 main.querySelectorAll('[data-journey-slot]').forEach(bindJourney);
 main.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openTask(b.dataset.open));
 main.querySelectorAll('[data-generate]').forEach(b=>b.onclick=()=>generate(b.dataset.generate,false,b));
 main.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;store.set('habla-mode',state.mode);render();});
 main.querySelectorAll('[data-feedback]').forEach(b=>b.onclick=()=>showAttempt(b.dataset.feedback));
 const diagnostic=main.querySelector('[data-diagnostic]');if(diagnostic)diagnostic.onclick=()=>{
  const completed=new Set(state.data.attempts.filter(a=>a.diagnostic).map(a=>a.kind));const kind=Object.keys(labels).find(k=>!completed.has(k));
  if(!kind){state.page='progress';render();return;}
  const existing=state.data.tasks.find(t=>t.diagnostic && t.kind===kind && !t.attempts_count && (t.payload.trainingVersion==='c1-v2' || hasDraft(t.id)));
  if(existing)openTask(existing.id);else generate(kind,true,diagnostic);
 };
 const exporting=main.querySelector('[data-export]');if(exporting)exporting.onclick=()=>busy(exporting,async()=>{const data=await api('/api/export');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='habla-historico.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 holdIfBusy(main);
}
function loadDraft(){try{return JSON.parse(store.get(draftKey())) || {};}catch{return {};}}
function saveDraft(){if(!state.task)return;const previous=loadDraft(), textarea=main.querySelector('textarea');const answers=(state.task.payload.questions || []).map((_,i)=>{const input=main.querySelector(`input[name="q${i}"]:checked`);return input?Number(input.value):null;});store.set(draftKey(),JSON.stringify({...previous,answer:textarea?.value || '',answers,audioId:state.audioId,started:state.started,clockMs:state.clock?.milliseconds || 0}));}
function openTask(id){
 pauseStudy();
 const task=state.data.tasks.find(t=>t.id===id);if(!task){toast('Tarefa indisponível. Recarregue a página.');return;}
 state.task=task;const p=task.payload,draft=loadDraft();state.audioId=draft.audioId || null;state.started=Date.now();state.clock=new StudyClock(draft.clockMs || 0);if(!document.hidden)state.clock.resume();
 const objective=['reading','listening'].includes(task.kind),audioSource=task.kind==='listening' || p.sourceMode==='audio';
 main.innerHTML=`<div class="task-view"><button class="back" data-back>← Voltar para meus treinos</button><div class="task-meta"><span class="tag">${labels[task.kind]}${task.diagnostic?' · Triagem inicial':''}</span><span class="sub">${p.minutes} min sugeridos</span><div class="study-timer"><span class="timer" id="timer" aria-label="Tempo ativo estimado">00:00</span><button class="secondary timer-toggle" type="button" data-clock>Pausar</button></div></div><h1 class="task-title">${esc(task.title)}</h1><p class="sub">${esc(p.focus)}</p><div class="notice">${p.trainingVersion==='c1-v2'?'Treino C1 com revisão automática.':'Atividade anterior à revisão de dificuldade.'} Material original, não é prova oficial nem simulado completo.</div><p class="sub clock-note" id="clock-note">Tempo ativo estimado. Pausa ao sair da tela ou após 3 minutos sem interação.</p><div class="card instruction" lang="es">${esc(p.instruction)}</div>
 ${audioSource?'<div class="actions"><button class="primary" data-listen>Preparar áudio →</button></div><div id="listening-player"></div><p class="sub">Voz gerada por IA. Leia a tarefa antes de ouvir. Na prova oficial, os áudios são ouvidos duas vezes. O texto não é mostrado antes da resposta.</p>':p.source?`<div id="task-source" class="card source" lang="es" style="margin-top:18px">${esc(p.source)}</div>`:''}
 ${objective?`<form id="answer-form">${task.kind==='reading'?'<a class="source-link" href="#task-source">Voltar ao texto ↑</a>':''}${p.questions.map((q,i)=>`<fieldset class="question" style="border-left:0;border-right:0;border-bottom:0;margin:0"><legend lang="es">${i+1}. ${esc(q.prompt)}</legend>${q.choices.map((c,n)=>`<label class="choice" lang="es"><input type="radio" name="q${i}" value="${n}" ${draft.answers?.[i]===n?'checked':''}><span>${esc(c)}</span></label>`).join('')}</fieldset>`).join('')}<button class="primary full" type="submit">Enviar e entender minhas respostas →</button></form>`:`<div class="section-head"><h2>Sua resposta</h2></div>${task.kind==='speaking'?'<div class="actions"><button class="secondary" data-record>● Gravar resposta</button><button type="button" class="secondary" data-pick-audio>Enviar áudio</button><input type="file" id="audio-file" accept="audio/*" hidden></div><div id="recorded-player"></div><p class="sub" id="recording-note">Até 5 minutos. Gravação salva antes da transcrição. Confira o texto antes de enviar.</p>':''}<form id="answer-form"><label for="answer" class="sub">${task.kind==='speaking'?'Transcrição da sua fala ou resposta digitada':'Escreva em espanhol'}</label><textarea id="answer" name="answer" lang="es" placeholder="Empieza por la idea principal…">${esc(draft.answer || '')}</textarea><div class="answer-info"><span id="word-count">${wordCount(draft.answer || '')} palavras</span><span>${p.minWords?`${p.minWords}–${p.maxWords} sugeridas · `:''}${draftNote()}</span></div><button type="submit" class="primary full">Salvar e receber feedback →</button></form>`}<div id="task-feedback" aria-live="polite"></div></div>`;
 if(draft.followUp && task.kind==='speaking'){const question=document.createElement('div');question.className='banner follow-up';const label=document.createElement('h3');label.textContent='Pergunta do tutor';const text=document.createElement('p');text.lang='es';text.textContent=draft.followUp;question.append(label,text);main.querySelector('.section-head').before(question);}if(draft.rewriteIssues?.length){const guide=document.createElement('div');guide.className='banner rewrite-guide';guide.innerHTML='<div><h3>Ajustes para esta tentativa</h3>'+draft.rewriteIssues.map(x=>`<p>${esc(x)}</p>`).join('')+'</div>';main.querySelector('textarea')?.before(guide);}
 main.querySelector('[data-clock]').onclick=()=>{if(state.clock.running)state.clock.pause();else state.clock.resume();saveDraft();updateTimer();};
 main.querySelector('[data-back]').onclick=()=>{if(state.recording){toast('Pare a gravação antes de sair.');return;}saveDraft();render();};
 main.querySelectorAll('input[type=radio]').forEach(i=>i.onchange=saveDraft);
 const answer=main.querySelector('textarea');if(answer)answer.oninput=()=>{main.querySelector('#word-count').textContent=wordCount(answer.value)+' palavras';saveDraft();};
 main.querySelector('#answer-form').onsubmit=event=>{event.preventDefault();const button=event.currentTarget.querySelector('button[type=submit]');submit(button);};
 const listening=main.querySelector('[data-listen]');if(listening)listening.onclick=()=>busy(listening,async()=>{let objectUrl=speechUrls.get(id);if(!objectUrl){const response=await fetch(`/api/tasks/${id}/speech`,{method:'POST'});if(!response.ok)throw new Error((await response.json().catch(()=>({}))).message || 'Não foi possível concluir. Tente novamente.');objectUrl=URL.createObjectURL(await response.blob());speechUrls.set(id,objectUrl);}main.querySelector('#listening-player').innerHTML=`<audio controls src="${objectUrl}"></audio>`;listening.hidden=true;const player=main.querySelector('#listening-player audio');player.addEventListener('timeupdate',()=>{if(!player.paused && !document.hidden)state.clock?.activity();});});
 const recording=main.querySelector('[data-record]');if(recording)recording.onclick=()=>record(recording);
 const file=main.querySelector('#audio-file'),pickAudio=main.querySelector('[data-pick-audio]');
 if(file && pickAudio){pickAudio.onclick=()=>{if(state.recording){toast('Pare a gravação antes de enviar outro áudio.');return;}if(pendingOperations)return;file.value='';file.click();};file.onchange=()=>{const chosen=file.files[0];if(chosen)busy(pickAudio,()=>upload(chosen));};}
 if(state.audioId && task.kind==='speaking')showRecording();
 saveDraft();updateTimer();main.focus();
}
function wordCount(text){return text.trim().split(/\s+/u).filter(Boolean).length;}
function pauseStudy(reason='paused'){if(state.clock){state.clock.pause(reason);saveDraft();}}
function updateTimer(){const el=document.getElementById('timer');if(el && state.clock){const seconds=state.clock.seconds();main.querySelector('.study-timer')?.setAttribute('data-state',state.clock.running?'running':'paused');el.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;el.setAttribute('aria-label',`Tempo ativo estimado: ${el.textContent}`);const toggle=main.querySelector('[data-clock]');if(toggle)toggle.textContent=state.clock.running?'Pausar':'Retomar';const note=main.querySelector('#clock-note');if(note)note.textContent=state.clock.running?'Tempo ativo estimado. Pausa ao sair da tela ou após 3 minutos sem interação.':state.clock.reason==='idle'?'Pausado por inatividade. Toque em Retomar para continuar.':'Cronômetro pausado. Toque em Retomar para continuar.';}}
setInterval(()=>{updateTimer();if(state.task && state.clock)saveDraft();},1000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseStudy('hidden');updateTimer();});
main.addEventListener('input',()=>state.clock?.activity());
main.addEventListener('pointerdown',()=>state.clock?.activity());
main.addEventListener('keydown',()=>state.clock?.activity());
main.addEventListener('scroll',()=>state.clock?.activity(),{capture:true,passive:true});
async function submit(button){await busy(button,async()=>{
 if(state.recording)throw new Error('Pare a gravação antes de enviar.');saveDraft();const draft=loadDraft();if(['reading','listening'].includes(state.task.kind) && (draft.answers.length!==state.task.payload.questions.length || draft.answers.some(n=>!Number.isInteger(n))))throw new Error('Responda todas as questões antes de enviar.');if(['writing','speaking'].includes(state.task.kind) && (draft.answer || '').trim().length<10)throw new Error('Escreva sua resposta ou grave e transcreva antes de enviar.');
 if(!draft.attemptId){draft.attemptId=uid();store.set(draftKey(),JSON.stringify(draft));}
 state.clock?.pause('submitted');
 const result=await api('/api/attempts',{method:'POST',body:JSON.stringify({id:draft.attemptId,taskId:state.task.id,profile:state.profile,answer:draft.answer,answers:draft.answers,audioId:state.audioId,parentAttemptId:draft.parentAttemptId || null,seconds:state.clock?.seconds() || 0,timingSource:'active_estimate'})});
 state.clock?.pause('submitted');state.clock=new StudyClock();state.clock.reason='submitted';draft.attemptId=null;draft.started=Date.now();draft.clockMs=0;draft.followUp=null;draft.parentAttemptId=null;draft.rewriteIssues=null;store.set(draftKey(),JSON.stringify(draft));
 const el=main.querySelector('#task-feedback');showFeedbackResult(el,result,result.id);try{await reloadData();}catch{toast('Resposta salva. Não foi possível atualizar o painel agora.');}loadJourney();el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});toast('Resposta salva no seu histórico.');
});}
function startLinkedAttempt(attempt,taskId){
 const next=revisionDraft(attempt);if(!next)return false;
 if(!state.data.tasks.some(t=>t.id===taskId)){toast('Esta tarefa não está disponível para uma nova tentativa.');return false;}
 pauseStudy();state.clock=null;store.set(`habla-draft:${state.profile}:${taskId}`,JSON.stringify(next));openTask(taskId);
 main.querySelector('textarea')?.focus();toast(attempt.kind==='writing'?'Reescreva com as prioridades da correção.':'Responda à nova pergunta. Sua fala anterior continua no histórico.');return true;
}
function continueConversation(parentId,question){startLinkedAttempt({id:parentId,kind:'speaking',feedback:{followUp:question}},state.task.id);}
function feedbackHTML(f){
 if(f.type==='objective')return `<div class="feedback"><h2>${f.correct} de ${f.total} respostas corretas</h2><p>${esc(f.summary)}</p>${f.questions.map((q,i)=>`<div class="priority"><strong class="${q.correct?'result-correct':'result-wrong'}">${i+1}. ${q.correct?'Acertou':'Vamos revisar'}</strong><p lang="es">${esc(q.prompt)}</p><p class="sub">Sua resposta: ${esc(q.choices[q.selected])}<br>Gabarito: ${esc(q.choices[q.correctIndex])}</p><blockquote lang="es">${esc(q.evidence)}</blockquote><p>${esc(q.explanation)}</p></div>`).join('')}</div>`;
 return `<div class="feedback"><h2>Uma resposta melhor, passo a passo.</h2><p>${esc(f.summary)}</p>${f.strengths.length?`<h3>O que funcionou</h3>${f.strengths.map(s=>`<p>${esc(s)}</p>`).join('')}`:''}<h3>Seu próximo ajuste</h3>${f.priorities.map(p=>`<div class="priority"><strong>${esc(p.issue)}</strong>${p.quote?`<blockquote lang="es">${esc(p.quote)}</blockquote>`:''}<p>${esc(p.explanation)}</p><p lang="es">${esc(p.improved)}</p></div>`).join('')}<h3>Tente de novo</h3><p>${esc(f.nextAttempt)}</p>${f.followUp?`<h3 lang="es">Seguimos hablando…</h3><p lang="es">${esc(f.followUp)}</p>`:''}<details><summary>Ver critérios de treino</summary>${f.criteria.map(c=>`<div class="criteria"><strong>${esc(c.name)}${c.band===null?' · não avaliado':` · banda estimada ${c.band}/3`}</strong><p>${esc(c.evidence)}</p></div>`).join('')}</details><details><summary>Já revisei minha resposta. Ver exemplo.</summary><p lang="es" style="white-space:pre-wrap">${esc(f.modelAnswer)}</p></details><p class="notice">${esc(f.limitation)}</p></div>`;
}
function pendingFeedbackHTML(attemptId,message){return `<div class="feedback"><h3>Sua resposta está salva.</h3><p>${esc(message || 'Correção pendente.')}</p><button class="primary" data-retry="${esc(attemptId)}">Tentar correção novamente</button></div>`;}
// Mesmo caminho no primeiro envio e em cada nova tentativa de correção: feedback ou aviso de pendência, retry religado e ações seguintes.
function showFeedbackResult(root,result,attemptId){
 root.innerHTML=result?.feedback?feedbackHTML(result.feedback):pendingFeedbackHTML(attemptId,result?.message);
 if(result?.feedback && state.task?.kind==='writing' && root.id==='task-feedback')store.set(draftKey(),JSON.stringify(linkWritingRevision(loadDraft(),{id:attemptId,kind:'writing',feedback:result.feedback})));
 bindFeedback(root);if(result?.feedback)appendFeedbackActions(root,attemptId,result.feedback);holdIfBusy(root);
}
function appendFeedbackActions(root,attemptId,feedback){
 if(!state.task || root.id!=='task-feedback')return;
 if(feedback.followUp && state.task.kind==='speaking'){const continuation=document.createElement('button');continuation.className='primary';continuation.textContent='Responder à pergunta do tutor →';continuation.onclick=()=>continueConversation(attemptId,feedback.followUp);root.append(continuation);}
 if(state.task.kind==='writing'){const rewrite=document.createElement('button');rewrite.className='primary';rewrite.textContent='Reescrever com estes ajustes ↑';rewrite.onclick=()=>startLinkedAttempt({id:attemptId,kind:'writing',answer:state.data.attempts.find(a=>a.id===attemptId)?.answer || loadDraft().answer,feedback},state.task.id);root.append(rewrite);}
}
function bindFeedback(root){root.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>busy(b,async()=>{const id=b.dataset.retry,result=await api(`/api/attempts/${id}/review`,{method:'POST'});if(root.isConnected){showFeedbackResult(root,result,id);root.setAttribute('tabindex','-1');root.focus({preventScroll:true});if(!result?.feedback)toast(result?.message || 'Correção ainda pendente. Sua resposta continua salva.');}try{await reloadData();if(root.id==='history-feedback' && root.isConnected)showAttempt(id);}catch{toast('Correção recebida. Não foi possível atualizar o histórico agora.');}loadJourney();}));}
function showAttempt(id){const a=state.data.attempts.find(a=>a.id===id);if(!a)return;pauseStudy();state.task=null;state.started=0;state.clock=null;let answer=a.answer;try{if(['reading','listening'].includes(a.kind))answer=JSON.parse(answer).map(n=>['A','B','C'][n]).join(', ');}catch{}
 main.innerHTML=`<div class="task-view"><button class="back" data-back>← Voltar</button><span class="tag">${labels[a.kind]} · ${dayLabel(a.created_at)}</span><h1 class="task-title">${esc(a.title)}</h1><details><summary>Minha resposta original</summary><div class="card source" lang="es">${esc(answer)}</div>${a.audio_key?`<audio controls src="/api/audio/${a.audio_key}"></audio><a class="sub" href="/api/audio/${a.audio_key}" download>Baixar gravação</a>`:''}</details><div id="history-feedback">${a.feedback?feedbackHTML(a.feedback):`<div class="feedback"><p>Sua resposta foi preservada e aguarda correção.</p><button class="primary" data-retry="${a.id}">Corrigir agora</button></div>`}</div><div class="actions"><button class="primary" data-again>${a.kind==='writing' && a.feedback?'Reescrever com estes ajustes':a.kind==='speaking' && a.feedback?.followUp?'Responder à pergunta do tutor':'Fazer nova tentativa'}</button>${a.review_at?'<button class="secondary" data-revisited>Marcar revisão como feita</button>':''}</div></div>`;
 main.querySelector('[data-back]').onclick=render;main.querySelector('[data-again]').onclick=()=>{if(hasDraft(a.task_id) && !confirm('Começar uma tentativa nova e limpar o rascunho deste aparelho? Sua resposta enviada continua no histórico.'))return;if(revisionDraft(a)){startLinkedAttempt(a,a.task_id);return;}store.remove(`habla-draft:${state.profile}:${a.task_id}`);openTask(a.task_id);};const revisited=main.querySelector('[data-revisited]');if(revisited)revisited.onclick=()=>busy(revisited,async()=>{await api(`/api/attempts/${a.id}/revisited`,{method:'POST'});await reloadData();loadJourney();toast('Revisão registrada.');render();});bindFeedback(main.querySelector('#history-feedback'));holdIfBusy(main);main.focus();
}
async function record(button){
 if(state.recording){state.recorder.stop();return;}
 await busy(button,async()=>{
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)throw new Error('Este navegador não permite gravar. Use Enviar áudio.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=['audio/webm;codecs=opus','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));
  let recorder;try{recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:24000});}catch(error){stream.getTracks().forEach(t=>t.stop());throw error;}
  const chunks=[];state.recorder=recorder;state.recording=true;button.textContent='■ Parar gravação';button.classList.add('recording');main.querySelector('#recording-note').textContent='Gravando… Desenvolva sua ideia e depois pare a gravação.';
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const recordingStarted=Date.now();const recordingTick=setInterval(()=>{const seconds=Math.floor((Date.now()-recordingStarted)/1000);const note=main.querySelector('#recording-note');if(note)note.textContent=`Gravando · ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} de 05:00`;if(!document.hidden)state.clock?.activity();},1000);
  const limit=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},300000);
  recorder.onstop=async()=>{clearTimeout(limit);clearInterval(recordingTick);stream.getTracks().forEach(t=>t.stop());state.recording=false;button.textContent='● Gravar outra resposta';button.classList.remove('recording');const blob=new Blob(chunks,{type:recorder.mimeType});await busy(button,()=>upload(blob));};
  recorder.start();
 });
}
async function upload(blob){
 if(state.recording)throw new Error('Pare a gravação antes de enviar outro áudio.');
 const max=state.status.storage==='r2'?5_000_000:900_000;if(blob.size>max)throw new Error('Áudio grande demais. Envie uma gravação comprimida de até '+(max/1_000_000)+' MB.');
 // Keep a local download available if the connection fails before upload.
 const localUrl=URL.createObjectURL(blob);const player=main.querySelector('#recorded-player');player.innerHTML=`<audio controls src="${localUrl}"></audio><a href="${localUrl}" download="minha-resposta.${blob.type.includes('webm')?'webm':blob.type.includes('mpeg')?'mp3':'m4a'}" class="sub">Baixar gravação neste aparelho</a>`;
 const response=await fetch(`/api/audio?profile=${state.profile}`,{method:'POST',headers:{'Content-Type':blob.type || 'audio/mp4'},body:blob});if(!response.ok)throw new Error((await response.json().catch(()=>({}))).message || 'Não foi possível concluir. Tente novamente.');
 const data=await response.json();state.audioId=data.id;saveDraft();showRecording();toast('Gravação salva. Você pode transcrever agora.');
}
function showRecording(){const el=main.querySelector('#recorded-player');if(!el)return;el.innerHTML=`<audio controls src="/api/audio/${state.audioId}"></audio><div class="actions"><button class="secondary" data-transcribe>Transcrever gravação</button><a class="secondary" href="/api/audio/${state.audioId}" download>Baixar áudio</a></div>`;el.querySelector('[data-transcribe]').onclick=event=>busy(event.currentTarget,async()=>{const textarea=main.querySelector('textarea');if(textarea.value.trim() && !confirm('Substituir o texto atual pela transcrição? O áudio original está salvo.'))return;const result=await api(`/api/audio/${state.audioId}/transcribe`,{method:'POST'});textarea.value=result.text;textarea.dispatchEvent(new Event('input'));toast(result.notice);});}
function showAccess(){main.innerHTML='<div class="access"><div class="eyebrow">Seu espaço de estudo</div><h1>Hola, vocês dois.</h1><p class="sub">Abra o link compartilhado de acesso. Se recebeu um código, cole abaixo.</p><form id="access-form"><label class="sub" for="access-key">Código compartilhado</label><input type="password" id="access-key" autocomplete="off" required><button class="primary full">Entrar no tutor</button></form><p class="sub">Depois, basta escolher Luiz ou Alana.</p></div>';main.querySelector('form').onsubmit=e=>{e.preventDefault();busy(e.currentTarget.querySelector('button'),async()=>{await api('/api/access',{method:'POST',body:JSON.stringify({key:main.querySelector('input').value})});await boot();});};}
async function boot(){try{const key=new URLSearchParams(location.hash.slice(1)).get('access');if(key){history.replaceState(null,'',location.pathname);await api('/api/access',{method:'POST',body:JSON.stringify({key})});}state.status=await api('/api/status');if(!state.status.access){showAccess();return;}await reloadData();render();loadJourney();}catch(error){main.innerHTML=`<div class="access"><h1>Vamos retomar.</h1><p class="sub">${esc(error.message)}</p><button class="primary" id="reload">Tentar novamente</button></div>`;const retry=main.querySelector('#reload');retry.onclick=()=>busy(retry,boot);}}
// Troca de perfil: busca primeiro e só então troca. Se falhar, o perfil, o rascunho e a tela atuais continuam intactos.
document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{
 const next=b.dataset.profile;
 if(!state.status?.access){state.profile=next;store.set('habla-profile',next);syncChrome();return;}
 if(next===state.profile && state.data)return;
 busy(b,async()=>{if(state.recording)throw new Error('Pare a gravação antes de mudar de perfil.');
  const data=await api(`/api/dashboard?profile=${next}`);
  pauseStudy();state.task=null;state.clock=null;state.audioId=null;state.profile=next;state.data=data;store.set('habla-profile',next);
  journeySeq++;state.journey=null;state.journeyStatus='loading';render();loadJourney();
 });});
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{if(!state.status?.access || !state.data)return;go(b.dataset.page);});
// Teclado virtual: esconde a barra fixa e acompanha o visualViewport para não cobrir campo nem aviso.
const typingField='textarea,input:not([type=radio]):not([type=checkbox]):not([type=file]):not([type=button]):not([type=submit])';
function syncKeyboard(){const vv=window.visualViewport,typing=!!document.activeElement?.matches?.(typingField);const covered=vv?Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop)):0;document.body.classList.toggle('keyboard-open',typing);document.documentElement.style.setProperty('--kb',`${typing && covered>80?covered:0}px`);}
document.addEventListener('focusin',syncKeyboard);
document.addEventListener('focusout',()=>requestAnimationFrame(syncKeyboard));
window.visualViewport?.addEventListener('resize',()=>{syncKeyboard();const field=document.activeElement;if(field?.matches?.(typingField) && field.tagName!=='TEXTAREA')field.scrollIntoView({block:'nearest'});});
window.visualViewport?.addEventListener('scroll',syncKeyboard);
window.addEventListener('beforeunload',event=>{if(state.recording){event.preventDefault();event.returnValue='';}else pauseStudy('hidden');});
boot();
