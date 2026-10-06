// Cidades da Espanha que acompanham o estudo: foto real licenciada, três curiosidades curtas em espanhol,
// uma igreja e um hospital de referência. Módulo puro: sem rede, sem storage, sem relógio.
// O dia (America/Maceio, o mesmo para os dois perfis) vem calculado por quem chama; API e UI importam este arquivo.
// Fotos locais em /media/spain/, otimizadas a partir do Wikimedia Commons. Fontes e licenças em docs/ESPANHA.md.

const BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0/';
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/';
const UNESCO_ES = 'https://www.exteriores.gob.es/RepresentacionesPermanentes/unesco/es/UNESCO%20en%20Espana/Paginas/Inscripciones%20UNESCO/Patrimonio-Mundial.aspx';

const deepFreeze = value => {
 if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
 return value;
};

export const SPAIN_CITIES = deepFreeze([
 {
  id: 'donostia',
  name: 'San Sebastián / Donostia',
  timezone: 'Europe/Madrid',
  latitude: 43.3183,
  longitude: -1.9812,
  photo: {
   url: '/media/spain/donostia.webp',
   alt: 'Baía de La Concha vista do monte Igueldo, com a isla de Santa Clara e a praia em curva.',
   author: 'Phillip Maiwald (Nikopol)',
   license: 'CC BY-SA 3.0',
   licenseUrl: BY_SA_3,
   sourceUrl: 'https://commons.wikimedia.org/wiki/File:San_Sebastian_Bay_Panorama.jpg',
   title: 'San Sebastian Bay Panorama',
   adaptation: 'Recorte 2:1 do panorama, redimensionada para 1280 px e convertida para WebP.',
   width: 1280,
   height: 640
  },
  facts: [
   {id: 'donostia-barandilla', title: 'La barandilla de La Concha', text: 'La barandilla del paseo de La Concha, creada en 1916 por el arquitecto Juan Rafael Alday, es hoy una seña de identidad de la ciudad.', sourceUrl: 'https://donostia.eus/es/como-es-ciudad/parques-jardines/paseo-concha'},
   {id: 'donostia-santa-clara', title: 'Un faro convertido en obra', text: 'En la isla de Santa Clara, la artista Cristina Iglesias convirtió el antiguo faro en la obra «Hondalea».', sourceUrl: 'https://sansebastianturismoa.eus/isla-de-santa-clara/'},
   {id: 'donostia-buen-pastor', title: 'Buen Pastor', text: 'El Buen Pastor es un templo neogótico construido entre 1889 y 1897; se convirtió en catedral en 1953.', sourceUrl: 'https://catedralbuenpastor.org/catedral/conoce-el-templo/'}
  ],
  church: {name: 'Catedral del Buen Pastor', url: 'https://catedralbuenpastor.org/catedral/conoce-el-templo/'},
  hospital: {name: 'Hospital Universitario Donostia', url: 'https://www.osakidetza.euskadi.eus/osi-donostialdea-hospital-universitario-presentacion/webosk00-donoscon/es/'}
 },
 {
  id: 'mallorca',
  name: 'Palma (Mallorca)',
  timezone: 'Europe/Madrid',
  latitude: 39.5696,
  longitude: 2.6502,
  photo: {
   url: '/media/spain/mallorca.webp',
   alt: 'Catedral de Mallorca, La Seu, vista do Parc de la Mar, com palmeiras e um chafariz no lago.',
   author: 'Dietmar Rabich',
   license: 'CC BY-SA 4.0',
   licenseUrl: BY_SA_4,
   sourceUrl: 'https://commons.wikimedia.org/wiki/File:Palma_de_Mallorca,_Kathedrale_La_Seu_--_2009_--_5.jpg',
   title: 'Palma de Mallorca, Kathedrale La Seu -- 2009 -- 5',
   adaptation: 'Redimensionada para 1280 px e convertida para WebP.',
   width: 1280,
   height: 891
  },
  facts: [
   {id: 'mallorca-gaudi', title: 'Gaudí en La Seu', text: 'Gaudí abrió ventanales y trasladó el coro de la catedral para que el interior ganara luz y amplitud.', sourceUrl: 'https://visitpalma.com/es/dir/catedral/'},
   {id: 'mallorca-barcelo', title: 'Cerámica de Barceló', text: 'Dentro de La Seu hay un mural cerámico de Miquel Barceló de unos doce metros de altura.', sourceUrl: 'https://visitpalma.com/es/dir/catedral/'},
   {id: 'mallorca-tramuntana', title: 'Serra de Tramuntana', text: 'Desde 2011, el paisaje cultural de la Serra de Tramuntana figura en la Lista del Patrimonio Mundial.', sourceUrl: UNESCO_ES}
  ],
  church: {name: 'Catedral de Mallorca (La Seu)', url: 'https://catedraldemallorca.org/es/'},
  hospital: {name: 'Hospital Universitario Son Espases', url: 'https://www.hospitalsonespases.es/'}
 },
 {
  id: 'barcelona',
  name: 'Barcelona',
  timezone: 'Europe/Madrid',
  latitude: 41.3874,
  longitude: 2.1686,
  photo: {
   url: '/media/spain/barcelona.webp',
   alt: 'Parte alta da fachada da Casa Batlló, de Gaudí, com o telhado ondulado de escamas cerâmicas e a torre com cruz.',
   author: 'Bernard Gagnon',
   license: 'CC BY-SA 3.0',
   licenseUrl: BY_SA_3,
   sourceUrl: 'https://commons.wikimedia.org/wiki/File:Casa_Batll%C3%B3_01.jpg',
   title: 'Casa Batlló 01',
   adaptation: 'Redimensionada para 1280 px e convertida para WebP.',
   width: 1280,
   height: 949
  },
  facts: [
   {id: 'barcelona-batllo', title: 'Una casa remodelada', text: 'En 1904, Josep Batlló encargó a Gaudí remodelar un edificio que ya existía en el paseo de Gràcia.', sourceUrl: 'https://www.barcelona.cat/es/conocebcn/pics/la-casa-batllo-75990398260'},
   {id: 'barcelona-dragon', title: 'El lomo del dragón', text: 'El tejado ondulante de la Casa Batlló recuerda al lomo de un dragón y es un símbolo del modernismo barcelonés.', sourceUrl: 'https://www.barcelona.cat/es/conocebcn/pics/la-casa-batllo-75990398260'},
   {id: 'barcelona-lenguas', title: 'Tres lenguas oficiales', text: 'En Cataluña son oficiales el catalán, el castellano y el occitano, llamado aranés en Arán.', sourceUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-13087'}
  ],
  church: {name: 'Basílica de la Sagrada Família', url: 'https://sagradafamilia.org/es/'},
  hospital: {name: 'Hospital Clínic de Barcelona', url: 'https://www.clinicbarcelona.org/'}
 },
 {
  id: 'madrid',
  name: 'Madrid',
  timezone: 'Europe/Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
  photo: {
   url: '/media/spain/madrid.webp',
   alt: 'Estanque Grande do Retiro com barcos a remo diante do monumento a Alfonso XII e sua colunata.',
   author: 'Carlos Delgado',
   license: 'CC BY-SA 3.0',
   licenseUrl: BY_SA_3,
   sourceUrl: 'https://commons.wikimedia.org/wiki/File:Monumento_a_Alfonso_XII_de_Espa%C3%B1a_en_los_Jardines_del_Retiro_-_04.jpg',
   title: 'Monumento a Alfonso XII de España en los Jardines del Retiro - 04',
   adaptation: 'Redimensionada para 1280 px e convertida para WebP.',
   width: 1280,
   height: 768
  },
  facts: [
   {id: 'madrid-paisaje', title: 'Paisaje de las Artes y de las Ciencias', text: 'Desde 2021, el Paseo del Prado y el Buen Retiro forman parte de la Lista del Patrimonio Mundial.', sourceUrl: UNESCO_ES},
   {id: 'madrid-cristal', title: 'Un palacio para plantas', text: 'El Palacio de Cristal se levantó para exhibir plantas exóticas en la Exposición de Filipinas de 1887.', sourceUrl: 'https://www.esmadrid.com/informacion-turistica/parque-del-retiro'},
   {id: 'madrid-alfonso', title: 'Junto al Estanque Grande', text: 'El monumento a Alfonso XII, proyecto del arquitecto José Grasés Riera, tiene un mirador con vistas de la ciudad.', sourceUrl: 'https://www.esmadrid.com/informacion-turistica/parque-del-retiro'}
  ],
  church: {name: 'Catedral de Santa María la Real de la Almudena', url: 'https://catedraldelaalmudena.es/'},
  hospital: {name: 'Hospital Universitario La Paz', url: 'https://www.comunidad.madrid/hospital/lapaz/'}
 },
 {
  id: 'bilbao',
  name: 'Bilbao',
  timezone: 'Europe/Madrid',
  latitude: 43.2630,
  longitude: -2.9350,
  photo: {
   url: '/media/spain/bilbao.webp',
   alt: 'Museo Guggenheim Bilbao à beira da ría del Nervión, com o arco vermelho da ponte de La Salve ao fundo.',
   author: 'José Ligero Loarte',
   license: 'CC BY-SA 4.0',
   licenseUrl: BY_SA_4,
   sourceUrl: 'https://commons.wikimedia.org/wiki/File:Museo_Guggenheim_--_2021_--_Bilbao,_Euskadi,_Espa%C3%B1a.jpg',
   title: 'Museo Guggenheim -- 2021 -- Bilbao, Euskadi, España',
   adaptation: 'Redimensionada para 1280 px e convertida para WebP.',
   width: 1280,
   height: 800
  },
  facts: [
   {id: 'bilbao-muelle', title: 'Sobre un antiguo muelle', text: 'El Guggenheim se construyó entre 1993 y 1997 en un antiguo muelle portuario e industrial de la ría del Nervión.', sourceUrl: 'https://www.guggenheim-bilbao.eus/el-edificio/la-construccion'},
   {id: 'bilbao-titanio', title: 'Piel de titanio', text: 'Frank Gehry eligió el titanio tras observar cómo se comportaban unas muestras colocadas fuera de su estudio.', sourceUrl: 'https://www.guggenheim-bilbao.eus/el-edificio/la-construccion'},
   {id: 'bilbao-peregrinos', title: 'Puerta de los Peregrinos', text: 'La catedral de Bilbao está dedicada a Santiago, y su Puerta del Ángel forma parte del Camino de Santiago de la costa.', sourceUrl: 'https://catedralbilbao.com/la-catedral/'}
  ],
  church: {name: 'Catedral de Santiago de Bilbao', url: 'https://catedralbilbao.com/la-catedral/'},
  hospital: {name: 'Hospital Universitario Basurto', url: 'https://www.osakidetza.euskadi.eus/osi-bilbao-basurto-hospital-universitario-presentacion/webosk00-bibascon/es/'}
 },
 {
  id: 'santiago',
  name: 'Santiago de Compostela',
  timezone: 'Europe/Madrid',
  latitude: 42.8782,
  longitude: -8.5448,
  photo: {
   url: '/media/spain/santiago.webp',
   alt: 'Catedral de Santiago de Compostela acima dos telhados da cidade velha, com as torres da fachada do Obradoiro.',
   author: 'Luis Miguel Bugallo Sánchez (Lmbuga)',
   license: 'CC BY-SA 4.0',
   licenseUrl: BY_SA_4,
   sourceUrl: 'https://commons.wikimedia.org/wiki/File:Catedral_de_Santiago_de_Compostela._Galiza_2022-eue--13.jpg',
   title: 'Catedral de Santiago de Compostela. Galiza 2022-eue--13',
   adaptation: 'Redimensionada para 1280 px e convertida para WebP.',
   width: 1280,
   height: 853
  },
  facts: [
   {id: 'santiago-botafumeiro', title: '«El que echa humo»', text: 'En gallego, «botafumeiro» significa «el que echa humo»: así se llama el gran incensario de la catedral.', sourceUrl: 'https://catedraldesantiago.es/catedral/'},
   {id: 'santiago-obradoiro', title: 'La fachada del Obradoiro', text: 'La fachada barroca del Obradoiro, del siglo XVIII, es obra del arquitecto Fernando de Casas.', sourceUrl: 'https://catedraldesantiago.es/catedral/'},
   {id: 'santiago-ciudad-vieja', title: 'Ciudad vieja', text: 'Desde 1985, la ciudad vieja de Santiago de Compostela figura en la Lista del Patrimonio Mundial.', sourceUrl: UNESCO_ES}
  ],
  church: {name: 'Catedral de Santiago de Compostela', url: 'https://catedraldesantiago.es/visitas/'},
  hospital: {name: 'Hospital Clínico Universitario de Santiago', url: 'https://xxisantiago.sergas.es/Paxinas/web.aspx?idContido=183&idLista=3&idTax=-1&tipo=paxtab'}
 }
]);

// Ciclo de 8 dias: Donostia aparece 3 vezes (posições 0, 3 e 6) e cada outra cidade uma vez.
export const SPAIN_CYCLE = Object.freeze(['donostia', 'mallorca', 'barcelona', 'donostia', 'madrid', 'bilbao', 'donostia', 'santiago']);
export const SPAIN_CYCLE_ANCHOR = '2026-10-06';
export const DEFAULT_SPAIN_CITY_ID = 'donostia';

const BY_ID = new Map(SPAIN_CITIES.map(city => [city.id, city]));
const DAY_MS = 86400000;

// Só aceita datas de calendário reais em AAAA-MM-DD; o resto retorna NaN.
function dayNumber(dateISO) {
 const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateISO ?? ''));
 if (!match) return NaN;
 const [year, month, day] = match.slice(1).map(Number);
 const check = new Date(0);
 check.setUTCFullYear(year, month - 1, day); // Date.UTC trataria os anos 0–99 como 1900–1999.
 if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return NaN;
 return Math.floor(check.getTime() / DAY_MS);
}

const ANCHOR_DAY = dayNumber(SPAIN_CYCLE_ANCHOR);

export function spainCityById(id) {
 return BY_ID.get(String(id ?? '')) || null;
}

// Mesma data, mesma cidade, em qualquer fuso do servidor ou do aparelho. Data inválida ou ausente cai em Donostia.
export function cityForDay(dateISO) {
 const day = dayNumber(dateISO);
 if (!Number.isFinite(day)) return BY_ID.get(DEFAULT_SPAIN_CITY_ID);
 const index = ((day - ANCHOR_DAY) % SPAIN_CYCLE.length + SPAIN_CYCLE.length) % SPAIN_CYCLE.length;
 return BY_ID.get(SPAIN_CYCLE[index]);
}
