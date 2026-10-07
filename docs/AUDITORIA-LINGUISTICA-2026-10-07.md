# Auditoria linguística das tarefas geradas — 2026-10-07

Esta etapa de auditoria foi somente leitura; as decisões de implementação posteriores estão em `MELHORIAS-2026-10-07.md`. Este relatório não reproduz fontes completas nem indica quais alternativas estão corretas.

## Escopo e método

- **Amostra:** `private/agents/content-audit.json`, 9 tarefas originais geradas entre 2026-10-06 e 2026-10-07 (perfis Luiz e Alana).
  - **c1-v2 (4):** escuta `inference` "Sensores con voz pública" (654 palavras, 6 itens); escuta `pragmatics` "La biblioteca con cafetera" (287 palavras, 4 itens, recorte curto); leitura `inference` "La ciudad de los recados invisibles" (634 palavras, 6 itens); escrita `formal` "Salas de barrio compartidas" (estímulo de 147 palavras).
  - **Legadas, sem `trainingVersion` (5):** escrita "Desarrollo urbano y calidad de vida…"; escutas "La transformación del trabajo…" e "La inteligencia artificial y el futuro del trabajo…"; leituras "La tecnología en la vida cotidiana…" e "La importancia de la creatividad…".
- **Material examinado:** `instruction`, `source`, `focus`, enunciados, as três alternativas de cada item e as `explanation`.
- **Referências internas:** `src/c1.js` (briefs e revisão) e `docs/PEDAGOGIA.md`. `docs/REFERENCIAS-C1.md:7` registra que a prova tem "variedade geográfica real de espanhol".
- **Critério normativo informado:** na compreensão, o C1 pressupõe entender as principais variedades; na produção, aceita qualquer variedade usada com coerência. `src/c1.js:32` e `src/c1.js:324` já falam em "espanhol culto de qualquer variante", e esta auditoria mantém esse critério.
- **Busca de interferência catalã:** leitura integral, seguida de varredura por marcadores conhecidos: *hacer servir, plegar, hacer tarde, estirarse, picar (a la puerta), mirar de + inf., contra más, de seguida, tener de, cerrar la luz, sobretodo, por tal de, según como*, artigo antes de nome próprio, *es por eso que* e *a nivel de*. Também foram buscados lusismos, porque os prompts do gerador estão em português.

## Veredito sobre catalanismos

**Não foram identificadas ocorrências claras de interferência catalã nas 9 tarefas** examinadas. A suspeita não se confirmou nesta amostra, e **nada aqui justifica mudar regra contra catalanismos**.

As palavras que costumam levantar suspeita aparecem, mas são espanhol peninsular padrão ou léxico pan-hispânico de administração e urbanismo. Essas ocorrências não indicam mistura involuntária com o catalão; não foi realizada uma investigação etimológica:

| Palavra/expressão | Onde aparece | Classificação |
|---|---|---|
| *coches* ("menos coches privados", "dependencia del coche") | Recados (v2) | Pan-hispânico; uso majoritário na Espanha |
| *concejal / concejala*, *Concejalía de Cultura*, *Ayuntamiento* | Recados, Sensores, Biblioteca, Salas (v2) | Administração municipal espanhola padrão |
| *recelo* ("recibió el proyecto con recelo"; "su recelo inicial") | Recados (fonte), Sensores (alternativa) | Pan-hispânico, registro culto |
| *alegaciones* ("quién sabe redactar alegaciones") | Recados (v2) | Termo jurídico-administrativo padrão |
| *equipamientos* ("la promesa de equipamientos próximos") | Recados (v2) | Termo técnico de urbanismo padrão |
| *marquesina*, *contenedores*, *baldosa*, *cuadro de mando*, *vivir en un bajo* | Sensores (v2) | Peninsular legítimo; *un bajo* (andar térreo) é coloquial da Espanha |
| *portátiles*, *enchufe*, *barra móvil* | Biblioteca (v2) | Peninsular legítimo |
| *teléfono móvil* | Tecnología (legada) | Peninsular legítimo |

## Perfil de variedade

- **c1-v2:** espanhol peninsular padrão, com cenário municipal espanhol (Ayuntamiento, Concejalía, alegaciones, federación de barrios). As formas são coerentes entre si e com a referência San Sebastián/Bilbao/Santiago do app. É uma variedade legítima.
- **Legadas:** registro "internacional" genérico, com americanismos legítimos: *desempeñarse* ("desempeñarse en contextos tan cambiantes"), *requieren de* ("requieren de habilidades interpersonales"), *sector salud* sem preposição, *se enfocan en*, *habilidades blandas* e *trabajo remoto*. Convivem com *teléfono móvil*. A mistura não é erro de compreensão e não exige correção.
- **Observação, não problema:** as 4 tarefas c1-v2 são todas peninsulares e quase todas tratam de política municipal de bairro ("Santa Marina", "Santa Elvira", concejala, biblioteca/salas de barrio). Como a prova tem variedade geográfica real, a exposição exclusiva a uma variedade seria uma limitação pedagógica. Quatro tarefas não bastam para concluir que há viés do gerador, e isto não é motivo para proibir nada.

