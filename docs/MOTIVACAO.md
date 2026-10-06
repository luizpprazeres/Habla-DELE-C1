# Motivação e paisagem de La Concha no Meu dia

Objetivo: tornar San Sebastián/Donostia reconhecível logo na abertura do Meu dia e trocar a descrição genérica do painel da próxima tarefa por uma frase com calor, humor discreto e uma prática objetiva para o DELE C1. O design existente foi mantido: mesma paleta, mesmos componentes, mesmo CTA.

Arquivos: `public/donostia.svg` (novo), `public/motivation.js` (novo), `public/app.js` e `public/style.css` (integração). Sem dependência nova, sem chamada de rede, sem custo de API.

## Faixa de La Concha

- **Onde:** topo do Meu dia, numa faixa compacta junto da saudação (`header.today-head`). Não é hero. No celular, a paisagem fica acima da saudação; a partir de 760 px, fica à direita dela.
- **O que mostra:** vista do Paseo de La Concha olhando para o mar. Praia em arco, ilha de Santa Clara ao centro com o pequeno farol, monte Igueldo à esquerda com o torreão e o brilho do pôr do sol, monte Urgull à direita com a muralha do castelo e a Parte Vieja ao pé, um poste do passeio e a balaustrada estilizada em anéis. A ilha e a grade são os símbolos indicados pela prefeitura: <https://donostia.eus/es/como-es-ciudad/parques-jardines/paseo-concha>.
- **Originalidade:** desenho esquemático feito à mão, sem fotografia de referência copiada, sem traçado de terceiros e sem asset remoto. Não é desenho técnico nem promete fidelidade arquitetônica.
- **Buen Pastor:** fica fora de propósito. Nesta vista a catedral está atrás de quem olha; colocá-la no horizonte inventaria geografia. A torre em traço fino (`torre-gotica.svg`) continua em Referências.
- **Sem cruz ou símbolo religioso no Urgull:** a primeira versão tinha uma estátua minúscula que, em tamanho reduzido, lia como cruz. Foi trocada pela muralha do castelo.
- **Cores:** preto, laranja do app (`#ff7a1a`) e neutros. Sem animação.
- **Acessibilidade:** `<figure>` com `<img alt="Ilustração da baía de La Concha: …">` e `<figcaption>` visível “San Sebastián / Donostia — La Concha”. O SVG também traz `<title>` para uso isolado.
- **Tom:** a cidade é referência afetiva. A interface não sugere mudança, moradia, viagem futura nem recompensa após a aprovação.
- **Jornada:** o resumo da jornada no Meu dia deixou de repetir as colinas em CSS (`.journey-scene`), para não haver duas paisagens na mesma tela. A cena continua nos cartões de cidades em Referências.

### Orçamento vertical (390 × 844)

Topo com perfis em linha própria ≈ 129 px, espaçamento 20, paisagem ≈ 75 + rótulo ≈ 23, saudação ≈ 35 + linha do prazo ≈ 31 (uma linha, “N dias até a prova escrita · Recife, 14/11”). Painel: etiqueta, título de até três linhas, status de rascunho ou diagnóstico quando houver, motivação (duas linhas + duas linhas) e botão de 48 px. Estimativa do fim do botão: ≈ 676 px no pior caso com três linhas de título e rascunho. Para caber, saiu o eyebrow “Meu dia” da página (o rótulo continua na navegação) e o prazo virou uma linha mais curta. A revisão central confirmou o botão acessível em Chrome nas larguras 320, 390, 430 e 1280, nos cenários inspecionados.

## `motivationFor` (public/motivation.js)

```js
import {motivationFor} from './motivation.js';
motivationFor({profile: 'alana', kind: 'writing', dateISO: '2026-10-06', hasDraft: false, review: false});
// → {id: 'writing-…', line: '…', action: '…'}
```

