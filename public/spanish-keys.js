// Ajuda local de escrita: insere no cursor e aciona o salvamento já existente.
const chars=['¿','¡','ñ','á','é','í','ó','ú','ü'];
const bound=new WeakSet();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function spanishKeysHTML(id){return `<div class="spanish-keys" data-spanish-keys="${esc(id)}" role="group" aria-label="Caracteres do espanhol"><span class="sr-only">Inserir na posição do cursor</span>${chars.map(c=>`<button type="button" class="secondary" data-spanish-char="${c}" aria-label="Inserir ${c}">${c}</button>`).join('')}<button type="button" class="secondary key-case" data-spanish-case aria-label="Usar letras maiúsculas" aria-pressed="false">Aa</button></div><span class="spanish-key-status" data-spanish-key-status="${esc(id)}" role="status"></span>`;}
export function bindSpanishKeys(root){root.querySelectorAll('[data-spanish-keys]').forEach(bar=>{
 if(bound.has(bar))return;const field=root.querySelectorAll('textarea');const input=Array.from(field).find(e=>e.id===bar.dataset.spanishKeys);if(!input)return;bound.add(bar);
 let upper=false,selection=null;const status=Array.from(root.querySelectorAll('[data-spanish-key-status]')).find(e=>e.dataset.spanishKeyStatus===input.id);
 input.addEventListener('input',()=>{if(status)status.textContent='';});
 const remember=()=>selection=[input.selectionStart,input.selectionEnd];
 for(const event of ['select','input','keyup','pointerup','blur'])input.addEventListener(event,remember);
 bar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
 bar.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||button.disabled||input.disabled||input.readOnly)return;
  if(button.hasAttribute('data-spanish-case')){upper=!upper;button.setAttribute('aria-pressed',String(upper));button.setAttribute('aria-label',upper?'Usar letras minúsculas':'Usar letras maiúsculas');bar.querySelectorAll('[data-spanish-char]').forEach(b=>{const c=upper?b.dataset.spanishChar.toUpperCase():b.dataset.spanishChar;b.textContent=c;b.setAttribute('aria-label','Inserir '+c);});return;}
  if(!button.dataset.spanishChar)return;
  const char=upper?button.dataset.spanishChar.toUpperCase():button.dataset.spanishChar;
  const [start,end]=selection || [input.selectionStart,input.selectionEnd];
  if(input.maxLength>=0 && input.value.length-(end-start)+char.length>input.maxLength){if(status)status.textContent='Limite de caracteres do campo atingido.';return;}
  input.focus({preventScroll:true});input.setSelectionRange(start,end);
  // insertText mantém o desfazer nativo nos navegadores que o suportam.
  let inserted=false;try{inserted=input.ownerDocument.execCommand('insertText',false,char);}catch{}
  if(!inserted){input.setRangeText(char,start,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));}
  remember();
 });
 });}
