// Uma frase sobre a língua e uma prática objetiva para o painel da próxima tarefa.
// Função pura: sem rede, sem storage, sem relógio. O dia (America/Maceio) vem calculado pelo app.
// Não mede, não avalia e não elogia: motivação não é feedback. Curadoria e critérios em docs/MOTIVACAO.md.

const OBJECTIVE = ['reading', 'listening'];

const DRAFT = [
 {id: 'draft-existe', line: 'A primeira versão põe a ideia na mesa. A próxima verifica se ela se sustenta.', action: {writing:'Leia o que já fez e acrescente o próximo passo. A correção vem depois do envio.',speaking:'Confira o áudio ou a transcrição salva e desenvolva a próxima ideia.',objective:'Confira a questão em andamento e sua escolha antes de seguir.'}},
 {id: 'draft-frase', kinds: ['writing'], line: 'Um rascunho é uma frase que ainda não decidiu como termina.', action: 'Retome do último ponto, sem recomeçar do zero.'},
 {id: 'draft-pequeno', line: 'Clareza também se revisa: quem diz o quê, e por quê?', action: {writing:'Escolha um parágrafo para concluir agora.',speaking:'Escolha uma ideia para desenvolver na gravação.',objective:'Conclua a questão em andamento antes de passar à próxima.'}}
];

// A ação de revisão só pede para abrir a correção já existente; nada é revisado automaticamente.
const REVIEW = [
 {id: 'review-reescrever', kinds: ['writing'], line: 'Reescrever é ter uma ideia melhor sem esperar uma ideia nova.', action: {
  writing: 'Abra a correção, escolha um ponto prioritário e reescreva só a frase afetada.'}},
 {id: 'review-evidencia', kinds: ['reading', 'listening'], line: 'A evidência tem uma vantagem sobre o palpite: dá para conferir.', action: {reading:'Abra a correção e confira o trecho que sustenta a resposta.',listening:'Abra a correção, leia a evidência citada e anote a expressão decisiva.'}},
 {id: 'review-nome', line: 'Dar nome ao ajuste ajuda a reconhecê-lo na próxima resposta.', action: 'Abra a correção e dê um nome curto ao ponto principal. Procure-o na próxima resposta.'},
 {id: 'review-segunda', line: 'A segunda versão sabe coisas que a primeira só suspeitava.', action: {
  writing: 'Abra a correção e compare um trecho apontado com a sua versão antes de reescrever.',
  speaking: 'Abra a correção e anote uma expressão para usar na próxima gravação.',
  objective: 'Abra a correção e veja por que a alternativa escolhida parecia certa.'}}
];

