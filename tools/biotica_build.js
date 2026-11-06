/* Red de interacciones bióticas de Kennedy -> data3d/biotica.json
   Fuente: https://anasoficasca-code.github.io/humedalburro/ (Red de Interacciones Bióticas de Kennedy). Se ejecuta la MISMA
   lógica de la página (FULL_DATASET + buildConscientiousBioticNetwork) para obtener exactamente sus aristas, y se deja:
   - las especies de fauna que caminan, nadan o vuelan en el territorio (lista FAUNA: nodo de la red -> clave del simulador)
   - las aristas entre esas especies y hacia la flora (actor -> objetivo, con su tipo y su justificación)
   - para cada nodo de flora, los índices de especie en data3d/trees.json (censo SIGAU), para anclar la línea al árbol real
   Uso: node tools/biotica_build.js   (descarga la página la primera vez en tools/cache/humedalburro_index.html) */
const fs = require('fs'), path = require('path'), https = require('https');
const RAIZ = path.join(__dirname, '..'), CACHE = path.join(__dirname, 'cache', 'humedalburro_index.html');
const URL = 'https://anasoficasca-code.github.io/humedalburro/';

// nodo de la red (índice en FULL_DATASET, comprobado por nombre científico) -> clave del simulador
const FAUNA = {
  tingua: 'Porphyriops melanops|Tingua moteada', garza: 'Ardea alba|Garza blanca', garzaNoc: 'Nycticorax nycticorax', pato: 'Oxyura ferruginea|Pato andino',
  focha: 'Fulica americana columbiana', monjita: 'Chrysomus icterocephalus bogotensis', copeton: 'Zonotrichia capensis costaricensis',
  mirla: 'Turdus fuscater gigas', colibri: 'Colibri coruscans', chamon: 'Molothrus bonariensis', torcaza: 'Zenaida auriculata pentheria',
  cucarachero: 'Troglodytes musculus columbae', cernicalo: 'Falco sparverius', buho: 'Asio flammeus bogotensis',
  curi: 'Cavia aperea', comadreja: 'Neogale frenata affinis', rata: 'Rattus norvegicus', rana: 'Rana sabanera',
  culebra: 'Atractus crassicaudatus', lagartija: 'Anadia bogotensis', caracol: 'Cornu aspersum'
};
// la página trae algunas tildes dañadas (carácter de reemplazo U+FFFD): se reponen palabra por palabra
const TILDES = { 'Mam�feros': 'Mamíferos', 'Gaster�podos': 'Gasterópodos', 'mel�fera': 'melífera', 'n�ctar': 'néctar', 'diseminaci�n': 'diseminación', 'zo�cora': 'zoócora', 'fit�fago': 'fitófago', 'r�dula': 'rádula', 'pl�ntulas': 'plántulas', 'Urap�n': 'Urapán', 'Depredaci�n': 'Depredación', 'carn�vora': 'carnívora', 'regulaci�n': 'regulación', 'acu�ticos': 'acuáticos', 'subterr�neas': 'subterráneas' };
const fix = (s) => { try { s = /Ã|Â/.test(s) ? Buffer.from(s, 'latin1').toString('utf8') : s; } catch (e) {} return String(s).replace(/[A-Za-zÁÉÍÓÚáéíóúñ]*�[A-Za-zÁÉÍÓÚáéíóúñ]*/g, w => TILDES[w] || w.replace(/�/g, '')); };

