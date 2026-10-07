// Rota pela Espanha: cinco cidades como ambientação dos marcos de prática que já existem.
// Função pura: recebe o membro da jornada e devolve HTML; sem DOM, rede, storage nem eventos.
// Cada etapa depende só do próprio marco: marco registrado fora da ordem aparece registrado.
// A rota não mede nível, não indica prontidão para o C1 e não é certificação.

const STOPS = Object.freeze([
 Object.freeze({city: 'Bilbao', short: 'BIO', milestone: 'first-step'}),
 Object.freeze({city: 'Madrid', short: 'MAD', milestone: 'two-skills'}),
 Object.freeze({city: 'Valencia', short: 'VLC', milestone: 'four-skills'}),
 Object.freeze({city: 'Barcelona', short: 'BCN', milestone: 'first-revision'}),
 Object.freeze({city: 'San Sebastián', short: 'DSS', milestone: 'first-dialogue'})
]);
export const JOURNEY_STOPS = STOPS;

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const slug = value => String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '') || 'perfil';
function earnedLabel(value) {
 const ms = Date.parse(value || '');
 if (!Number.isFinite(ms)) return 'Registrada';
 return `Registrada em ${new Date(ms).toLocaleDateString('pt-BR', {timeZone: 'America/Maceio', day: 'numeric', month: 'short'})}`;
}

// Associa cada cidade somente ao seu marco conhecido pelo id.
function stopsFor(member) {
 const list = (Array.isArray(member?.milestones) ? member.milestones : []).filter(m => m && m.id);
 const byId = new Map(list.map(m => [String(m.id), m]));
 return STOPS.map(stop => {
  const m = byId.get(stop.milestone) || null;
  return {...stop, title: String(m?.title || ''), description: String(m?.description || ''), earnedAt: m?.earnedAt || null, earned: !!m?.earnedAt};
 });
}

export function journeyMapHTML(member) {
 const id = slug(member?.id), name = String(member?.name || '');
 const stops = stopsFor(member);
 const earned = stops.filter(s => s.earned).length;
 const next = stops.find(s => !s.earned) || null;
 const titleId = `jm-${id}-title`;
 const stop = s => {
  const state = s.earned ? 'earned' : s === next ? 'next' : 'pending';
  const status = s.earned ? earnedLabel(s.earnedAt) : state === 'next' ? 'Próxima etapa' : 'Ainda não registrada';
  const detail = s.title ? (s.description ? `<details class="route-detail"><summary>${esc(s.title)}</summary><p>${esc(s.description)}</p></details>` : `<p class="route-title">${esc(s.title)}</p>`) : '';
  return `<li class="route-stop" data-state="${state}"${state === 'next' ? ' aria-current="step"' : ''}><span class="route-mark" aria-hidden="true">${esc(s.short)}</span><div class="route-body"><strong class="route-city" lang="es">${esc(s.city)}</strong><span class="route-status">${esc(status)}</span>${detail}</div></li>`;
 };
 const nextLine = next
  ? `<p class="route-next">Próxima prática: <strong>${esc(next.title || next.city)}</strong> · <span lang="es">${esc(next.city)}</span>.</p>`
  : '<p class="route-next">As cinco etapas estão registradas. A prática continua.</p>';
 return `<section class="journey-map" aria-labelledby="${titleId}"><div class="journey-map-head"><h3 id="${titleId}">Rota pela Espanha${name ? ` <span class="sub">de ${esc(name)}</span>` : ''}</h3><span class="sub">${earned} de ${STOPS.length} etapas registradas</span></div>
 <p class="sub journey-map-note">Cada cidade registra uma conquista de prática. As etapas podem ser cumpridas em qualquer ordem.</p>
 <ol class="journey-route">${stops.map(stop).join('')}</ol>${nextLine}</section>`;
}
