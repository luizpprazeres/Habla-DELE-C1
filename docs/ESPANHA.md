# Cidades da Espanha: fotos, curiosidades e rotação

Consulta e aquisição em 06/10/2026. Módulo: `public/spain-cities.js` (contrato 0.4.0). Testes: `tests/spain.test.js`. Fotos: `public/media/spain/`.

As cidades são ambientação cultural, independentes da avaliação do DELE. Não há vínculo com as instituições citadas e o app não dá informação sobre vagas, revalidação, consultas, horários, ingressos ou preços.

## Módulo

- `SPAIN_CITIES`: seis cidades congeladas (`donostia`, `mallorca`, `barcelona`, `madrid`, `bilbao`, `santiago`). Cada uma tem `{id, name, timezone: 'Europe/Madrid', latitude, longitude, photo, facts, church, hospital}`.
- `photo`: `{url, alt, author, license, licenseUrl, sourceUrl}`, que são os campos do contrato, mais `title` (título do arquivo no Commons), `adaptation`, `width` e `height`. `url` é sempre local (`/media/spain/{id}.webp`) e nada é carregado de fora em tempo de execução.
- `facts`: três curiosidades curtas em espanhol, `{id, title, text, sourceUrl}`, redigidas a partir das fontes e sem copiá-las.
- `cityForDay(dateISO)`: devolve o objeto da cidade do dia. Função pura que não lê relógio nem fuso. Quem chama passa a data `AAAA-MM-DD` já calculada em America/Maceio, e assim os dois perfis veem a mesma cidade no mesmo dia.
- `spainCityById(id)` devolve a cidade do catálogo ou `null`. Serve para `GET /api/spain?city=ID` aceitar apenas ids do catálogo.
- Também exporta `SPAIN_CYCLE`, `SPAIN_CYCLE_ANCHOR` e `DEFAULT_SPAIN_CITY_ID`.

### Rotação

Ciclo de 8 dias ancorado em 06/10/2026, que é Donostia:

| Posição | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Cidade | Donostia | Palma (Mallorca) | Barcelona | Donostia | Madrid | Bilbao | Donostia | Santiago |

- Donostia aparece 3 vezes em cada 8 dias e nunca em dois dias seguidos. As outras cidades aparecem uma vez.
- Datas anteriores à âncora usam módulo positivo, então não há índice negativo.
- Uma data inválida, ausente ou fora do formato (`2026-02-30`, `2026-10-6`, data com hora, número) devolve Donostia.
- Os anos 0–99 são tratados corretamente, porque `Date.UTC` os converteria para 1900–1999.

## Fotos

Todas são fotografias reais publicadas por fotógrafos no Wikimedia Commons, sem foco em pessoas. A licença foi conferida na página e na API do Commons (`extmetadata` e wikitext do arquivo). Os arquivos foram baixados dos servidores do Wikimedia (`upload.wikimedia.org` / `thumb.wikimedia.org`) via API pública e otimizados localmente com sharp 0.35.4: no máximo 1280 px de largura, WebP com qualidade 78, sem metadados. Nenhuma edição por IA e nenhum filtro: contraste e degradê ficam por conta do CSS no frontend.