function bajar() {
  return new Promise((ok, mal) => https.get(URL, { headers: { 'User-Agent': 'ren3d-kennedy' } }, r => { let b = ''; r.setEncoding('utf8'); r.on('data', d => b += d); r.on('end', () => ok(b)); }).on('error', mal));
}
(async () => {
  if (!fs.existsSync(CACHE)) fs.writeFileSync(CACHE, await bajar(), 'utf8');
  const t = fs.readFileSync(CACHE, 'utf8');
  const a = t.indexOf('FULL_DATASET = ') + 15, ds = t.slice(a, t.indexOf('\n', a)).trim().replace(/;$/, '');
  const m = t.indexOf('const rawEdges = [];'), fin = t.indexOf('buildConscientiousBioticNetwork();', t.indexOf('function buildConscientiousBioticNetwork'));
  const codigo = `const FULL_DATASET = ${ds};
const rawNodes = FULL_DATASET.map((d, idx) => ({ id: idx, taxaId: d.id, label: d.name, sciname: d.sciname, cat: d.cat, neighbors: [] }));
${t.slice(m, fin)}
buildConscientiousBioticNetwork();
return { FULL_DATASET, INTER_TYPES, aristas: Object.values(edgeDetailsMap) };`;
  const { FULL_DATASET: F, INTER_TYPES, aristas } = new Function(codigo)();

  const nodo = {}; // clave -> índice
  for (const [k, q] of Object.entries(FAUNA)) {
    const op = q.split('|'); let i = -1;
    for (const o of op) { i = F.findIndex(n => n.cat > 0 && (n.sciname === o || fix(n.name) === o)); if (i >= 0) break; }
    if (i < 0) for (const o of op) { i = F.findIndex(n => n.cat > 0 && (fix(n.name) + ' ' + n.sciname).toLowerCase().includes(o.toLowerCase())); if (i >= 0) break; }
    if (i < 0) throw new Error('no está en la red: ' + k + ' (' + q + ')');
    nodo[k] = i;
  }
  const clave = {}; for (const [k, i] of Object.entries(nodo)) clave[i] = k;

  // flora -> especies del censo de árboles (trees.json): mismo nombre común que el nodo SIGAU
  const T = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data3d', 'trees.json'), 'utf8'));
  const norm = (s) => fix(s).replace(/\s*\(SIGAU-\d+\)\s*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const spIdx = {}; T.sp.forEach((s, i) => { (spIdx[norm(s)] = spIdx[norm(s)] || []).push(i); });

  const TIPO = Object.values(INTER_TYPES).sort((x, y) => x.id - y.id);
  const enlaces = [], flora = {}; let sinArbol = 0;
  const ref = (i) => clave[i] !== undefined ? clave[i] : (F[i].cat === 0 ? 'f' + i : null);
  for (const e of aristas) {
    let s = e.source, d = e.target, r = e.rationale || '';
    const k = e.type.id;
    // actor -> objetivo: la fauna actúa sobre la flora; en depredación el actor es el depredador
    if (F[s].cat === 0 && F[d].cat > 0 && k !== 8) [s, d] = [d, s];
    if (k === 0 && /Eslabón de presa/.test(r)) [s, d] = [d, s];
    const A = ref(s), B = ref(d);
    if (A === null || B === null || (A[0] === 'f' && B[0] === 'f')) continue;
    for (const x of [A, B]) if (x[0] === 'f' && !flora[x]) {
      const sp = spIdx[norm(F[+x.slice(1)].name)] || [];
      if (!sp.length) sinArbol++;
      flora[x] = { n: norm(F[+x.slice(1)].name) && fix(F[+x.slice(1)].name).replace(/\s*\(SIGAU-\d+\)\s*$/, ''), sp };
    }
    enlaces.push([A, B, k, fix(r)]);
  }
  // sin árbol censado no hay dónde anclar la línea: se quitan esas aristas
  const ok = (x) => x[0] !== 'f' || flora[x].sp.length;
  const E = enlaces.filter(e => ok(e[0]) && ok(e[1]));
  for (const f of Object.keys(flora)) if (!flora[f].sp.length) delete flora[f];
  const out = {
    fuente: URL + ' — Red de Interacciones Bióticas de Kennedy (nodos iNaturalist y censo SIGAU)',
    tipos: TIPO.map(x => ({ id: x.id, n: fix(x.name), c: x.color })),
    especies: Object.fromEntries(Object.entries(nodo).map(([k, i]) => [k, { nodo: i, n: fix(F[i].name), sci: F[i].sciname, cat: F[i].cat, rol: fix(F[i].role || '') }])),
    flora, enlaces: E
  };
  fs.writeFileSync(path.join(RAIZ, 'data3d', 'biotica.json'), JSON.stringify(out));
  const porTipo = {}; E.forEach(e => porTipo[out.tipos[e[2]].n] = (porTipo[out.tipos[e[2]].n] || 0) + 1);
  console.log('especies', Object.keys(nodo).length, '· flora anclada', Object.keys(flora).length, '(sin árbol censado', sinArbol, ') · enlaces', E.length);
  console.log(porTipo);
  console.log(Object.entries(nodo).map(([k, i]) => k + '=' + fix(F[i].name)).join(' · '));
})();