- **Pura:** sem rede, storage, `Date.now()` ou aleatoriedade. O app calcula `dateISO` no fuso `America/Maceio` (`todayISO()` em `app.js`, também usado no contador de dias).
- **Prioridade:** rascunho → revisão → habilidade (`reading`, `listening`, `writing`, `speaking`) → conjunto geral (sem habilidade ou habilidade desconhecida).
- **Variação determinística:** índice = dia desde a época + deslocamento do perfil. Dias consecutivos percorrem o conjunto sem repetir; no mesmo dia Luiz e Alana recebem frases diferentes; re-renderizar não muda nada. Data inválida usa o dia 0.
- **Revisão:** a ação sempre começa por “Abra a correção”, que é exatamente o que o botão faz (`data-feedback`). Nada é revisado automaticamente. Frases de reescrita aparecem apenas na escrita. A fala recebe orientação de retomada de ideias; leitura e escuta podem receber orientação de evidência na correção disponível.
- **Rascunho:** o painel mantém a frase explícita “Seu rascunho está pronto para continuar.” e o botão “Continuar meu treino”. A motivação de rascunho vem depois, sem substituir essa informação.
- **Diagnóstico:** mantém “N de 4 habilidades respondidas. O tutor prepara a próxima tarefa ao começar.” e acrescenta a motivação da habilidade seguinte.
- **Integração:** cada texto passa por `esc()` antes de entrar no HTML; as aspas tipográficas ficam intactas. O parágrafo tem `data-motivation="<id>"` para testes e inspeção. Também é exportado `MOTIVATION_POOLS` para testes de curadoria.

## Critérios de curadoria

1. Uma frase curta sobre a **língua** + uma prática **objetiva** ligada ao DELE C1 (conectores, registro formal, mediação, objeções, recursos de tempo na fala, evidência, atitude do autor, distratores na escuta).
2. Humor sobre palavras e textos, nunca sobre a pessoa, a prova, o prazo ou o nível. Nada sobre dificuldade de Luiz; nada que trate Alana como certificada C1.
3. Não elogia capacidade não medida, não promete aprovação, não pune ausência e não se apresenta como correção ou medida. Motivação não é feedback.
4. Sem piadas sobre cultura basca, igrejas ou pacientes. Sem citações atribuídas a pessoas.
5. Português acessível; espanhol revisado (“sin embargo”, “no obstante”, “Me dirijo a usted para…”, “Entiendo su punto de vista, pero…”, “déjeme pensarlo”, “o sea”, “mejor dicho”, “bueno, habría que verlo”, “discrepo”, “ya, ya”, “le agradecería”).
6. Linha e ação curtas, geralmente abaixo de 120 caracteres, para caber em duas linhas cada no painel de 390 px.

Conjuntos atuais: rascunho 3 entradas (2 fora da escrita), revisão 4 entradas (3 em escrita/leitura/escuta e 2 em fala, com filtro por habilidade), escrita 5, fala 5, leitura 4, escuta 4, geral 2. Para acrescentar, siga os critérios e mantenha ids estáveis (`<conjunto>-<slug>`).

## Limites conhecidos

- O agente de design conferiu a paisagem rasterizada; a revisão central usou navegação real em Chrome. Não houve teste em aparelho físico. Títulos e rascunhos mais longos podem exigir rolagem.
- `npm run check` já inclui `public/motivation.js` (ajuste do agente central em `package.json`) e `tests/motivation.test.js` cobre estabilidade, prioridade e contexto incompleto. Os dois arquivos são do agente central.
- Títulos de tarefa com quatro linhas ou mais em 390 px podem empurrar o botão para perto de 700 px.

A curadoria central retirou afirmações absolutas sobre conectores e distratores, condicionou orientações de carta formal e mediação ao tipo de tarefa e adaptou ações de rascunho a texto, áudio ou questões. Nenhuma dica deve substituir a leitura do enunciado.

Após a crítica, a ação principal precede a dica. Em telas baixas, a paisagem fica com 44 px e o painel usa espaçamentos menores, conservando o nome da cidade. O estado factual de revisão está explícito. A observação motivacional tem peso menor que o título; o editor continua sem ambientação visual.