| Cidade | Arquivo no Commons | Autor | Licença | Adaptação | Final |
|---|---|---|---|---|---|
| Donostia | [San Sebastian Bay Panorama](https://commons.wikimedia.org/wiki/File:San_Sebastian_Bay_Panorama.jpg) (2009, original 5534×1842) | Phillip Maiwald (Nikopol) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), também GFDL | Panorama recortado em 2:1 (x 620–3176 da miniatura 3840×1278), redimensionado | 1280×640, 128.776 B |
| Palma (Mallorca) | [Palma de Mallorca, Kathedrale La Seu -- 2009 -- 5](https://commons.wikimedia.org/wiki/File:Palma_de_Mallorca,_Kathedrale_La_Seu_--_2009_--_5.jpg) | Dietmar Rabich | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Redimensionada | 1280×891, 159.078 B |
| Barcelona | [Casa Batlló 01](https://commons.wikimedia.org/wiki/File:Casa_Batll%C3%B3_01.jpg) (Quality Image) | Bernard Gagnon | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), também GFDL | Redimensionada | 1280×949, 189.236 B |
| Madrid | [Monumento a Alfonso XII de España en los Jardines del Retiro - 04](https://commons.wikimedia.org/wiki/File:Monumento_a_Alfonso_XII_de_Espa%C3%B1a_en_los_Jardines_del_Retiro_-_04.jpg) (Featured/Quality) | Carlos Delgado | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Redimensionada | 1280×768, 169.050 B |
| Bilbao | [Museo Guggenheim -- 2021 -- Bilbao, Euskadi, España](https://commons.wikimedia.org/wiki/File:Museo_Guggenheim_--_2021_--_Bilbao,_Euskadi,_Espa%C3%B1a.jpg) (Featured/Quality) | José Ligero Loarte | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Redimensionada | 1280×800, 149.324 B |
| Santiago | [Catedral de Santiago de Compostela. Galiza 2022-eue--13](https://commons.wikimedia.org/wiki/File:Catedral_de_Santiago_de_Compostela._Galiza_2022-eue--13.jpg) (Quality Image) | Luis Miguel Bugallo Sánchez (Lmbuga) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Redimensionada | 1280×853, 190.196 B |

### Atribuição obrigatória

- A licença CC BY-SA exige que o crédito fique visível junto da foto ou em um link óbvio a partir dela. O crédito traz autor, licença com link (`licenseUrl`), origem (`sourceUrl`) e a indicação de alteração (por exemplo, “Foto: Autor · CC BY-SA 4.0 · Wikimedia Commons · adaptada”).
- As versões WebP adaptadas continuam sob a mesma licença CC BY-SA (ShareAlike). Elas não podem ser relicenciadas nem receber marca d'água do app.
- Dietmar Rabich pede que o crédito siga o formato: `Dietmar Rabich / Wikimedia Commons / “Palma de Mallorca, Kathedrale La Seu -- 2009 -- 5” / CC BY-SA 4.0`.
- Carlos Delgado pede que o crédito “Carlos Delgado; CC-BY-SA” apareça perto da imagem.
- Bilbao: as esculturas de Koons, Kapoor e Bourgeois aparecem pequenas e no espaço público. O Commons hospeda a foto com base na liberdade de panorama da Espanha (art. 35.2 do TRLPI). Fica registrado aqui como limitação, sem garantia jurídica.

## Curiosidades e fontes

| Cidade | id | Fonte oficial |
|---|---|---|
| Donostia | `donostia-barandilla`: barandilla de La Concha, de 1916, por Juan Rafael Alday | [Ayuntamiento de Donostia, Paseo de La Concha](https://donostia.eus/es/como-es-ciudad/parques-jardines/paseo-concha) |
| Donostia | `donostia-santa-clara`: antigo farol transformado em “Hondalea”, de Cristina Iglesias | [Donostia San Sebastián Turismoa, Isla de Santa Clara](https://sansebastianturismoa.eus/isla-de-santa-clara/) |
| Donostia | `donostia-buen-pastor`: neogótico, construído em 1889–1897, catedral desde 1953 | [Catedral del Buen Pastor, conoce el templo](https://catedralbuenpastor.org/catedral/conoce-el-templo/) |
| Mallorca | `mallorca-gaudi`: Gaudí abriu janelas e mudou o coro de lugar | [Visit Palma, Catedral](https://visitpalma.com/es/dir/catedral/) |
| Mallorca | `mallorca-barcelo`: mural cerâmico de Miquel Barceló, cerca de 12 m | [Visit Palma, Catedral](https://visitpalma.com/es/dir/catedral/) |
| Mallorca | `mallorca-tramuntana`: Serra de Tramuntana, Patrimônio Mundial em 2011 | [Delegação Permanente da Espanha na UNESCO, Patrimonio Mundial](https://www.exteriores.gob.es/RepresentacionesPermanentes/unesco/es/UNESCO%20en%20Espana/Paginas/Inscripciones%20UNESCO/Patrimonio-Mundial.aspx) |
| Barcelona | `barcelona-batllo`: Josep Batlló contratou Gaudí em 1904 para remodelar o edifício | [Ajuntament de Barcelona, La Casa Batlló](https://www.barcelona.cat/es/conocebcn/pics/la-casa-batllo-75990398260) |
| Barcelona | `barcelona-dragon`: telhado que lembra o dorso de um dragão | Mesma página |
| Barcelona | `barcelona-lenguas`: catalão, castelhano e occitano (aranês) oficiais | [BOE, Estatut d'Autonomia de Catalunya, art. 6](https://www.boe.es/buscar/act.php?id=BOE-A-2006-13087) |
| Madrid | `madrid-paisaje`: Paseo del Prado e Buen Retiro, Patrimônio Mundial em 2021 | Delegação na UNESCO (link acima) |
| Madrid | `madrid-cristal`: Palacio de Cristal, Exposición de Filipinas de 1887 | [esMadrid, Parque del Retiro](https://www.esmadrid.com/informacion-turistica/parque-del-retiro) |
| Madrid | `madrid-alfonso`: monumento de José Grasés Riera, com mirante | Mesma página |
| Bilbao | `bilbao-muelle`: construído em 1993–1997 num antigo cais da ría del Nervión | [Museo Guggenheim Bilbao, La construcción](https://www.guggenheim-bilbao.eus/el-edificio/la-construccion) |
| Bilbao | `bilbao-titanio`: Gehry escolheu o titânio depois de testar amostras | Mesma página |
| Bilbao | `bilbao-peregrinos`: Puerta del Ángel, no Camino de Santiago da costa | [Catedral de Bilbao, La Catedral](https://catedralbilbao.com/la-catedral/) |
| Santiago | `santiago-botafumeiro`: “el que echa humo” em galego | [Catedral de Santiago, Catedral](https://catedraldesantiago.es/catedral/) |
| Santiago | `santiago-obradoiro`: fachada do século XVIII, de Fernando de Casas | Mesma página |
| Santiago | `santiago-ciudad-vieja`: Patrimônio Mundial em 1985 | Delegação na UNESCO (link acima) |

Critérios: frases curtas (≤ 140 caracteres, verificado em teste), sem preço, horário, regra de visita, data incerta ou superlativo (“el más…”, “el mayor…”). Quando as fontes divergiam, o fato ficou de fora. Foi o caso das datas de término da reforma de Gaudí na Seu (1914 ou 1915) e do “rosetón más grande del gótico”. A ortografia segue a forma espanhola dos nomes de lugar (Gràcia e Família seguem o uso catalão oficial).

## Igrejas e hospitais

Só nome e link institucional. Nenhuma afirmação médica.

| Cidade | Igreja | Hospital |
|---|---|---|
| Donostia | [Catedral del Buen Pastor](https://catedralbuenpastor.org/catedral/conoce-el-templo/) | [Hospital Universitario Donostia](https://www.osakidetza.euskadi.eus/osi-donostialdea-hospital-universitario-presentacion/webosk00-donoscon/es/) |
| Palma | [Catedral de Mallorca](https://catedraldemallorca.org/es/) | [Hospital Universitario Son Espases](https://www.hospitalsonespases.es/) |
| Barcelona | [Sagrada Família](https://sagradafamilia.org/es/) | [Hospital Clínic](https://www.clinicbarcelona.org/) |
| Madrid | [Catedral de la Almudena](https://catedraldelaalmudena.es/) | [Hospital Universitario La Paz](https://www.comunidad.madrid/hospital/lapaz/) |
| Bilbao | [Catedral de Santiago](https://catedralbilbao.com/la-catedral/) | [Hospital Universitario Basurto](https://www.osakidetza.euskadi.eus/osi-bilbao-basurto-hospital-universitario-presentacion/webosk00-bibascon/es/) |
| Santiago | [Catedral de Santiago](https://catedraldesantiago.es/visitas/) | [Hospital Clínico Universitario](https://xxisantiago.sergas.es/Paxinas/web.aspx?idContido=183&idLista=3&idTax=-1&tipo=paxtab) |

## Limites da verificação

- `whc.unesco.org` e `catedraldemallorca.org` responderam com um desafio Cloudflare (HTTP 403) a acessos não interativos. Por isso os anos de inscrição na UNESCO foram conferidos na página oficial da Delegação Permanente da Espanha na UNESCO (exteriores.gob.es), e os fatos da Seu no Visit Palma (turismo municipal). O link da catedral de Mallorca é o oficial, mas não abriu daqui.
- `hospitalsonespases.es`, `comunidad.madrid/hospital/lapaz/` e `xxisantiago.sergas.es` deram timeout ou recusaram conexão a partir deste ambiente, provavelmente por restrição geográfica. As URLs foram confirmadas como oficiais por busca, não por acesso direto. As demais URLs de fatos, igrejas e hospitais responderam HTTP 200 em 06/10/2026.
- Coordenadas aproximadas do centro de cada cidade, só para a previsão do tempo.
- Os testes não acessam a rede. Eles conferem o formato do catálogo, o ciclo, o fallback, a independência de fuso e relógio, e se cada WebP local é um WebP real com as dimensões e o tamanho declarados.