const BY_KIND = {
 writing: [
  {id: 'writing-sin-embargo', line: 'O conector “sin embargo” é útil. Fazer a ressalva também.', action: 'Quando precisar contrastar ideias, explicite a ressalva que o conector anuncia.'},
  {id: 'writing-alternativa', line: 'Uma frase elegante ainda precisa dizer alguma coisa.', action: 'Troque uma palavra por outra mais precisa só se ela disser o que o parágrafo pede.'},
  {id: 'writing-proposito', line: '“Me dirijo a usted para…” faz mais que três linhas de cortesia.', action: 'Em carta formal, diga o propósito na primeira frase, sem rodeios.'},
  {id: 'writing-paragrafo', line: 'Um parágrafo com duas ideias costuma estar negociando a separação.', action: 'Dê a cada parágrafo uma frase-tema e confira se o resto a sustenta.'},
  {id: 'writing-mediacao', line: 'Mediar não é repetir a fonte. É escolher o que importa a quem vai ler.', action: 'Na mediação, selecione as ideias que servem ao destinatário indicado.'}
 ],
 speaking: [
  {id: 'speaking-objecao', line: 'Uma objeção é a parte em que a conversa fica interessante.', action: 'Reconheça o ponto antes de discordar: “Entiendo su punto de vista, pero…”.'},
  {id: 'speaking-a-ver', line: 'Em espanhol, “a ver…” compra alguns segundos sem pedir desculpas.', action: 'Tenha dois recursos para ganhar tempo, como “a ver” e “déjeme pensarlo”, e use-os na gravação.'},
  {id: 'speaking-o-sea', line: '“O sea” conserta uma frase sem precisar começar de novo.', action: 'Se a frase sair torta, reformule com “o sea” ou “mejor dicho” e siga em frente.'},
  {id: 'speaking-depende', line: 'Dizer “depende” é honesto. Dizer de quê é que convence.', action: 'Complete cada “depende” com a condição e um exemplo: “depende de…, por ejemplo…”.'},
  {id: 'speaking-resumo', line: 'Resumir é deixar coisas boas de fora, de propósito.', action: 'Antes de gravar, diga a ideia central em uma frase. Depois, só dois apoios.'}
 ],
 reading: [
  {id: 'reading-pero', line: 'Um “pero” pode mudar o rumo de um parágrafo. Vale seguir a curva.', action: 'Observe o que muda após “pero”, “no obstante” ou “sin embargo” e confira o sentido no contexto.'},
  {id: 'reading-quase', line: 'Uma alternativa quase certa é o jeito mais educado de estar errada.', action: 'Para cada resposta, aponte a frase do texto que a justifica.'},
  {id: 'reading-ironia', line: 'Autores raramente avisam “estoy siendo irónico”. Ainda bem.', action: 'Quando a questão pedir atitude, procure um trecho que mostre a posição do autor.'},
  {id: 'reading-vizinha', line: 'Uma palavra desconhecida costuma deixar pistas na frase vizinha.', action: 'Diante de uma palavra nova, leia a frase anterior e a seguinte antes de decidir.'}
 ],
 listening: [
  {id: 'listening-habria', line: '“Bueno, habría que verlo” pode ser uma discordância de terno.', action: 'Anote as expressões que suavizam ou recusam. Elas costumam carregar a resposta.'},
  {id: 'listening-ya-ya', line: '“Ya, ya” nem sempre quer dizer sim duas vezes.', action: 'Confira o contexto: o que a pessoa aceita, relativiza ou contesta?'},
  {id: 'listening-enunciado', line: 'Ouvir de novo funciona melhor quando você sabe o que procura.', action: 'Leia as perguntas antes de ouvir e sublinhe o que cada uma pede: dado, opinião ou intenção.'},
  {id: 'listening-todas', line: 'Ouvir a palavra de uma alternativa não resolve a questão. Seria confortável demais.', action: 'Ao ouvir a palavra de uma alternativa, espere a frase terminar antes de marcar.'}
 ]
};

const GENERAL = [
 {id: 'general-foco', line: 'Uma ideia ganha força quando consegue responder a uma objeção.', action: 'Escolha uma habilidade e um único foco para hoje: um conector, um registro ou uma objeção.'},
 {id: 'general-registro', line: 'O mesmo pedido muda de roupa entre “oye” e “le agradecería”.', action: 'Escolha uma atividade e decida o registro antes da primeira frase.'}
];

const PROFILE_OFFSET = {luiz: 0, alana: 1};

function dayNumber(dateISO) {
 const ms = /^\d{4}-\d{2}-\d{2}$/.test(String(dateISO)) ? Date.parse(`${dateISO}T00:00:00Z`) : NaN;
 return Number.isFinite(ms) ? Math.floor(ms / 86400000) : 0;
}

// Dias consecutivos percorrem o conjunto sem repetir; no mesmo dia, os dois perfis recebem frases diferentes.
function pick(pool, profile, dateISO) {
 const offset = (PROFILE_OFFSET[profile] ?? 0) * Math.max(1, Math.floor(pool.length / 2));
 const index = ((dayNumber(dateISO) + offset) % pool.length + pool.length) % pool.length;
 return pool[index];
}

function actionFor(entry, kind) {
 if (typeof entry.action === 'string') return entry.action;
 return entry.action[OBJECTIVE.includes(kind) ? 'objective' : kind] || 'Abra a correção e escolha um ponto para retomar na próxima resposta.';
}

export function motivationFor({profile = 'luiz', kind = null, dateISO = '', hasDraft = false, review = false} = {}) {
 const pool = hasDraft ? DRAFT.filter(e => !e.kinds || e.kinds.includes(kind)) : review ? REVIEW.filter(e => !e.kinds || e.kinds.includes(kind)) : BY_KIND[kind] || GENERAL;
 const entry = pick(pool, profile, dateISO);
 return {id: entry.id, line: entry.line, action: actionFor(entry, kind)};
}

export const MOTIVATION_POOLS = {draft: DRAFT, review: REVIEW, general: GENERAL, ...BY_KIND};