## Achados reais — c1-v2

Severidade: **M** = média (afeta naturalidade ou o item), **B** = baixa (estilo ou instrução).

### Escuta pragmática — "La biblioteca con cafetera" (Luiz)

1. **M · Expressão não consolidada:** "No pido dejar el edificio **en ámbar**". *Dejar/quedar en ámbar* não é uma locução estabelecida em espanhol. *Ámbar* evoca o semáforo e torna o sentido ambíguo ("em alerta?", "congelado?"). Pelo contexto, a ideia parece ser "conservar o edifício intacto", o que sugere um decalque do inglês *preserved in amber*. A origem não é verificável, mas **não é catalanismo**. Alternativas naturais: "dejarlo todo como está", "congelar el edificio", "conservarlo en formol" (coloquial peninsular). O trecho fica na mesma frase de "pasar de puntillas", que é alvo de um item. A expressão estranha pesa na compreensão auditiva daquele ponto.
2. **B · Provérbio truncado:** "me parece **pan para hoy**". A forma canônica é "pan para hoy y hambre para mañana". A elipse existe na fala, mas, num áudio para não nativos, sem pausa nem entonação suspensiva, o sentido fica opaco.
3. **B · Densidade artificial de locuções:** em 287 palavras aparecem cerca de nove: *dar la lata, vender la moto, no ir desencaminado, hacer encaje de bolillos, pan para hoy, no ser de recibo, quitar el sueño, en ámbar, pasar de puntillas*. Todas, exceto *en ámbar*, são peninsulares legítimas e de nível C1. O problema é o acúmulo: quase uma por frase soa a texto montado para "mostrar expressões", não a fala espontânea. Isso é efeito de construção artificial, não regionalismo.
4. **M · Deslize gramatical em alternativa (item 4):** "…permitiría aliviar el presupuesto si los comercios **financiaban** mejoras materiales…". Com apódose no condicional, a prótase pede imperfeito do subjuntivo: "si los comercios financiaran/financiasen". A forma também é citada na `explanation`. Uma alternativa agramatical pode ser descartada pela forma, não pelo sentido, o que enfraquece o item. Ela passou pela resolução cega e pela revisão automática.

### Escuta de inferência — "Sensores con voz pública" (Alana)

5. **B · Estrangeirismo na instrução:** "sirve como **triage** inicial". O DLE registra *triaje*. *Triage* circula em contexto hospitalar americano, mas na instrução de uma tarefa de espanhol culto a forma normativa é *triaje* ou, melhor, "diagnóstico inicial". A origem provável é a frase em português "Triagem inicial…" do prompt (`src/c1.js:132`). Não afeta nenhum item.
6. **B · Colocação forçada na instrução:** "identifica quién **defiende cada cautela**". *Defender una cautela* é pouco natural. Seria mais idiomático "quién expresa cada reserva/cautela". Impacto baixo.
7. **Sem evidência suficiente para classificar como erro:**
   - "negociarse **en sede pública**": *en sede* + adjetivo é colocação jurídico-administrativa conhecida (*en sede judicial/parlamentaria*). A variante é menos frequente, mas compreensível.
   - "responsables obligados a contestar **sin prisa**": o sentido é ambíguo (dar tempo à resposta ou falta de urgência?), mas não é agramatical.
   - "grietas que todavía no **cantan**": uso coloquial peninsular de *cantar* = "dar na vista, notar-se" (cf. "eso canta"). É legítimo, e a metáfora é exigente para escuta C1, o que não é defeito.

### Leitura de inferência — "La ciudad de los recados invisibles" (Alana)

8. **B · Possível interferência do português numa `explanation` (item 5):** "algo que **ambos actores no formulan** así". Em espanhol, a negação com *ambos* soa estranha e ambígua. O natural é "algo que ninguno de los dos formula así". A hipótese de lusismo (pt. "ambos não…") é plausível, porque os prompts estão em português, mas é **uma única ocorrência**: evidência insuficiente para generalizar.
9. A fonte, os enunciados e as alternativas estão limpos: léxico preciso e registro culto coerente, sem regionalismo problemático.

### Escrita formal — "Salas de barrio compartidas" (Luiz)

10. Nenhum achado. Estímulo e instrução em registro institucional peninsular natural ("Concejalía de Cultura", "criterios de reserva", "observaciones por escrito", "reuniones de mayores", "apoyo escolar").

## Achados reais — legadas (fora do `c1-v2`)

Estas tarefas já são reconhecidas em `docs/PEDAGOGIA.md` como fáceis demais. Os achados abaixo só confirmam que não servem de referência linguística para o C1. Nenhum é catalanismo.

- **M · Modo verbal:** "¿cómo garantizar que los trabajadores **adquieren** las habilidades…?" ("La transformación del trabajo…"). *Garantizar que* com valor prospectivo pede subjuntivo: "adquieran".
- **B · Regência:** "las personas trabajan, **comunican** y desarrollan…" (mesma tarefa). O natural é "se comunican". *Comunicar* intransitivo nesse sentido soa a calco.
- **B · Locução desaconselhada:** "**A nivel social**, la tecnología…" ("La tecnología en la vida cotidiana…"). O DPD desaconselha *a nivel de* com o sentido de "no âmbito de". Alternativa: "En el plano social". Popularmente é tida às vezes como catalanismo, mas é um uso pan-hispânico de origem discutida e **não deve ser tratado como interferência catalã**.
- **B · Redundâncias de texto genérico** (mesma tarefa): "Hoy en día, resulta casi impensable imaginar"; "acceso **adecuado** a internet o dispositivos **adecuados**".
- **B · Título da escrita legada:** "revista digital **de opinión pública**". O gênero é "revista de opinión", e *opinión pública* é outro conceito.
- **Pedagógico, não linguístico:**
  - as explicações estão em português e citam posição ("a alternativa correta é a primeira"), o que não combina com o embaralhamento; em 3 itens das duas escutas legadas, a posição citada nem coincide com o índice armazenado;
  - há distratores implausíveis, como "Exceso de tiempo libre en clase", "Abundancia de recursos tecnológicos" e "La dificultad para encontrar noticias falsas".

  O `c1-v2` já corrige esses dois pontos (`docs/PEDAGOGIA.md`, seção de validação).

## O que não é problema e não deve virar regra

- Peninsularismos e americanismos legítimos (tabelas acima): nenhum deve ser proibido ou "neutralizado".
- Locuções coloquiais peninsulares em tarefas de pragmática: são exigência real do C1 (expressões idiomáticas, microdiálogos; `docs/REFERENCIAS-C1.md:7`).
- Vocabulário técnico-administrativo (*alegaciones, equipamientos, cuadro de mando, carga y descarga*): faz parte do registro culto esperado e não deve ser simplificado.
- Metáforas exigentes, mas idiomáticas (*grietas que no cantan*, *encaje de bolillos*): mantêm a dificuldade C1 por inferência, como pede `src/c1.js:16`.

## Microorientações sugeridas (opcionais)

Só três pontos têm base nos dados. Nenhum reduz o nível nem restringe variedades.

1. **Revisão automática (`qualityReviewPrompt`, `src/c1.js:301`):** acrescentar um ponto de `issues` para "construção agramatical ou não idiomática em fonte, enunciado ou alternativa, citando o trecho; não penalizar variedades legítimas do espanhol (peninsular, americanas) nem coloquialismos estabelecidos". *Base:* "financiaban" numa alternativa e "en ámbar" na fonte passaram pela resolução cega e pela revisão, que hoje não avaliam naturalidade. *Evidência:* moderada (2 ocorrências em 4 tarefas v2).
2. **Brief de pragmática (`src/c1.js:45`):** especificar "locuções consolidadas, na forma canônica e em densidade natural de fala". *Base:* uma única tarefa ("en ámbar", "pan para hoy", cerca de 9 locuções em 287 palavras). *Evidência:* fraca (n = 1). Recomendo observar as próximas 3–5 tarefas `pragmatics` antes de alterar.
3. **Rótulo de triagem (`src/c1.js:132`):** se o termo incomodar, indicar a forma espanhola desejada ("diagnóstico inicial" ou "triaje"). Ajuste cosmético.

**Não recomendado:**
- lista de palavras proibidas;
- filtro "anticatalanismo";
- exigência de "espanhol neutro";
- redução de expressões idiomáticas ou do registro.

Os dados não sustentam nenhuma dessas medidas, e elas contrariariam o critério de compreensão de variedades.

## Limites desta auditoria

- A amostra é pequena (4 tarefas v2), e as conclusões sobre tendências do gerador são provisórias.
- Áudio sintético não foi ouvido: a análise da escuta usa a transcrição.
- A auditoria foi feita por modelo de linguagem, sem consulta a corpus (CORPES/CREA) nesta sessão. As classificações de frequência ("pouco natural", "não consolidada") são avaliações linguísticas da IA e devem ser confirmadas por professor nativo ou por consulta a corpus antes de virar regra.
