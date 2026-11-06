/* ============ RED DE INTERACCIONES BIÓTICAS EN EL TERRITORIO (modo Kennedy) ============
   Red: data3d/biotica.json (tools/biotica_build.js), sacada de la "Red de Interacciones Bióticas de Kennedy"
   (anasoficasca-code.github.io/humedalburro): especies, tipos de interacción con sus colores y sus aristas actor -> objetivo.
   La flora se ancla a los árboles reales del censo SIGAU (data3d/trees.json).

   Movimiento (documentos Ecosystem_ABM_Architecture_v6):
   - aves de percha (copetón, mirla, monjita, chamón, torcaza, cucarachero): ciclo posado ⇄ vuelo; al despegar reclutan a las
     vecinas de su especie (bandada) y vuelan con repulsión entre vecinas (zona de repulsión de Couzin 2002) hacia un árbol de
     una especie con la que tienen relación en la red (atracción si el signo es +, regla de dirección S[i][j]).
   - colibrí: forrajeador floral de lugar central (clase F9): vuelo rápido, cernido en la flor durante el tiempo de manipulación
     y cambio de parche (teorema del valor marginal: se va cuando la flor se agota).
   - pato y focha: aves en balsa (clase A5): repulsión, alineación y atracción entre vecinas; el pato alterna balsa ⇄ buceo.
   - tingua: caminata correlacionada por la orilla (2,5D) con pausas de forrajeo.  Garzas: vadeo lento con esperas y vuelo al
     dormidero en árboles (anidamiento de dosel).
   - rapaces: planeo en círculos y picada sobre la presa (persecución dirigida, Lin & Abaid 2013); la presa huye (alarma -> escape).
   - mamíferos, reptiles: caminata correlacionada con atractor de ámbito hogareño (clase L8); la comadreja persigue roedores y ranas.
   - rana: saltos cortos en la orilla.  Caracol: casi inmóvil.
   Red realizada: cuando un agente encuentra a otro agente o a un árbol de una especie con la que tiene relación en la red,
   se dibuja la arista (color del tipo de interacción) y la línea sigue a los dos mientras dure el encuentro. */

const SVG = { // íconos de los tipos de interacción (mismo orden que la red)
  0: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  1: '<path d="M5 19c0-8 6-14 15-14-1 9-6 15-14 15"/><path d="M5 19 14 10"/>',
  2: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 15c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
  3: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a2 2 0 0 0-2.8 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5 5 0 0 1 6 .8L21 7"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
  4: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  5: '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5c0-3 1-5.5 0-6.5-1 1 0 3.5 0 6.5M14.5 12c3 0 5.5 1 6.5 0-1-1-3.5 0-6.5 0M12 14.5c0 3-1 5.5 0 6.5 1-1 0-3.5 0-6.5M9.5 12c-3 0-5.5-1-6.5 0 1 1 3.5 0 6.5 0"/>',
  6: '<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z"/>',
  7: '<path d="M8 8a4 4 0 1 1 8 0v6a4 4 0 1 1-8 0z"/><path d="M4 10h4M16 10h4M4 16h4M16 16h4M12 4V2"/>',
  8: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>'
};
const CAT = [ // convenciones taxonómicas de la red (CAT_META de la página)
  { n: 'Flora y arbolado', c: '#84A48B' }, { n: 'Aves', c: '#7DA0B8' }, { n: 'Mamíferos', c: '#D9A066' },
  { n: 'Moluscos', c: '#C98A94' }, { n: 'Anfibios', c: '#6B9080' }, { n: 'Reptiles', c: '#A386A9' },
  { n: 'Insectos', c: '#D9B84A' }, { n: 'Lombrices (suelo)', c: '#B87C8C' } // ya estaban en el simulador (huertas P4); no están en la red de humedalburro
];
const AGREGADA = ' — relación agregada para el simulador (no está en la red de humedalburro)';

/* ---------- catálogo: nombre, forma 3D, movimiento y cuántos hay en El Burro (La Vaca y Techo tienen menos) ---------- */
const ESP = {
  tingua: { n: 'Tingua moteada', mov: 'orilla', cant: 8, v: 0.35, ave: { len: 0.22, alto: 0.07, cuello: 0.035, ang: 0.6, hs: 0.85, picoL: 0.035, c: '#5b4430', cb: '#3d3a38', ch: '#2c2a29', cp: '#e8c22a', cl: '#b8a93b', colaAng: 0.6, motas: '#e9e4d8', span: 0.42 } },
  garza: { n: 'Garza blanca', mov: 'vadea', cant: 6, v: 0.15, ave: { len: 0.5, alto: 0.5, cuello: 0.42, ang: 1.15, hs: 0.5, picoL: 0.13, c: '#f6f6f2', cb: '#f6f6f2', ch: '#f6f6f2', cp: '#e8b923', cl: '#1b1b1b', colaAng: -0.2, span: 1.45, flapF: 2.2 } },
  garzaNoc: { n: 'Garza nocturna', mov: 'vadea', cant: 3, v: 0.12, perchar: 0.7, ave: { len: 0.44, alto: 0.2, cuello: 0.07, ang: 0.5, hs: 0.95, picoL: 0.08, c: '#9aa4ad', cb: '#eef0f1', ch: '#1e2a33', cp: '#202020', cl: '#d8c24a', colaAng: -0.1, span: 1.1, flapF: 2.6 } },
  pato: { n: 'Pato andino', mov: 'nada', cant: 10, v: 0.32, bucea: true, ave: { len: 0.36, alto: 0, flota: true, cuello: 0.04, ang: 0.9, hs: 0.95, picoL: 0.05, picoAncho: true, c: '#8a3a1c', cb: '#8a3a1c', ch: '#151515', cp: '#3b82f6', cl: '#333', colaAng: 0.9, colaRigida: true, span: 0.62 } },
  focha: { n: 'Focha común', mov: 'nada', cant: 6, v: 0.28, ave: { len: 0.36, alto: 0, flota: true, cuello: 0.06, ang: 0.9, hs: 0.9, picoL: 0.04, c: '#202225', cb: '#202225', ch: '#16171a', cp: '#f3f3f0', escudo: true, cl: '#5f7f3a', colaAng: 0.3, span: 0.66 } },
  monjita: { n: 'Monjita bogotana', mov: 'vuela', cant: 14, v: 7, junco: 0.5, ave: { len: 0.18, alto: 0.03, cuello: 0.02, ang: 0.7, hs: 1, picoL: 0.03, c: '#121212', cb: '#121212', ch: '#f2c418', cp: '#111', cl: '#111', colaAng: -0.1, span: 0.3 } },
  copeton: { n: 'Copetón', mov: 'vuela', cant: 14, v: 7, suelo: 0.35, ave: { len: 0.14, alto: 0.025, cuello: 0.015, ang: 0.7, hs: 1.05, picoL: 0.018, c: '#8b6a45', cb: '#d9d0c1', ch: '#6a6a6a', cp: '#4b4b4b', cl: '#8a7a6a', copete: '#5c5c5c', collar: '#a4552c', colaAng: 0.1, span: 0.22 } },
  mirla: { n: 'Mirla patiamarilla', mov: 'vuela', cant: 8, v: 8, suelo: 0.4, ave: { len: 0.3, alto: 0.06, cuello: 0.03, ang: 0.7, hs: 0.95, picoL: 0.035, c: '#3b3630', cb: '#4b453f', ch: '#3b3630', cp: '#f08a1a', cl: '#f08a1a', colaAng: 0, span: 0.46 } },
  colibri: { n: 'Colibrí chillón', mov: 'colibri', cant: 6, v: 9, ave: { len: 0.12, alto: 0, cuello: 0.01, ang: 0.4, hs: 1.05, picoL: 0.03, picoFino: true, c: '#2f9e6b', cb: '#2f9e6b', ch: '#3b6fd5', cp: '#111', cl: '#111', colaAng: -0.25, span: 0.14, flapF: 45, alaFina: true } },
  chamon: { n: 'Chamón', mov: 'vuela', cant: 5, v: 7, suelo: 0.3, ave: { len: 0.19, alto: 0.03, cuello: 0.02, ang: 0.7, hs: 1, picoL: 0.022, c: '#1d1631', cb: '#1d1631', ch: '#241a3d', cp: '#111', cl: '#111', colaAng: 0, span: 0.32 } },
  torcaza: { n: 'Torcaza', mov: 'vuela', cant: 10, v: 9, suelo: 0.45, posa: [25, 70], ave: { len: 0.24, alto: 0.03, cuello: 0.03, ang: 0.6, hs: 0.72, picoL: 0.015, c: '#9b8b7c', cb: '#b9a99a', ch: '#a99c8f', cp: '#2b2b2b', cl: '#c57a7a', colaAng: -0.05, colaL: 1.4, span: 0.42 } },
  cucarachero: { n: 'Cucarachero', mov: 'vuela', cant: 6, v: 6, suelo: 0.2, ave: { len: 0.11, alto: 0.02, cuello: 0.012, ang: 0.6, hs: 1.05, picoL: 0.016, c: '#8b6a48', cb: '#c9b291', ch: '#8b6a48', cp: '#3b3b3b', cl: '#9b8b77', colaAng: 1.0, span: 0.16 } },
  cernicalo: { n: 'Cernícalo', mov: 'rapaz', cant: 1, v: 9, alt: [32, 50], ave: { len: 0.27, alto: 0.04, cuello: 0.02, ang: 0.6, hs: 1, picoL: 0.018, c: '#b5643a', cb: '#efe2cf', ch: '#7d8fa8', cp: '#3a3a3a', cl: '#e3b23c', colaAng: -0.05, span: 0.58, alaColor: '#7d8fa8', alaPunta: true } },
  buho: { n: 'Búho sabanero', mov: 'rapaz', cant: 1, v: 6, alt: [14, 24], ave: { len: 0.34, alto: 0.05, cuello: 0.02, ang: 0.9, hs: 1.3, picoL: 0.012, c: '#c29a5e', cb: '#e3cfa6', ch: '#c29a5e', cp: '#2b2b2b', cl: '#e3cfa6', disco: '#efe1c4', colaAng: -0.05, span: 1.0, flapF: 2.4 } },
  abeja: { n: 'Abeja de miel', sci: 'Apis mellifera', cat: 6, mov: 'abeja', cant: 0, v: 6, cuerpo: 'abeja', alas: { len: 0.015, span: 0.024, c: '#e6edf5', alaFina: true, alto: 0, flapF: 30 } },
  lombriz: { n: 'Lombriz roja', sci: 'Eisenia fetida', cat: 7, mov: 'lombriz', cant: 0, v: 0.004, cuerpo: 'lombriz', esc: 7 },
  curi: { n: 'Curí', mov: 'suelo', cant: 8, v: 0.5, cuerpo: 'curi' },
  comadreja: { n: 'Comadreja', mov: 'suelo', cant: 2, v: 1.1, caza: 3.2, cuerpo: 'comadreja' },
  rata: { n: 'Rata parda', mov: 'suelo', cant: 6, v: 0.7, cuerpo: 'rata' },
  rana: { n: 'Rana sabanera', mov: 'rana', cant: 14, v: 0, cuerpo: 'rana' },
  culebra: { n: 'Serpiente sabanera', mov: 'suelo', cant: 3, v: 0.15, cuerpo: 'culebra' },
  lagartija: { n: 'Lagartija bogotana', mov: 'suelo', cant: 6, v: 0.35, cuerpo: 'lagartija' },
  caracol: { n: 'Caracol de jardín', mov: 'caracol', cant: 10, v: 0.004, cuerpo: 'caracol' }
};
const POR_HUMEDAL = { 'Humedal El Burro': 1, 'Humedal La Vaca': 0.6, 'Humedal de Techo': 0.45 };
// zonas verdes (parques de data3d/parques.json): individuos por parque de tamaño medio (las especies de agua solo van en los humedales)
const POR_HUERTA = { abeja: 10, lombriz: 6, copeton: 3, mirla: 2, colibri: 1 }; // por huerta (P4)
const POR_PARQUE = { abeja: 1.2, lombriz: 0.6, copeton: 3, mirla: 1.6, torcaza: 2.2, colibri: 1, chamon: 0.6, cucarachero: 1, rata: 0.8, lagartija: 0.8, caracol: 1.4, culebra: 0.25, curi: 0.3, comadreja: 0.12, cernicalo: 0.05, buho: 0.04 };
// conexiones: con quién se une cada animal (individuo más cercano de cada especie relacionada en la red, y árbol relacionado)
const R_RED = 220, R_RAPAZ = 420, R_ARBOL = 90, CERCA = 18;

export async function iniciarBiotica({ THREE, T3, lw, OX, OZ, Y0 = 2.0, movil = false, huertas = null }) {
  const [{ LineSegments2 }, { LineSegmentsGeometry }, { LineMaterial }] = await Promise.all([import('three/addons/lines/LineSegments2.js'), import('three/addons/lines/LineSegmentsGeometry.js'), import('three/addons/lines/LineMaterial.js')]);
  const [D, B, TR, PQ] = await Promise.all(['data3d/giro_sim.json', 'data3d/biotica.json?v=2', 'data3d/trees.json', 'data3d/parques.json'].map(u => fetch(u).then(r => r.json())));
  const rnd = Math.random, gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
  const TIPOS = B.tipos, COLT = TIPOS.map(t => new THREE.Color(t.c));
  const GY = Y0; // suelo y lámina de agua en el marco de la maqueta (el mismo de las personas de la simulación)

  /* ---------- relaciones de la red por especie ---------- */
  const REL = {}; for (const k of Object.keys(ESP)) REL[k] = { flora: new Map(), fauna: [] };
  for (const [a, b, t, r] of B.enlaces) {
    if (ESP[a] && b[0] === 'f') REL[a].flora.set(b, { t, r, rol: 'a' });
    else if (ESP[b] && a[0] === 'f') REL[b].flora.set(a, { t, r, rol: 'b' });
    else if (ESP[a] && ESP[b]) { REL[a].fauna.push({ o: b, t, r, rol: 'a' }); REL[b].fauna.push({ o: a, t, r, rol: 'b' }); }
  }
  for (const k of Object.keys(ESP)) if (B.especies[k]) Object.assign(ESP[k], { sci: B.especies[k].sci, cat: B.especies[k].cat, nRed: B.especies[k].n });
  // abeja y lombriz (ya estaban en el simulador): relaciones agregadas a partir de las de la red
  for (const [f, r] of REL.colibri.flora) if (r.t === 5) REL.abeja.flora.set(f, { t: 5, r: 'Visita floral y polinización de ' + B.flora[f].n + ' por abejas' + AGREGADA, rol: 'a' });
  const par = (a, b, t, r) => { REL[a].fauna.push({ o: b, t, r: r + AGREGADA, rol: 'a' }); REL[b].fauna.push({ o: a, t, r: r + AGREGADA, rol: 'b' }); };
  par('abeja', 'colibri', 8, 'Competencia por el néctar de las mismas flores entre abejas y colibríes');
  par('mirla', 'lombriz', 0, 'La mirla busca y se come lombrices en el suelo de huertas y prados');
  par('cucarachero', 'abeja', 0, 'El cucarachero caza insectos en vuelo, entre ellos abejas');
  par('tingua', 'lombriz', 0, 'La tingua escarba el barro de la orilla y come lombrices e invertebrados');
  const FLORA_SP = new Map(); // especie de árbol (trees.json) -> nodos de flora de la red
  for (const [fk, f] of Object.entries(B.flora)) for (const s of f.sp) { if (!FLORA_SP.has(s)) FLORA_SP.set(s, []); FLORA_SP.get(s).push(fk); }

  /* ---------- humedales, árboles cercanos y su índice espacial ---------- */
  const dentro = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  const HUM = D.humedales.map(h => {
    const poly = h.poly.map(p => [p[0] + OX, p[1] + OZ]), borde = (h.borde || h.poly).map(p => [p[0] + OX, p[1] + OZ]);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    return { n: h.n, tipo: 'humedal', poly, borde, x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, ag: {}, k: POR_HUMEDAL[h.n] || 0.4 };
  });
  // zonas verdes: los parques más grandes alrededor de los humedales (hasta ~2,4 km de El Burro)
  const PAR = PQ.map(p => {
    const poly = p.pts.map(q => lw(q[0], q[1])); let a = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < poly.length; i++) { const q = poly[i], r = poly[(i + 1) % poly.length]; a += q[0] * r[1] - r[0] * q[1]; x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
    const borde = poly[0][0] === poly[poly.length - 1][0] && poly[0][1] === poly[poly.length - 1][1] ? poly : poly.concat([poly[0]]);
    return { n: p.nombre ? 'Parque ' + p.nombre.replace(/^parque\s+/i, '') : 'Zona verde', tipo: 'parque', poly, borde, x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, area: Math.abs(a) / 2, ag: {} };
  }).filter(p => p.area > 2500 && Math.hypot(p.cx - OX, p.cz - OZ) < 2400).sort((p, q) => q.area - p.area).slice(0, movil ? 30 : 55);
  for (const p of PAR) p.k = Math.max(0.35, Math.min(2.2, Math.sqrt(p.area) / 110));
  // huertas en lotes baldíos (P4 de la simulación): colmenas, lombrices y las aves que atrae la huerta
  // sitios de huerta: los de las estrategias E1 y E2 (cfg.huertas, ya en el mundo) o, sin estrategias, las huertas de giro_sim.json
  const fuenteH = huertas ? huertas.map(h => ({ n: h.id + ' · ' + h.n, poly: h.poly })) : (D.huertas || []).map(h => ({ n: h.n, poly: h.poly.map(p => [p[0] + OX, p[1] + OZ]) }));
  const HUE = fuenteH.filter(h => h.poly.length >= 3).map(h => {
    const poly = h.poly; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); cx += p[0]; cz += p[1]; }
    const borde = poly.concat([poly[0]]);
    return { n: h.n, tipo: 'huerta', poly, borde, x0, x1, z0, z1, cx: cx / poly.length, cz: cz / poly.length, ag: {}, k: 1 };
  });
  const HAB = HUM.concat(PAR, HUE);
  // árboles reales (censo SIGAU) en toda la zona, en un índice espacial único
  const CEL = 20, GRID = new Map(), gk = (i, j) => i * 100003 + j;
  for (const t of TR.t) {
    const [x, z] = lw(t[0], t[1]); if (Math.hypot(x - OX, z - OZ) > 2700) continue;
    const a = { x, z, h: Math.max(2.5, t[2]), y: GY + Math.max(2.5, t[2]) * 0.82, sp: t[3], fl: FLORA_SP.get(t[3]) || [], n: TR.sp[t[3]] };
    const g = gk(Math.floor(x / CEL), Math.floor(z / CEL)); if (!GRID.has(g)) GRID.set(g, []); GRID.get(g).push(a);
  }
  const arbolesCerca = (h, x, z, r) => { const L = [], c0 = Math.floor((x - r) / CEL), c1 = Math.floor((x + r) / CEL), r0 = Math.floor((z - r) / CEL), r1 = Math.floor((z + r) / CEL); for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) { const g = GRID.get(gk(i, j)); if (g) for (const a of g) if (Math.hypot(a.x - x, a.z - z) < r) L.push(a); } return L; };
  const puntoEn = (h) => { for (let k = 0; k < 200; k++) { const x = h.x0 + rnd() * (h.x1 - h.x0), z = h.z0 + rnd() * (h.z1 - h.z0); if (dentro(x, z, h.poly)) return [x, z]; } return [h.cx, h.cz]; };
  const puntoBorde = (h, off = 0) => { const b = h.borde, i = Math.floor(rnd() * (b.length - 1)), f = rnd(), p = [b[i][0] + (b[i + 1][0] - b[i][0]) * f, b[i][1] + (b[i + 1][1] - b[i][1]) * f]; return off ? [p[0] + gauss() * off, p[1] + gauss() * off] : p; };
  const bordeCercano = (h, x, z) => { let best = null, bd = 1e18; const b = h.borde; for (let i = 0; i < b.length - 1; i++) { const ax = b[i][0], az = b[i][1], dx = b[i + 1][0] - ax, dz = b[i + 1][1] - az, l = dx * dx + dz * dz || 1, f = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)), px = ax + dx * f, pz = az + dz * f, d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = [px, pz]; } } return [best, Math.sqrt(bd)]; };

  /* ---------- geometría de cada especie (adelante = +x, arriba = +y, metros reales) ---------- */
  const partes = [];
  const parte = (geo, col, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) => {
    const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...esc)));
    const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); partes.push(g);
  };
  const unir = () => { let n = 0; for (const g of partes) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0; for (const g of partes) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; } partes.length = 0; const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.BufferAttribute(N, 3)); r.setAttribute('color', new THREE.BufferAttribute(C, 3)); r.computeVertexNormals(); return r; };
  const S = (r = 1, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h), CIL = (r0, r1, h, s = 7) => new THREE.CylinderGeometry(r0, r1, h, s), CONO = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
  function modeloAve(p) {
    const L = p.len, yb = p.alto + L * 0.3 + (p.flota ? -L * 0.12 : 0);
    parte(S(), p.c, [0, yb, 0], [0, 0, p.flota ? 0 : -0.12], [L * 0.5, L * 0.3, L * 0.3]);
    parte(S(), p.cb, [L * 0.05, yb - L * 0.07, 0], [0, 0, -0.12], [L * 0.4, L * 0.22, L * 0.26]);
    const nx = L * 0.38 + Math.cos(p.ang) * p.cuello, ny = yb + L * 0.12 + Math.sin(p.ang) * p.cuello, hr = L * 0.17 * p.hs;
    if (p.cuello > 0.05) { // cuello en S (garzas)
      const m1 = [L * 0.4 + Math.cos(p.ang) * p.cuello * 0.25 - p.cuello * 0.12, yb + L * 0.12 + Math.sin(p.ang) * p.cuello * 0.45];
      const seg = (a, b, r) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); parte(CIL(r, r * 1.15, l), p.c, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0], [0, 0, Math.atan2(dy, dx) - Math.PI / 2]); };
      seg([L * 0.38, yb + L * 0.1], m1, L * 0.05); seg(m1, [nx, ny - hr * 0.4], L * 0.045);
    } else parte(S(), p.ch, [L * 0.36, yb + L * 0.12, 0], [0, 0, 0], [hr * 0.9, hr * 0.9, hr * 0.85]);
    parte(S(), p.ch, [nx, ny, 0], [0, 0, 0], [hr, hr * 0.95, hr * 0.92]);
    const pc = p.picoAncho ? [p.picoL, hr * 0.28, hr * 0.62] : null;
    if (pc) parte(S(), p.cp, [nx + hr * 0.75 + p.picoL * 0.4, ny - hr * 0.25, 0], [0, 0, -0.15], [pc[0] * 0.6, pc[1], pc[2]]);
    else parte(CONO(p.picoFino ? hr * 0.12 : hr * 0.3, p.picoL, 6), p.cp, [nx + hr * 0.8 + p.picoL / 2, ny - hr * 0.1, 0], [0, 0, -Math.PI / 2 - (p.picoFino ? 0 : 0.12)]);
    if (p.escudo) parte(S(), p.cp, [nx + hr * 0.6, ny + hr * 0.35, 0], [0, 0, 0], [hr * 0.35, hr * 0.45, hr * 0.3]);
    if (p.disco) parte(S(), p.disco, [nx + hr * 0.55, ny, 0], [0, 0, 0], [hr * 0.45, hr * 0.85, hr * 0.85]);
    if (p.disco || p.alaPunta) for (const s of [-1, 1]) parte(S(0.5), p.disco ? '#f2c230' : '#2a2a2a', [nx + hr * 0.82, ny + hr * 0.2, s * hr * 0.42], [0, 0, 0], [hr * 0.22, hr * 0.22, hr * 0.22]);
    if (p.copete) parte(CONO(hr * 0.35, hr * 0.9, 6), p.copete, [nx - hr * 0.3, ny + hr * 0.95, 0], [0, 0, 0.5]);
    if (p.collar) parte(new THREE.TorusGeometry(hr * 0.8, hr * 0.22, 5, 10), p.collar, [nx - hr * 0.5, ny - hr * 0.75, 0], [0, Math.PI / 2, 0.5]);
    if (p.motas) for (let k = 0; k < 6; k++) parte(S(0.5, 5, 4), p.motas, [-L * 0.15 + k * L * 0.05, yb + L * 0.05 * ((k % 2) - 0.3), (k % 2 ? 1 : -1) * L * 0.285], [0, 0, 0], [L * 0.022, L * 0.022, L * 0.012]);
    const cl = L * 0.4 * (p.colaL || 1);
    parte(new THREE.BoxGeometry(cl, L * 0.035, L * (p.colaRigida ? 0.16 : 0.22)), p.colaRigida ? '#141414' : p.c, [-L * 0.48 - Math.cos(p.colaAng) * cl * 0.45, yb + Math.sin(p.colaAng) * cl * 0.45, 0], [0, 0, -p.colaAng]);
    if (p.alto > 0.01) for (const s of [-1, 1]) { parte(CIL(L * 0.018, L * 0.014, p.alto + L * 0.08, 5), p.cl, [L * 0.02, (p.alto + L * 0.08) / 2, s * L * 0.08]); parte(new THREE.BoxGeometry(L * 0.16, L * 0.012, L * 0.05), p.cl, [L * 0.06, 0.004, s * L * 0.08]); }
    // ala plegada (se ve posada)
    for (const s of [-1, 1]) parte(S(), p.alaColor || p.c, [-L * 0.06, yb + L * 0.06, s * L * 0.2], [0, 0, -0.12], [L * 0.38, L * 0.16, L * 0.1]);
    return unir();
  }
  function modeloAla(p) { // media ala (lado +z) con la raíz en el origen: se bate girando en x
    const L = p.len, s = p.span / 2, ch = p.alaFina ? L * 0.22 : L * (p.alaPunta ? 0.32 : 0.42);
    parte(S(), p.alaColor || p.c, [0, 0, s * 0.5], [0, p.alaPunta ? -0.35 : 0, 0], [ch, L * 0.025, s * 0.5]);
    if (p.alaPunta) parte(CONO(ch * 0.6, s * 0.45, 5), p.alaColor, [-ch * 0.5, 0, s * 0.95], [Math.PI / 2, 0, 0.5], [1, 1, 0.15]);
    return unir();
  }
  function modeloOtro(t) {
    if (t === 'curi') { parte(S(), '#7a5c3b', [0, 0.065, 0], [0, 0, 0], [0.13, 0.065, 0.075]); parte(S(), '#6e5234', [0.12, 0.08, 0], [0, 0, 0], [0.055, 0.048, 0.045]); for (const s of [-1, 1]) { parte(S(0.5), '#c49a7a', [0.11, 0.125, s * 0.03], [0, 0, 0], [0.012, 0.014, 0.008]); parte(S(0.5), '#111', [0.155, 0.095, s * 0.03], [0, 0, 0], [0.008, 0.008, 0.008]); } parte(S(0.5), '#3a2a1c', [0.175, 0.075, 0], [0, 0, 0], [0.01, 0.01, 0.012]); }
    if (t === 'rata') { parte(S(), '#6d6862', [0, 0.05, 0], [0, 0, 0], [0.11, 0.045, 0.05]); parte(CONO(0.035, 0.08, 7), '#6d6862', [0.13, 0.05, 0], [0, 0, -Math.PI / 2]); for (const s of [-1, 1]) parte(S(0.5), '#d4a5a0', [0.1, 0.085, s * 0.025], [0, 0, 0], [0.012, 0.016, 0.006]); parte(CIL(0.006, 0.003, 0.2, 5), '#c9a39a', [-0.2, 0.03, 0], [0, 0, Math.PI / 2 - 0.15]); }
    if (t === 'comadreja') { parte(CIL(0.032, 0.032, 0.26, 8), '#7a4a26', [0, 0.06, 0], [0, 0, Math.PI / 2]); parte(S(), '#e8d6b0', [0.02, 0.045, 0], [0, 0, 0], [0.11, 0.022, 0.026]); parte(S(), '#7a4a26', [0.16, 0.075, 0], [0, 0, 0], [0.045, 0.035, 0.035]); parte(S(0.5), '#f0e6d2', [0.19, 0.08, 0], [0, 0, 0], [0.03, 0.022, 0.03]); parte(CIL(0.016, 0.01, 0.14, 6), '#7a4a26', [-0.19, 0.07, 0], [0, 0, Math.PI / 2 + 0.25]); parte(S(), '#151515', [-0.26, 0.085, 0], [0, 0, 0], [0.03, 0.014, 0.014]); for (const a of [0.08, -0.08]) for (const s of [-1, 1]) parte(CIL(0.01, 0.01, 0.05, 5), '#5c3519', [a, 0.025, s * 0.024]); }
    if (t === 'rana') { parte(S(), '#5f8f3a', [0, 0.018, 0], [0, 0, 0.25], [0.026, 0.016, 0.02]); parte(S(), '#4d7a2c', [0.022, 0.024, 0], [0, 0, 0], [0.014, 0.011, 0.016]); for (const s of [-1, 1]) { parte(S(0.5), '#d8c48a', [0.025, 0.033, s * 0.009], [0, 0, 0], [0.007, 0.007, 0.007]); parte(S(), '#4d7a2c', [-0.016, 0.01, s * 0.019], [0, 0.4 * s, 0], [0.02, 0.008, 0.008]); parte(S(), '#4d7a2c', [0.016, 0.008, s * 0.015], [0, 0, 0], [0.008, 0.006, 0.006]); } parte(new THREE.BoxGeometry(0.03, 0.002, 0.004), '#3a2a1a', [0.002, 0.034, 0], [0, 0, 0.25]); }
    if (t === 'culebra') { const n = 11; for (let k = 0; k < n; k++) { const f = k / (n - 1), x = 0.22 - f * 0.44, z = Math.sin(f * 7) * 0.035; parte(S(), k ? '#3b2f28' : '#2e241f', [x, 0.012, z], [0, 0, 0], [0.026, 0.012 * (1 - f * 0.5), 0.014 * (1 - f * 0.55)]); } parte(S(), '#c9b16a', [0.1, 0.006, 0], [0, 0, 0], [0.12, 0.004, 0.008]); }
    if (t === 'lagartija') { parte(S(), '#5b4a36', [0, 0.012, 0], [0, 0, 0], [0.038, 0.01, 0.014]); parte(S(), '#4e3e2c', [0.045, 0.014, 0], [0, 0, 0], [0.016, 0.009, 0.011]); parte(CONO(0.009, 0.1, 6), '#5b4a36', [-0.085, 0.01, 0], [0, 0, Math.PI / 2]); parte(new THREE.BoxGeometry(0.07, 0.0015, 0.003), '#c8b27e', [0, 0.022, 0]); for (const a of [0.022, -0.022]) for (const s of [-1, 1]) parte(new THREE.BoxGeometry(0.006, 0.004, 0.022), '#4e3e2c', [a, 0.006, s * 0.016]); }
    if (t === 'caracol') { parte(S(), '#9a8f80', [0.008, 0.005, 0], [0, 0, 0], [0.026, 0.006, 0.008]); parte(S(), '#8b6a3e', [-0.004, 0.017, 0], [0, 0, 0], [0.015, 0.015, 0.011]); parte(new THREE.TorusGeometry(0.008, 0.0035, 5, 12), '#6e5230', [-0.004, 0.017, 0.006], [0, 0, 0]); for (const s of [-1, 1]) parte(CIL(0.0012, 0.0012, 0.012, 4), '#9a8f80', [0.03, 0.012, s * 0.003], [0, 0, -0.5]); }
    if (t === 'abeja') { parte(S(), '#5a3b1c', [0.0028, 0.005, 0], [0, 0, 0], [0.0032, 0.003, 0.003]); parte(S(), '#e0a52c', [-0.0042, 0.0046, 0], [0, 0, -0.1], [0.0058, 0.0036, 0.0036]); for (const x of [-0.0028, -0.0055]) parte(S(), '#1b1712', [x, 0.0047, 0], [0, 0, -0.1], [0.0011, 0.0038, 0.0038]); parte(S(), '#1b1712', [0.0068, 0.0052, 0], [0, 0, 0], [0.0022, 0.0022, 0.0024]); for (const s of [-1, 1]) parte(CIL(0.0003, 0.0003, 0.004, 4), '#1b1712', [0.0085, 0.0068, s * 0.0012], [0, 0, -0.9]); }
    if (t === 'lombriz') { const n = 12; for (let k = 0; k < n; k++) { const f = k / (n - 1), x = 0.04 - f * 0.08, z = Math.sin(f * 6) * 0.006; parte(S(), k === 3 || k === 4 ? '#d98a8a' : '#b04a5c', [x, 0.0025, z], [0, 0, 0], [0.0045, 0.0025 * (1 - f * 0.3), 0.003 * (1 - f * 0.3)]); } }
    return unir();
  }
  const largo = (k) => { const e = ESP[k]; if (e.ave) return e.ave.len * 1.4 + (e.ave.alto || 0); return { curi: 0.25, comadreja: 0.45, rata: 0.4, rana: 0.05, culebra: 0.45, lagartija: 0.17, caracol: 0.04, abeja: 0.015, lombriz: 0.08 }[e.cuerpo]; };
  // escala de maqueta: los animales se agrandan para verse desde la vista general (los pequeños más), sin pasar de ~1,2 m
  const escala = (k) => ESP[k].esc || Math.min(16, Math.max(3.2, 1.4 / largo(k)));

  /* ---------- agentes ---------- */
  const AG = [], POR = {}; let id = 0;
  const redondeo = (v) => Math.floor(v) + (rnd() < v % 1 ? 1 : 0); // reparto sin sesgo de fracciones
  const nPor = (k, h) => h.tipo === 'huerta' ? redondeo((POR_HUERTA[k] || 0) * (movil ? 0.5 : 1)) : h.tipo === 'parque' ? redondeo((POR_PARQUE[k] || 0) * h.k * (movil ? 0.45 : 1))
    : Math.max(ESP[k].mov === 'rapaz' ? (h.k >= 1 ? 1 : 0) : 1, Math.round(ESP[k].cant * h.k * (movil ? 0.5 : 1)));
  for (const h of HAB) for (const k of Object.keys(ESP)) {
    const e = ESP[k]; if (!POR[k]) POR[k] = []; if (!h.ag[k]) h.ag[k] = [];
    const parque = h.tipo !== 'humedal';
    for (let i = 0; i < nPor(k, h); i++) {
      let p, y = GY;
      if (e.mov === 'abeja') { p = h.tipo === 'humedal' ? puntoBorde(h, 12) : [h.cx + gauss() * 3, h.cz + gauss() * 3]; y = GY + 1; } // colmena
      else if (e.mov === 'lombriz') p = parque ? puntoEn(h) : puntoBorde(h, 4);
      else if (e.mov === 'nada' || e.mov === 'vadea') p = puntoEn(h);
      else if (parque && (e.mov === 'suelo' || e.mov === 'caracol')) p = puntoEn(h);
      else if (e.mov === 'orilla' || e.mov === 'rana' || e.mov === 'caracol') p = puntoBorde(h, e.mov === 'orilla' ? 6 : 3);
      else if (e.mov === 'suelo') p = puntoBorde(h, 25);
      else if (e.mov === 'rapaz') { p = [h.cx + gauss() * 60, h.cz + gauss() * 60]; y = GY + e.alt[0] + rnd() * (e.alt[1] - e.alt[0]); }
      else { const L = arbolesCerca(h, h.cx, h.cz, Math.max(60, Math.hypot(h.x1 - h.x0, h.z1 - h.z0) / 2)), a = L.length ? L[Math.floor(rnd() * L.length)] : null; p = a ? [a.x, a.z] : puntoEn(h); y = a ? a.y : GY; }
      const a = { id: id++, e: k, h, x: p[0], y, z: p[1], rot: rnd() * 6.28, pitch: 0, st: 'quieto', t: rnd() * 6, vis: true, flap: rnd() * 6.28, vel: 0, links: [], hx: p[0], hz: p[1], ang: rnd() * 6.28, ev: 0 };
      if (e.mov === 'rapaz') Object.assign(a, { st: 'planea', cx: a.x, cz: a.z, rad: 60 + rnd() * 60, alt: a.y - GY, w: (rnd() < 0.5 ? 1 : -1) * e.v / 90 });
      if (e.mov === 'vuela' || e.mov === 'colibri') a.st = 'posado';
      if (e.mov === 'abeja') Object.assign(a, { st: 'colmena', t: rnd() * 25, colmena: [p[0], p[1]], vis: false });
      AG.push(a); POR[k].push(a); h.ag[k].push(a);
    }
  }
  // índice espacial de los animales por especie (celdas de 100 m), para unir cada uno con el más cercano de cada especie relacionada
  const CA = 100; let GA = new Map();
  const indexar = () => { GA = new Map(); for (const a of AG) { if (!a.vis) continue; const g = a.e + ':' + gk(Math.floor(a.x / CA), Math.floor(a.z / CA)); let L = GA.get(g); if (!L) GA.set(g, L = []); L.push(a); } };
  const masCercano = (k, x, z, R, no) => { let best = null, bd = R; const c0 = Math.floor((x - R) / CA), c1 = Math.floor((x + R) / CA), r0 = Math.floor((z - R) / CA), r1 = Math.floor((z + R) / CA); for (let i = c0; i <= c1; i++) for (let j = r0; j <= r1; j++) { const L = GA.get(k + ':' + gk(i, j)); if (L) for (const b of L) { if (b === no) continue; const d = Math.hypot(b.x - x, b.z - z); if (d < bd) { bd = d; best = b; } } } return best ? [best, bd] : null; };

  /* ---------- mallas instanciadas (cuerpo y alas) ---------- */
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, side: THREE.DoubleSide });
  const MAL = {}, GEO = {};
  const grupo = new THREE.Group(); grupo.name = 'biotica'; T3.scene.add(grupo);
  for (const k of Object.keys(ESP)) {
    const e = ESP[k], n = POR[k].length; if (!n) continue;
    GEO[k] = e.ave ? modeloAve(e.ave) : modeloOtro(e.cuerpo);
    const cu = new THREE.InstancedMesh(GEO[k], mat, n); cu.frustumCulled = false; cu.castShadow = !movil; cu.instanceMatrix.setUsage(THREE.DynamicDrawUsage); grupo.add(cu);
    let al = null; if (e.ave || e.alas) { al = new THREE.InstancedMesh(modeloAla(e.ave || e.alas), mat, n * 2); al.frustumCulled = false; al.instanceMatrix.setUsage(THREE.DynamicDrawUsage); grupo.add(al); }
    MAL[k] = { cu, al, s: escala(k) };
  }

  /* ---------- movimiento ---------- */
  const girarA = (a, dx, dz, dt, max = 4) => { if (dx * dx + dz * dz < 1e-8) return; const obj = Math.atan2(-dz, dx); let d = ((obj - a.rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI; d = Math.max(-max * dt, Math.min(max * dt, d)); a.rot += d; };
  const alPunto = (a, x, z, v, dt) => { const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz); if (d < 1e-3) return true; const s = Math.min(d, v * dt); a.x += dx / d * s; a.z += dz / d * s; girarA(a, dx, dz, dt, 6); a.vel = v; return d <= v * dt + 0.05; };
  const vuelo = (a, x1, y1, z1, v, arco) => { y1 = Math.max(GY, y1); const d = Math.hypot(x1 - a.x, z1 - a.z); a.st = 'vuelo'; a.f = { x0: a.x, y0: a.y, z0: a.z, x1, y1, z1, d: Math.max(1, d), s: 0, v, arco: arco ?? Math.min(18, 3 + d * 0.12), off: gauss() * 0.4 }; };
  const alcanzables = (a, R) => { const h = a.h, L = []; for (const t of arbolesCerca(h, a.x, a.z, R)) if (t.fl.some(f => REL[a.e].flora.has(f))) L.push(t); return L; };
  const huir = (a, de, t = 4) => { a.huye = { x: de.x, z: de.z, t }; };
  function elegirPercha(a) {
    const e = ESP[a.e], h = a.h;
    const cercaDe = (r, enAgua) => { for (let k = 0; k < 30; k++) { const x = a.x + gauss() * r, z = a.z + gauss() * r; if (dentro(x, z, h.poly) === enAgua) return [x, z]; } return enAgua ? puntoEn(h) : bordeCercano(h, a.x, a.z)[0]; };
    if (e.junco && rnd() < e.junco) { const p = cercaDe(35, true); return [p[0], GY + 1.4, p[1], null]; } // juncal cercano (monjita)
    if (e.suelo && rnd() < e.suelo) { const p = cercaDe(25, h.tipo === 'parque'); return [p[0], GY, p[1], null]; } // forrajeo en el pasto, cerca (en el parque: dentro)
    // atracción por la red: árbol de una especie con la que tiene relación (polinización, dispersión, nidificación…)
    let L = alcanzables(a, 140); if (!L.length || rnd() < 0.2) L = arbolesCerca(h, a.x, a.z, 90);
    if (!L.length) L = arbolesCerca(h, a.x, a.z, 250); if (!L.length) { const p = puntoEn(h); return [p[0], GY, p[1], null]; }
    const t = L[Math.floor(rnd() * L.length)]; return [t.x + gauss() * 1.2, t.y + gauss() * 0.4, t.z + gauss() * 1.2, t];
  }
  function moverAve(a, dt) { // vuelo de posado a posado; bandada al despegar
    const e = ESP[a.e];
    if (a.st === 'posado') {
      a.vel = 0; if (a.huye) { a.t = 0; }
      if ((a.t -= dt) > 0) { if (rnd() < dt * 0.3) a.rot += gauss() * 0.8; return; }
      const [x, y, z, t] = elegirPercha(a); a.arb = t; vuelo(a, x, y, z, e.v * (0.85 + rnd() * 0.3));
      for (const b of a.h.ag[a.e]) if (b !== a && b.st === 'posado' && Math.hypot(b.x - a.x, b.z - a.z) < 22 && rnd() < 0.65) { b.arb = t; b.t = 0; const o = 3 + rnd() * 3; vuelo(b, x + gauss() * o, y + gauss() * 0.5, z + gauss() * o, a.f.v * (0.9 + rnd() * 0.2)); b.f.retraso = rnd() * 0.8; }
      return;
    }
    const f = a.f; if (f.retraso > 0) { f.retraso -= dt; return; }
    f.s += f.v * dt; const u = Math.min(1, f.s / f.d), px = a.x, pz = a.z;
    a.x = f.x0 + (f.x1 - f.x0) * u; a.z = f.z0 + (f.z1 - f.z0) * u; a.y = f.y0 + (f.y1 - f.y0) * u + Math.sin(Math.PI * u) * f.arco;
    for (const b of a.h.ag[a.e]) if (b !== a && b.st === 'vuelo') { const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 1.6 && d > 1e-3) { a.x += dx / d * (1.6 - d) * 0.5; a.z += dz / d * (1.6 - d) * 0.5; } } // zona de repulsión
    girarA(a, a.x - px, a.z - pz, dt, 8); a.vel = f.v; a.pitch = Math.cos(Math.PI * u) * Math.min(0.5, f.arco / f.d * 2);
    if (u >= 1) { a.st = 'posado'; a.pitch = 0; const r = e.posa || [12, 40]; a.t = r[0] + rnd() * (r[1] - r[0]); }
  }
  function moverColibri(a, dt) { // forrajeador floral de lugar central
    if (a.st === 'posado' || a.st === 'liba') {
      a.vel = 0; if (a.arb) { a.x = a.arb.x + Math.cos(a.ang) * 1.3 + Math.sin(a.flap * 0.05) * 0.15; a.z = a.arb.z + Math.sin(a.ang) * 1.3; a.y = a.arb.y - 0.4 + Math.sin(a.flap * 0.03) * 0.12; a.rot = Math.atan2(Math.sin(a.ang), -Math.cos(a.ang)); }
      if ((a.t -= dt) > 0) return;
      let L = alcanzables(a, 150).filter(t => t !== a.arb); if (!L.length) L = arbolesCerca(a.h, a.x, a.z, 120);
      if (!L.length) { a.t = 3; return; }
      L.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z)); const t = L[Math.floor(rnd() * Math.min(5, L.length))];
      a.arb = t; a.ang = rnd() * 6.28; vuelo(a, t.x + Math.cos(a.ang) * 1.3, t.y - 0.4, t.z + Math.sin(a.ang) * 1.3, ESP.colibri.v, 1.5 + rnd() * 2); return;
    }
    const f = a.f; f.s += f.v * dt; const u = Math.min(1, f.s / f.d), px = a.x, pz = a.z;
    a.x = f.x0 + (f.x1 - f.x0) * u; a.z = f.z0 + (f.z1 - f.z0) * u; a.y = f.y0 + (f.y1 - f.y0) * u + Math.sin(Math.PI * u) * f.arco; girarA(a, a.x - px, a.z - pz, dt, 14); a.vel = f.v;
    if (u >= 1) { a.st = 'liba'; a.t = 3 + rnd() * 5; a.ev++; } // tiempo de manipulación en la flor
  }
  function moverNada(a, dt) { // balsa: repulsión, alineación y atracción entre vecinas
    const e = ESP[a.e];
    if (a.st === 'buceo') { a.vis = false; if ((a.t -= dt) <= 0) { a.st = 'quieto'; a.vis = true; a.t = 10 + rnd() * 30; } return; }
    if (e.bucea && !a.huye && rnd() < dt * 0.012) { a.st = 'buceo'; a.t = 6 + rnd() * 10; return; }
    let rx = 0, rz = 0, ox = 0, oz = 0, cx = 0, cz = 0, n = 0;
    for (const b of a.h.ag[a.e]) { if (b === a || !b.vis) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 1.4 && d > 1e-3) { rx -= dx / d; rz -= dz / d; } else if (d < 9) { ox += Math.cos(b.rot); oz -= Math.sin(b.rot); } else if (d < 30) { cx += dx / d; cz += dz / d; n++; } }
    let vx, vz; a.ang += gauss() * 0.4 * dt; vx = Math.cos(a.ang) * 0.6; vz = Math.sin(a.ang) * 0.6;
    if (rx || rz) { vx += rx * 2; vz += rz * 2; } else { vx += ox * 0.25 + cx * 0.5; vz += oz * 0.25 + cz * 0.5; }
    let v = e.v; if (a.huye) { vx += (a.x - a.huye.x) * 0.2; vz += (a.z - a.huye.z) * 0.2; v *= 4; }
    const l = Math.hypot(vx, vz) || 1, nx = a.x + vx / l * v * dt, nz = a.z + vz / l * v * dt;
    if (dentro(nx, nz, a.h.poly)) { a.x = nx; a.z = nz; girarA(a, vx, vz, dt, 2); a.vel = v; } else { a.ang += Math.PI * (0.5 + rnd() * 0.5); }
    a.y = GY - 0.02 + Math.sin(a.flap * 0.02) * 0.02;
  }
  function moverOrilla(a, dt) { // tingua: caminata correlacionada con pausas, pegada a la orilla
    const e = ESP[a.e];
    if (a.huye) { const dx = a.x - a.huye.x, dz = a.z - a.huye.z, d = Math.hypot(dx, dz) || 1, nx = a.x + dx / d * 1.6 * dt, nz = a.z + dz / d * 1.6 * dt; if (dentro(nx, nz, a.h.poly)) { a.x = nx; a.z = nz; } girarA(a, dx, dz, dt, 8); a.vel = 1.6; return; }
    if ((a.t -= dt) > 0 && a.st === 'quieto') { a.vel = 0; return; }
    if (a.st === 'quieto') { a.st = 'camina'; a.t = 3 + rnd() * 8; }
    if (a.t <= 0) { a.st = 'quieto'; a.t = 2 + rnd() * 6; return; }
    a.ang += gauss() * 1.2 * dt; let vx = Math.cos(a.ang), vz = Math.sin(a.ang);
    const [b, d] = bordeCercano(a.h, a.x, a.z); if (d > 14) { vx += (b[0] - a.x) / d * 1.5; vz += (b[1] - a.z) / d * 1.5; }
    const l = Math.hypot(vx, vz) || 1, nx = a.x + vx / l * e.v * dt, nz = a.z + vz / l * e.v * dt;
    if (dentro(nx, nz, a.h.poly)) { a.x = nx; a.z = nz; girarA(a, vx, vz, dt, 5); a.vel = e.v; } else a.ang += Math.PI;
    a.y = GY;
  }
  function moverVadea(a, dt) { // garzas: vadeo lento con esperas; vuelan a dormir a los árboles
    const e = ESP[a.e];
    if (a.st === 'vuelo') { moverAve(a, dt); if (a.st === 'posado') a.st = a.arb ? 'percha' : 'quieto', a.t = a.arb ? 20 + rnd() * 50 : 4 + rnd() * 10; return; }
    if (a.st === 'percha') { a.vel = 0; if ((a.t -= dt) > 0 && !a.huye) return; const p = puntoEn(a.h); a.arb = null; vuelo(a, p[0], GY, p[1], 6); return; }
    if (a.huye || rnd() < dt * (e.perchar ? 0.02 : 0.006)) { // a un árbol de la red (anidamiento de dosel / dormidero)
      let L = alcanzables(a, 280); if (!L.length) L = arbolesCerca(a.h, a.x, a.z, 200);
      if (L.length) { const t = L[Math.floor(rnd() * L.length)]; a.arb = t; a.huye = null; vuelo(a, t.x, t.y + 0.3, t.z, 6, 6); return; }
    }
    if (a.st === 'quieto') { a.vel = 0; if ((a.t -= dt) > 0) return; a.st = 'camina'; a.t = 2 + rnd() * 6; a.obj = [a.x + gauss() * 6, a.z + gauss() * 6]; if (!dentro(a.obj[0], a.obj[1], a.h.poly)) a.obj = puntoEn(a.h); }
    if (a.st === 'camina') { if (alPunto(a, a.obj[0], a.obj[1], e.v, dt) || (a.t -= dt) <= 0) { a.st = 'quieto'; a.t = 5 + rnd() * 18; } a.y = GY; }
  }
  function moverRapaz(a, dt) { // planeo en círculos y picada sobre la presa
    const e = ESP[a.e];
    if (a.st === 'picada' && a.presa) {
      const p = a.presa, dx = p.x - a.x, dz = p.z - a.z, dy = (p.y + 0.3) - a.y, d = Math.hypot(dx, dy, dz), v = e.v * 2.2;
      if (d > 1.2 && (a.t -= dt) > 0) { a.x += dx / d * v * dt; a.y += dy / d * v * dt; a.z += dz / d * v * dt; girarA(a, dx, dz, dt, 6); a.pitch = Math.atan2(-dy, Math.hypot(dx, dz)) * -1; a.vel = v; return; }
      a.st = 'sube'; a.ev++; a.presa = null; a.t = 0;
    }
    if (a.st === 'sube') { a.y += 4 * dt; a.pitch = -0.4; if (a.y >= GY + a.alt) { a.st = 'planea'; a.pitch = 0; a.cool = 12 + rnd() * 15; } }
    a.ang += a.w * dt; const px = a.x, pz = a.z;
    a.x += (a.cx + Math.cos(a.ang) * a.rad - a.x) * Math.min(1, dt * 0.8); a.z += (a.cz + Math.sin(a.ang) * a.rad - a.z) * Math.min(1, dt * 0.8);
    if (a.st === 'planea') a.y += (GY + a.alt - a.y) * Math.min(1, dt * 0.5);
    girarA(a, a.x - px, a.z - pz, dt, 3); a.vel = e.v; a.cool = (a.cool || 0) - dt;
    if (rnd() < dt * 0.01) { a.cx = a.h.cx + gauss() * 80; a.cz = a.h.cz + gauss() * 80; }
  }
  function moverSuelo(a, dt) { // caminata correlacionada con ámbito hogareño (clase L8)
    const e = ESP[a.e];
    if (a.huye) { const dx = a.x - a.huye.x, dz = a.z - a.huye.z, d = Math.hypot(dx, dz) || 1, v = Math.max(1.4, e.v * 3); a.x += dx / d * v * dt; a.z += dz / d * v * dt; girarA(a, dx, dz, dt, 8); a.vel = v; a.y = GY; return; }
    if (a.caza) { const p = a.caza; if (alPunto(a, p.x, p.z, e.caza, dt) || Math.hypot(p.x - a.x, p.z - a.z) > 30) { a.caza = null; a.ev++; a.st = 'quieto'; a.t = 6; } a.y = GY; return; }
    if (a.st === 'quieto') { a.vel = 0; if ((a.t -= dt) > 0) return; a.st = 'camina'; a.t = 3 + rnd() * 10; }
    a.ang += gauss() * 1.5 * dt; let vx = Math.cos(a.ang), vz = Math.sin(a.ang);
    const dh = Math.hypot(a.hx - a.x, a.hz - a.z); if (dh > 25) { vx += (a.hx - a.x) / dh * 1.2; vz += (a.hz - a.z) / dh * 1.2; }
    const l = Math.hypot(vx, vz) || 1, v = a.e === 'lagartija' && rnd() < 0.3 ? e.v * 4 : e.v;
    a.x += vx / l * v * dt; a.z += vz / l * v * dt; girarA(a, vx, vz, dt, 4); a.vel = v; a.y = GY;
    if ((a.t -= dt) <= 0) { a.st = 'quieto'; a.t = 2 + rnd() * 8; }
  }
  function moverRana(a, dt) {
    if (a.salto) { const s = a.salto; s.u += dt / 0.35; const u = Math.min(1, s.u); a.x = s.x0 + (s.x1 - s.x0) * u; a.z = s.z0 + (s.z1 - s.z0) * u; a.y = GY + Math.sin(Math.PI * u) * 0.25 * MAL.rana.s * 0.2; if (u >= 1) { a.salto = null; a.y = GY; } return; }
    if ((a.t -= dt) > 0 && !a.huye) return;
    let dx = Math.cos(a.ang), dz = Math.sin(a.ang); if (a.huye) { dx = a.x - a.huye.x; dz = a.z - a.huye.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; } else { a.ang += gauss() * 1.2; const dh = Math.hypot(a.hx - a.x, a.hz - a.z); if (dh > 6) { dx = (a.hx - a.x) / dh; dz = (a.hz - a.z) / dh; } }
    const L = 0.5 * MAL.rana.s * 0.35; a.salto = { u: 0, x0: a.x, z0: a.z, x1: a.x + dx * L, z1: a.z + dz * L }; a.rot = Math.atan2(-dz, dx); a.t = 2 + rnd() * 5;
  }
  function moverAbeja(a, dt) { // forrajeo de lugar central: colmena -> 3 a 5 flores de especies relacionadas -> colmena
    const otraFlor = () => {
      let L = alcanzables(a, 220).filter(t => t !== a.arb); if (!L.length) L = arbolesCerca(a.h, a.x, a.z, 120);
      if (!L.length) { a.vuelta = true; vuelo(a, a.colmena[0], GY + 1, a.colmena[1], 5, 2); return; }
      L.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z)); const t = L[Math.floor(rnd() * Math.min(6, L.length))];
      a.arb = t; a.ang = rnd() * 6.28; vuelo(a, t.x + Math.cos(a.ang) * 1.4, t.y - 0.3 + gauss() * 0.6, t.z + Math.sin(a.ang) * 1.4, ESP.abeja.v * (0.8 + rnd() * 0.4), 1 + rnd() * 2);
    };
    if (a.st === 'colmena') { a.vel = 0; a.vis = false; if ((a.t -= dt) > 0) return; a.vis = true; a.flores = 3 + Math.floor(rnd() * 3); otraFlor(); return; }
    if (a.st === 'liba') { a.vel = 0; if (a.arb) { a.x = a.arb.x + Math.cos(a.ang) * 1.4 + Math.sin(a.flap * 0.03) * 0.2; a.z = a.arb.z + Math.sin(a.ang) * 1.4; a.rot = Math.atan2(Math.sin(a.ang), -Math.cos(a.ang)); }
      if ((a.t -= dt) > 0) return; a.ev++; if (--a.flores <= 0) { a.vuelta = true; vuelo(a, a.colmena[0], GY + 1, a.colmena[1], ESP.abeja.v, 2.5); } else otraFlor(); return; }
    const f = a.f; f.s += f.v * dt; const u = Math.min(1, f.s / f.d), px = a.x, pz = a.z;
    a.x = f.x0 + (f.x1 - f.x0) * u + Math.sin(a.flap * 0.02) * 0.3; a.z = f.z0 + (f.z1 - f.z0) * u; a.y = f.y0 + (f.y1 - f.y0) * u + Math.sin(Math.PI * u) * f.arco; girarA(a, a.x - px, a.z - pz, dt, 14); a.vel = f.v;
    if (u >= 1) { if (a.vuelta) { a.vuelta = false; a.st = 'colmena'; a.t = 6 + rnd() * 18; a.arb = null; } else { a.st = 'liba'; a.t = 2 + rnd() * 3; } }
  }
  function moverLombriz(a, dt) { // casi quieta; a ratos se mete en la tierra y vuelve a salir
    if (rnd() < dt * 0.015) a.vis = !a.vis;
    a.ang += gauss() * 0.5 * dt; a.x += Math.cos(a.ang) * 0.004 * dt * 8; a.z += Math.sin(a.ang) * 0.004 * dt * 8; a.rot = Math.atan2(-Math.sin(a.ang), Math.cos(a.ang)); a.y = GY;
  }
  const MOV = { abeja: moverAbeja, lombriz: moverLombriz, vuela: moverAve, colibri: moverColibri, nada: moverNada, orilla: moverOrilla, vadea: moverVadea, rapaz: moverRapaz, suelo: moverSuelo, rana: moverRana, caracol: (a, dt) => { a.ang += gauss() * 0.2 * dt; a.x += Math.cos(a.ang) * 0.004 * dt; a.z += Math.sin(a.ang) * 0.004 * dt; a.rot = Math.atan2(-Math.sin(a.ang), Math.cos(a.ang)); a.y = GY; } };

  /* ---------- red de conexiones entre agentes ----------
     Cada animal se une, según la red, con el individuo más cercano de cada especie con la que tiene relación (hasta 220 m;
     rapaces 420 m) y con el árbol más cercano de cada especie de flora relacionada (hasta 90 m). Cuando están cerca
     (encuentro: ≤ 18 m, o posado en ese árbol) la interacción ocurre: la línea se ve fuerte y lleva un pulso, y hay conducta
     (persecución y huida en la depredación, el chamón sigue al hospedero). Las líneas se mueven con los animales. */
  const LINKS = new Map(); // clave -> { a, b (agente) | arbol, t, al (alfa), vivo, r, f }
  const ESTADO = { on: true, tipos: new Set(TIPOS.map(t => t.id)), sel: null };
  function conexiones(a) {
    const e = ESP[a.e], R = REL[a.e], L = [];
    if (!a.vis) return L;
    // flora: el árbol donde está (encuentro) y el más cercano de cada especie relacionada
    if (R.flora.size) {
      const mejor = new Map(); // especie de flora relacionada -> árbol más cercano (una sola pasada, sin ordenar)
      const ver = (t, d) => { for (const f of t.fl) { const r = R.flora.get(f); if (!r) continue; const m = mejor.get(f); if (!m || d < m.d) mejor.set(f, { b: t, t: r.t, f, r: r.r, d }); } };
      if (a.arb && Math.hypot(a.arb.x - a.x, a.arb.z - a.z) < 4) ver(a.arb, 0);
      for (const t of arbolesCerca(a.h, a.x, a.z, R_ARBOL)) if (t.fl.length) ver(t, Math.hypot(t.x - a.x, t.z - a.z));
      const F = [...mejor.values()].sort((p, q) => p.d - q.d); for (let i = 0; i < Math.min(2, F.length); i++) L.push(F[i]);
    }
    // fauna: el individuo más cercano de cada especie relacionada (como actor; la otra especie dibuja su lado)
    for (const r of R.fauna) {
      if (r.rol !== 'a') continue;
      const m = masCercano(r.o, a.x, a.z, e.mov === 'rapaz' ? R_RAPAZ : R_RED, a); if (!m) continue;
      const [b, d] = m; L.push({ b, t: r.t, r: r.r, d });
      if (r.t === 0) { // depredación: persecución y huida
        if (e.mov === 'rapaz' && a.st === 'planea' && (a.cool || 0) <= 0 && d < 90 && rnd() < 0.3) { a.st = 'picada'; a.presa = b; a.t = 6; }
        if (e.caza && !a.caza && d < 22) a.caza = b;
        if (d < 25 || a.presa === b) huir(b, a);
      }
      if (r.t === 7 && e.mov === 'vuela' && a.st === 'posado' && d < 40 && rnd() < 0.15) a.t = 0; // el chamón sigue al hospedero
    }
    L.sort((p, q) => p.d - q.d); return L.slice(0, 5);
  }
  let iEnc = 0, tIdx = 0;
  function actualizarRed(dt) {
    if ((tIdx -= dt) <= 0) { tIdx = 0.4; indexar(); }
    const n = Math.max(1, Math.ceil(AG.length / 40)); // cada agente rehace sus conexiones ~1,5 veces por segundo
    for (let k = 0; k < n; k++) {
      const a = AG[iEnc++ % AG.length], claves = [];
      for (const v of conexiones(a)) {
        const kb = v.b.id !== undefined ? 'a' + v.b.id : 'f' + v.b.x.toFixed(1) + v.b.z.toFixed(1), key = a.id + '|' + kb; claves.push(key);
        const L = LINKS.get(key); if (L) L.vivo = 1.6; else LINKS.set(key, { a, b: v.b, t: v.t, al: 0, vivo: 1.6, r: v.r, f: v.f });
      }
      a.links = claves;
    }
    for (const [k, L] of LINKS) { L.vivo -= dt; const meta = L.vivo > 0 && L.a.vis && (L.b.vis !== false) ? 1 : 0; L.al += (meta - L.al) * Math.min(1, dt * 3); if (L.vivo < -0.8 && L.al < 0.02) LINKS.delete(k); }
  }

  /* ---------- líneas en arco con grosor real (LineSegments2) + pulsos (del actor al objetivo) + marca de cada animal ---------- */
  const SEG = 10, MAXL = movil ? 800 : 2600;
  const capa = (ancho, opac) => { // segmentos gruesos en píxeles; se escriben en los búferes una vez por cuadro
    const g = new LineSegmentsGeometry(); g.setPositions(new Float32Array(MAXL * SEG * 6)); g.setColors(new Float32Array(MAXL * SEG * 6));
    const m = new LineMaterial({ vertexColors: true, linewidth: ancho, transparent: true, opacity: opac, depthWrite: false, fog: false, worldUnits: false });
    const o = new LineSegments2(g, m); o.frustumCulled = false; o.renderOrder = 8; grupo.add(o);
    return { g, m, o, p: g.attributes.instanceStart.data, c: g.attributes.instanceColorStart.data, n: 0 };
  };
  const FUERTE = capa(movil ? 1.5 : 1.9, 0.95), TENUE = capa(movil ? 0.9 : 1.1, 0.6); // líneas delgadas: encuentro / conexión a distancia
  const resol = () => { const v = new THREE.Vector2(); T3.renderer.getSize ? T3.renderer.getSize(v) : v.set(innerWidth, innerHeight); FUERTE.m.resolution.copy(v); TENUE.m.resolution.copy(v); };
  resol(); addEventListener('resize', resol);
  const disco = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 26, 0, 6.283); g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(8,16,26,.85)'; g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const pp = new Float32Array(MAXL * 3), pc = new Float32Array(MAXL * 4);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3).setUsage(THREE.DynamicDrawUsage)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 4).setUsage(THREE.DynamicDrawUsage));
  const pulsos = new THREE.Points(pg, new THREE.PointsMaterial({ size: movil ? 3 : 4, map: disco, alphaTest: 0.3, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
  pulsos.frustumCulled = false; pulsos.renderOrder = 9; grupo.add(pulsos);
  // marca: un punto redondo con el color de la convención del grupo encima de cada animal (se ve desde la vista general)
  const mp = new Float32Array(AG.length * 3), mc = new Float32Array(AG.length * 4);
  AG.forEach((a, i) => { const c = new THREE.Color(CAT[ESP[a.e].cat]?.c || '#7DA0B8'); mc[i * 4] = c.r; mc[i * 4 + 1] = c.g; mc[i * 4 + 2] = c.b; mc[i * 4 + 3] = 1; });
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3).setUsage(THREE.DynamicDrawUsage)); mg.setAttribute('color', new THREE.BufferAttribute(mc, 4).setUsage(THREE.DynamicDrawUsage));
  // marca de lejos: TRIÁNGULO que apunta hacia donde avanza el animal (ángulo en pantalla por animal, calculado en cada cuadro)
  const ma = new Float32Array(AG.length); mg.setAttribute('ang', new THREE.BufferAttribute(ma, 1).setUsage(THREE.DynamicDrawUsage));
  const marcas = new THREE.Points(mg, new THREE.ShaderMaterial({
    uniforms: { uTam: { value: (movil ? 12 : 14) * Math.min(2, devicePixelRatio || 1) } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float ang; attribute vec4 color; uniform float uTam; varying vec4 vC; varying float vA;
      void main(){ vC = color; vA = ang; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uTam; }`,
    fragmentShader: `varying vec4 vC; varying float vA;
      void main(){
        if (vC.a < 0.01) discard;
        vec2 q = gl_PointCoord * 2.0 - 1.0; q.y = -q.y;
        float c = cos(-vA), s = sin(-vA); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);   // punta del triángulo hacia +y local
        vec2 A = vec2(0.0, 0.92), B = vec2(-0.66, -0.72), C = vec2(0.66, -0.72);
        float e0 = (B.x - A.x) * (q.y - A.y) - (B.y - A.y) * (q.x - A.x), e1 = (C.x - B.x) * (q.y - B.y) - (C.y - B.y) * (q.x - B.x), e2 = (A.x - C.x) * (q.y - C.y) - (A.y - C.y) * (q.x - C.x);
        float d = min(min(e0 / length(B - A), e1 / length(C - B)), e2 / length(A - C)); // distancia (con signo) al borde más cercano
        if (d < 0.0) discard;                        // afuera (vértices en sentido antihorario: adentro es positivo)
        vec3 col = d < 0.16 ? vec3(0.03, 0.06, 0.1) : vC.rgb;  // borde oscuro para que se lea sobre cualquier fondo
        gl_FragColor = vec4(col, vC.a);
      }`
  }));
  marcas.frustumCulled = false; marcas.renderOrder = 10; grupo.add(marcas);
  const lineas = { set visible(v) { FUERTE.o.visible = TENUE.o.visible = v; } };
  const alto = (a) => { const e = ESP[a.e]; return (e.ave ? (e.ave.alto + e.ave.len * 0.35) : 0.06) * MAL[a.e].s; };
  const ancla = (o, out) => { if (o.id !== undefined) { out[0] = o.x; out[1] = o.y + alto(o); out[2] = o.z; } else { out[0] = o.x; out[1] = o.y; out[2] = o.z; } return out; };
  const P0 = [0, 0, 0], P1 = [0, 0, 0], Q = [0, 0, 0], Rr = [0, 0, 0], VA = new THREE.Vector3(), VB = new THREE.Vector3();
  const CUENTA = new Array(TIPOS.length).fill(0), ENC = new Array(TIPOS.length).fill(0);
  let np = 0;
  function pintar(C, A, Bv, t, pulso, tiempo) {
    if (C.n >= MAXL) return; ancla(A, P0); ancla(Bv, P1);
    const d = Math.hypot(P1[0] - P0[0], P1[2] - P0[2]), h = Math.min(45, 1.5 + d * 0.2), c = COLT[t];
    const pt = (u, o) => { o[0] = P0[0] + (P1[0] - P0[0]) * u; o[1] = P0[1] + (P1[1] - P0[1]) * u + Math.sin(Math.PI * u) * h; o[2] = P0[2] + (P1[2] - P0[2]) * u; return o; };
    const P = C.p.array, K = C.c.array;
    for (let s = 0; s < SEG; s++) {
      pt(s / SEG, Q); pt((s + 1) / SEG, Rr); const o = (C.n * SEG + s) * 6;
      P[o] = Q[0]; P[o + 1] = Q[1]; P[o + 2] = Q[2]; P[o + 3] = Rr[0]; P[o + 4] = Rr[1]; P[o + 5] = Rr[2];
      K[o] = c.r; K[o + 1] = c.g; K[o + 2] = c.b; K[o + 3] = c.r; K[o + 4] = c.g; K[o + 5] = c.b;
    }
    if (pulso && np < MAXL) { const u = ((tiempo * (0.5 + 30 / (d + 30)) * 0.5 + C.n * 0.137) % 1), o = np * 3, oc = np * 4; pt(u, Q); pp[o] = Q[0]; pp[o + 1] = Q[1]; pp[o + 2] = Q[2]; pc[oc] = Math.min(1, c.r * 1.25 + 0.12); pc[oc + 1] = Math.min(1, c.g * 1.25 + 0.12); pc[oc + 2] = Math.min(1, c.b * 1.25 + 0.12); pc[oc + 3] = 1; np++; }
    C.n++;
  }
  function dibujarRed(tiempo) {
    FUERTE.n = TENUE.n = 0; np = 0; CUENTA.fill(0); ENC.fill(0);
    const sel = ESTADO.sel;
    if (ESTADO.on) for (const L of LINKS.values()) {
      if (L.al < 0.3) continue; const d = Math.hypot(L.b.x - L.a.x, L.b.z - L.a.z), enc = d < CERCA;
      CUENTA[L.t]++; if (enc) ENC[L.t]++; if (!ESTADO.tipos.has(L.t)) continue;
      const delSel = sel && (L.a === sel || L.b === sel);
      // encuentro (la interacción está ocurriendo) o del animal elegido: trazo grueso con pulso; conexión a distancia: trazo fino
      pintar(enc || delSel ? FUERTE : TENUE, L.a, L.b, L.t, enc || delSel || (!sel && L.a.id % 3 === 0), tiempo);
    }
    // red potencial del agente elegido: hasta el individuo o árbol más cercano de cada especie con la que tiene relación
    if (sel && ESTADO.pot) for (const p of ESTADO.pot) pintar(FUERTE, sel, p.b, p.t, true, tiempo);
    for (const C of [FUERTE, TENUE]) { C.g.instanceCount = C.n * SEG; C.p.needsUpdate = true; C.c.needsUpdate = true; }
    pg.setDrawRange(0, np); pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    const cam = T3.camera; cam.updateMatrixWorld();
    AG.forEach((a, i) => {
      const y = a.y + alto(a) * 1.6 + 1.2; mp[i * 3] = a.x; mp[i * 3 + 1] = y; mp[i * 3 + 2] = a.z; mc[i * 4 + 3] = a.vis && ESTADO.agentes ? 1 : 0;
      // dirección en pantalla: se proyecta el punto y otro 6 m adelante en el rumbo del animal (adelante = +x girado por a.rot)
      VA.set(a.x, y, a.z).project(cam); VB.set(a.x + Math.cos(a.rot) * 6, y, a.z - Math.sin(a.rot) * 6).project(cam);
      ma[i] = Math.atan2((VB.y - VA.y) * innerHeight, (VB.x - VA.x) * innerWidth) - Math.PI / 2;
    });
    mg.attributes.ang.needsUpdate = true;
    mg.attributes.position.needsUpdate = true; mg.attributes.color.needsUpdate = true;
  }
  function redPotencial(a) {
    const L = [], R = REL[a.e];
    const AR = arbolesCerca(a.h, a.x, a.z, 400); for (const [f, r] of R.flora) { let best = null, bd = 1e9; for (const t of AR) if (t.fl.includes(f)) { const d = Math.hypot(t.x - a.x, t.z - a.z); if (d < bd) { bd = d; best = t; } } if (best && bd < 600) L.push({ b: best, t: r.t, n: B.flora[f].n, rol: r.rol }); }
    for (const r of R.fauna) { let best = null, bd = 1e9; for (const b of POR[r.o] || []) { const d = Math.hypot(b.x - a.x, b.z - a.z); if (d < bd) { bd = d; best = b; } } if (best) L.push({ b: best, t: r.t, n: ESP[r.o].n, rol: r.rol }); }
    L.sort((p, q) => Math.hypot(p.b.x - a.x, p.b.z - a.z) - Math.hypot(q.b.x - a.x, q.b.z - a.z)); return L.slice(0, 14);
  }

  /* ---------- instancias ---------- */
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), w4 = new THREE.Matrix4(), w5 = new THREE.Matrix4();
  const OCULTO = new THREE.Matrix4().makeScale(0, 0, 0);
  function instancias(dt) {
    const n = {}; for (const k in MAL) n[k] = 0;
    for (const a of AG) {
      const Mk = MAL[a.e], i = n[a.e]++, e = ESP[a.e];
      if (!a.vis || !ESTADO.agentes) { Mk.cu.setMatrixAt(i, OCULTO); if (Mk.al) { Mk.al.setMatrixAt(i * 2, OCULTO); Mk.al.setMatrixAt(i * 2 + 1, OCULTO); } continue; }
      const vuela = a.st === 'vuelo' || a.st === 'liba' || a.st === 'planea' || a.st === 'picada' || a.st === 'sube' || (a.e === 'colibri') || (a.e === 'abeja' && a.st !== 'colmena');
      const bob = !vuela && a.vel > 0.05 ? Math.abs(Math.sin(a.flap * 0.5)) * 0.04 * Mk.s * (e.ave ? e.ave.len : 0.1) : 0;
      e4.set(0, a.rot, vuela ? -a.pitch : 0, 'YXZ'); q4.setFromEuler(e4); v4.set(a.x, a.y + bob, a.z); s4.setScalar(Mk.s);
      m4.compose(v4, q4, s4); Mk.cu.setMatrixAt(i, m4);
      if (Mk.al) {
        if (!vuela) { Mk.al.setMatrixAt(i * 2, OCULTO); Mk.al.setMatrixAt(i * 2 + 1, OCULTO); }
        else {
          const pa = e.ave || e.alas, f = pa.flapF || (e.mov === 'rapaz' ? 3 : 9), planeo = a.st === 'planea' && Math.sin(a.flap * 0.11) > -0.2;
          a.flap += dt * f * 6.283; const ang = planeo ? 0.08 : Math.sin(a.flap) * (a.e === 'colibri' || a.e === 'abeja' ? 0.9 : 0.75);
          const yA = (pa.alto + pa.len * 0.38);
          for (const s of [1, -1]) { w4.makeTranslation(-pa.len * 0.05, yA, s * pa.len * 0.12); w5.makeRotationX(-s * ang); w4.multiply(w5); w5.makeScale(1, 1, s); w4.multiply(w5); w5.multiplyMatrices(m4, w4); Mk.al.setMatrixAt(i * 2 + (s > 0 ? 0 : 1), w5); }
        }
      } else a.flap += dt * 6;
      if (!vuela) a.flap += dt * (a.vel > 0 ? 6 + a.vel * 4 : 1);
    }
    for (const k in MAL) { MAL[k].cu.instanceMatrix.needsUpdate = true; if (MAL[k].al) MAL[k].al.instanceMatrix.needsUpdate = true; }
  }

  /* ---------- siluetas de las convenciones (vista lateral del mismo modelo 3D) ---------- */
  function silueta(k, col, w = 56, h = 34) {
    const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; const g = cv.getContext('2d'), P = GEO[k].attributes.position.array;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
    const sc = Math.min((w * 2 - 8) / (x1 - x0), (h * 2 - 8) / (y1 - y0)), ox = (w * 2 - (x1 - x0) * sc) / 2, oy = (h * 2 - (y1 - y0) * sc) / 2;
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1; g.lineJoin = 'round';
    for (let i = 0; i < P.length; i += 9) { g.beginPath(); g.moveTo(ox + (P[i] - x0) * sc, h * 2 - oy - (P[i + 1] - y0) * sc); g.lineTo(ox + (P[i + 3] - x0) * sc, h * 2 - oy - (P[i + 4] - y0) * sc); g.lineTo(ox + (P[i + 6] - x0) * sc, h * 2 - oy - (P[i + 7] - y0) * sc); g.closePath(); g.fill(); g.stroke(); }
    return cv.toDataURL();
  }

  /* ---------- interfaz ---------- */
  const css = document.createElement('style'); css.textContent = `
#bt-pan{position:fixed;z-index:11;right:14px;bottom:26px;width:300px;max-height:min(560px,calc(100vh - 120px));overflow:auto;scrollbar-width:none;padding:11px 12px;border-radius:14px;background:rgba(8,16,26,.84);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(125,211,252,.22);color:#e2f3ff;font:11.5px system-ui,-apple-system,"Segoe UI",sans-serif}
#bt-pan::-webkit-scrollbar{display:none}
#bt-pan.min .bt-cuerpo{display:none}
.bt-cab{display:flex;align-items:center;gap:8px}
.bt-cab h3{flex:1;margin:0;font-size:10px;letter-spacing:.2em;color:#94a3b8;font-weight:700}
.bt-sw{position:relative;height:28px;padding:0 12px 0 34px;border:none;border-radius:999px;background:rgba(255,255,255,.08);color:#cbd5e1;font:700 10px system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;white-space:nowrap}
.bt-sw::before{content:'';position:absolute;left:6px;top:6px;width:22px;height:16px;border-radius:999px;background:#334155;transition:background .2s}
.bt-sw::after{content:'';position:absolute;left:8px;top:8px;width:12px;height:12px;border-radius:50%;background:#94a3b8;transition:transform .2s,background .2s}
.bt-sw.on{background:rgba(125,211,252,.16);color:#e0f2fe}.bt-sw.on::before{background:#0ea5e9}.bt-sw.on::after{transform:translateX(6px);background:#fff}
.bt-min{width:28px;height:28px;border:none;border-radius:8px;background:rgba(255,255,255,.06);color:#94a3b8;cursor:pointer;font:700 13px system-ui}
.bt-sub{margin:10px 0 5px;font-size:9.5px;letter-spacing:.18em;color:#94a3b8;font-weight:700;display:flex;justify-content:space-between}
.bt-sub span{letter-spacing:.04em;color:#64748b;font-weight:600}
.bt-tipo{display:flex;align-items:center;gap:8px;width:100%;padding:4px 6px;margin:1px 0;border:none;border-radius:7px;background:none;color:#e2f3ff;font:11px system-ui,sans-serif;text-align:left;cursor:pointer}
.bt-tipo:hover{background:rgba(255,255,255,.05)}.bt-tipo.off{opacity:.35}
.bt-tipo i{flex:none;width:22px;height:3px;border-radius:2px}
.bt-tipo svg{flex:none;width:15px;height:15px;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.bt-tipo span{flex:1}.bt-tipo b{font-weight:600;color:#7dd3fc;font-variant-numeric:tabular-nums}
.bt-cat{margin:8px 0 3px;font-size:9.5px;font-weight:700;letter-spacing:.12em;display:flex;align-items:center;gap:6px}
.bt-cat::before{content:'';width:8px;height:8px;border-radius:2px;background:currentColor}
.bt-esp{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.bt-e{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px 4px;border:1px solid rgba(255,255,255,.06);border-radius:8px;background:rgba(255,255,255,.03);color:#cbd5e1;font:10px/1.15 system-ui,sans-serif;cursor:pointer;text-align:center}
.bt-e:hover{border-color:rgba(125,211,252,.4)}.bt-e img{width:56px;height:34px}.bt-e small{color:#64748b;font-size:9px}
.bt-nota{margin-top:9px;font-size:9.5px;color:#64748b;line-height:1.4}
#bt-ficha{position:fixed;z-index:12;left:50%;bottom:96px;transform:translateX(-50%);width:min(380px,calc(100vw - 32px));padding:11px 13px;border-radius:14px;background:rgba(8,16,26,.9);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(125,211,252,.3);color:#e2f3ff;font:11.5px system-ui,sans-serif;display:none}
#bt-ficha .t{display:flex;gap:10px;align-items:center}#bt-ficha .t img{width:64px;height:40px;flex:none}
#bt-ficha h4{margin:0;font-size:14px}#bt-ficha em{color:#94a3b8;font-size:11px}
#bt-ficha .x{margin-left:auto;align-self:flex-start;border:none;background:none;color:#94a3b8;font:700 16px system-ui;cursor:pointer}
#bt-ficha .st{margin:7px 0 4px;color:#7dd3fc}
#bt-vr{margin-top:8px;height:28px;padding:0 12px;border:1px solid rgba(125,211,252,.35);border-radius:8px;background:rgba(125,211,252,.12);color:#e0f2fe;font:700 10px system-ui,sans-serif;letter-spacing:.08em;cursor:pointer}
#bt-ficha ul{margin:4px 0 0;padding:0;list-style:none;max-height:150px;overflow:auto}#bt-ficha li{display:flex;gap:6px;align-items:center;padding:2px 0;font-size:10.5px;color:#cbd5e1}
#bt-ficha li i{flex:none;width:14px;height:3px;border-radius:2px}
#bt-tog{display:none}
@media(max-width:760px){
  #bt-pan{left:8px;right:8px;width:auto;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 56px);max-height:44vh;display:none}
  body.bt-abierto #bt-pan{display:block}
  #bt-tog{display:flex;position:fixed;z-index:11;right:10px;top:102px;height:34px;padding:0 12px;align-items:center;border-radius:10px;background:rgba(8,16,26,.8);color:#e2f3ff;font:700 10px system-ui,sans-serif;letter-spacing:.12em;border:1px solid rgba(125,211,252,.3)}
  #bt-tog.on{background:#7dd3fc;color:#04121c}
  #bt-ficha{bottom:calc(max(18px,env(safe-area-inset-bottom)) + 60px)}
}`;
  document.head.appendChild(css);
  const IMG = {}; for (const k of Object.keys(MAL)) IMG[k] = silueta(k, CAT[ESP[k].cat]?.c || '#7DA0B8');
  const pan = document.createElement('div'); pan.id = 'bt-pan';
  const icono = (t, c) => `<svg viewBox="0 0 24 24" style="stroke:${c}">${SVG[t] || ''}</svg>`;
  const cats = [...new Set(Object.keys(MAL).map(k => ESP[k].cat))].sort();
  pan.innerHTML = `<div class="bt-cab"><h3>RED BIÓTICA</h3><button class="bt-sw on" id="bt-on" title="Prender o apagar las relaciones entre agentes">RELACIONES</button><button class="bt-min" id="bt-min" title="Plegar">–</button></div>
    <div class="bt-cuerpo">
      <div class="bt-sub">TIPOS DE RELACIÓN <span>conexiones ahora</span></div>
      ${TIPOS.map(t => `<button class="bt-tipo" data-t="${t.id}"><i style="background:${t.c}"></i>${icono(t.id, t.c)}<span>${t.n}</span><b id="bt-c-${t.id}">0</b></button>`).join('')}
      <div class="bt-sub">AGENTES NO HUMANOS <span>${AG.length} individuos · ${HUM.length} humedales y ${PAR.length} zonas verdes</span></div>
      ${cats.map(c => `<div class="bt-cat" style="color:${CAT[c].c}">${CAT[c].n.toUpperCase()}</div><div class="bt-esp">${Object.keys(MAL).filter(k => ESP[k].cat === c).map(k => `<button class="bt-e" data-k="${k}" title="${ESP[k].sci}"><img src="${IMG[k]}" alt="">${ESP[k].n}<small>${POR[k].length}</small></button>`).join('')}</div>`).join('')}
      <div class="bt-nota">Red: Red de Interacciones Bióticas de Kennedy (${B.enlaces.length} relaciones entre estas ${Object.keys(MAL).length} especies y ${Object.keys(B.flora).length} especies de árboles del censo SIGAU). Cada animal se conecta con el individuo más cercano de cada especie con la que tiene relación en la red (hasta 220 m) y con los árboles relacionados (hasta 90 m); las líneas se mueven con ellos. Línea fuerte con pulso: encuentro (la interacción está ocurriendo); tenue: conexión a distancia. Movimiento: bandadas y zonas de Couzin, forrajeo floral de lugar central, balsas de aves acuáticas, caminata correlacionada con ámbito hogareño, persecución y huida.</div>
    </div>`;
  const ficha = document.createElement('div'); ficha.id = 'bt-ficha';
  const tog = document.createElement('button'); tog.id = 'bt-tog'; tog.textContent = 'RED BIÓTICA';
  document.body.append(pan, ficha, tog);
  tog.onclick = () => { const on = !document.body.classList.contains('bt-abierto'); document.body.classList.toggle('bt-abierto', on); tog.classList.toggle('on', on); };
  const bOn = pan.querySelector('#bt-on');
  bOn.onclick = () => { ESTADO.on = !ESTADO.on; bOn.classList.toggle('on', ESTADO.on); lineas.visible = pulsos.visible = ESTADO.on; };
  pan.querySelector('#bt-min').onclick = (e) => { pan.classList.toggle('min'); e.currentTarget.textContent = pan.classList.contains('min') ? '+' : '–'; };
  pan.querySelectorAll('.bt-tipo').forEach(b => b.onclick = () => { const t = +b.dataset.t; if (ESTADO.tipos.has(t)) ESTADO.tipos.delete(t); else ESTADO.tipos.add(t); b.classList.toggle('off', !ESTADO.tipos.has(t)); });
  pan.querySelectorAll('.bt-e').forEach(b => b.onclick = () => abrirRed(b.dataset.k)); // clic en una especie: ventana con su red
  ESTADO.agentes = true;
  { const ga = document.getElementById('gs-ag'); if (ga) ga.addEventListener('click', () => { ESTADO.agentes = ga.classList.contains('on'); }); }

  const ESTX = { posado: 'Posado', vuelo: 'Volando', liba: 'Libando néctar', quieto: 'Quieto', camina: 'Caminando', percha: 'Perchado en un árbol', planea: 'Planeando', picada: 'En picada sobre una presa', sube: 'Subiendo', buceo: 'Buceando' };
  function seleccionar(a, volar) {
    ESTADO.sel = a; ESTADO.pot = a ? redPotencial(a) : null;
    if (!a) { ficha.style.display = 'none'; return; }
    if (volar) { const t = new THREE.Vector3(a.x, a.y, a.z), c = T3.camera.position, v = c.clone().sub(T3.orbit.target); v.setLength(Math.max(25, Math.min(70, v.length()))); T3.anim = { t: 0, dur: 1.2, p0: c.clone(), p1: t.clone().add(v), c0: T3.orbit.target.clone(), c1: t }; }
    ficha.style.display = 'block'; pintarFicha();
  }
  function pintarFicha() {
    const a = ESTADO.sel; if (!a) return; const e = ESP[a.e], tot = REL[a.e].flora.size + REL[a.e].fauna.filter(r => r.rol === 'a').length + REL[a.e].fauna.filter(r => r.rol === 'b').length;
    const act = a.links.map(k => LINKS.get(k)).filter(Boolean);
    const linea = (t, txt) => `<li><i style="background:${TIPOS[t].c}"></i>${txt}</li>`;
    const est = a.caza ? 'Persiguiendo una presa' : a.huye ? 'Huyendo' : (ESTX[a.st] || 'Moviéndose');
    ficha.innerHTML = `<div class="t"><img src="${IMG[a.e]}" alt=""><div><h4>${e.n}</h4><em>${e.sci} · ${CAT[e.cat].n}</em></div><button class="x" aria-label="Cerrar">×</button></div>
      <button id="bt-vr">VER SU RED</button>
      <div class="st">${est} · ${a.h.n}</div>
      <div class="bt-sub" style="margin-top:6px">RELACIONES AHORA <span>${act.length}</span></div>
      <ul>${act.length ? act.map(L => linea(L.t, `${TIPOS[L.t].n} · ${L.b.id !== undefined ? ESP[L.b.e].n : (B.flora[L.f]?.n || L.b.n)}`)).join('') : '<li>Sin encuentros en este momento</li>'}</ul>
      <div class="bt-sub">EN LA RED <span>${tot} relaciones · las más cercanas, en línea tenue</span></div>
      <ul>${(ESTADO.pot || []).map(p => linea(p.t, `${TIPOS[p.t].n} ${p.rol === 'a' ? '→' : '←'} ${p.n}`)).join('')}</ul>`;
    ficha.querySelector('.x').onclick = () => seleccionar(null);
    ficha.querySelector('#bt-vr').onclick = () => abrirRed(a.e);
  }
  // clic sobre un animal (búsqueda en pantalla: el más cercano al puntero a menos de 22 px)
  const cvs = T3.renderer.domElement; let pd = null; const pv = new THREE.Vector3();
  cvs.addEventListener('pointerdown', e => { pd = [e.clientX, e.clientY]; });
  cvs.addEventListener('pointerup', e => {
    if (!pd || Math.hypot(e.clientX - pd[0], e.clientY - pd[1]) > 6) return; const r = cvs.getBoundingClientRect(); let best = null, bd = 22;
    for (const a of AG) { if (!a.vis) continue; pv.set(a.x, a.y + 0.5, a.z).project(T3.camera); if (pv.z > 1) continue; const sx = (pv.x + 1) / 2 * r.width + r.left, sy = (1 - pv.y) / 2 * r.height + r.top, d = Math.hypot(sx - e.clientX, sy - e.clientY); if (d < bd) { bd = d; best = a; } }
    if (best) { seleccionar(best, false); abrirRed(best.e); } // clic en un animal: su ficha y la ventana con la red de su especie
  });

  /* ---------- ventana con la red de una especie (red ego: la especie al centro y sus relaciones alrededor) ---------- */
  const css2 = document.createElement('style'); css2.textContent = `
#bt-red{position:fixed;inset:0;z-index:30;display:none;place-items:center;background:rgba(2,6,12,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
#bt-red.on{display:grid}
#bt-red .v{width:min(860px,calc(100vw - 24px));max-height:calc(100vh - 32px);overflow:auto;padding:14px 16px 16px;border-radius:16px;background:rgba(8,16,26,.95);border:1px solid rgba(125,211,252,.28);color:#e2f3ff;font:12px system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.5)}
#bt-red .cab{display:flex;align-items:center;gap:12px}#bt-red .cab img{width:76px;height:46px}
#bt-red h4{margin:0;font-size:17px}#bt-red em{color:#94a3b8;font-size:11.5px}
#bt-red .acc{margin-left:auto;display:flex;gap:6px;align-self:flex-start}
#bt-red .acc button{height:30px;padding:0 12px;border:none;border-radius:8px;background:rgba(255,255,255,.07);color:#cbd5e1;font:700 10px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}
#bt-red .acc button.x{width:30px;padding:0;font-size:16px}
#bt-red .cuerpo{display:grid;grid-template-columns:1.35fr 1fr;gap:14px;margin-top:10px}
#bt-red .lienzo{position:relative}#bt-red canvas{width:100%;display:block;cursor:grab;touch-action:none}
#bt-red .tip{position:absolute;display:none;max-width:220px;padding:6px 8px;border-radius:8px;background:rgba(4,10,18,.94);border:1px solid rgba(125,211,252,.3);font-size:10.5px;pointer-events:none}#bt-red .tip b,#bt-red .tip span,#bt-red .tip small{display:block}#bt-red .tip small{color:#94a3b8;margin-top:2px}
#bt-red .ley{display:flex;flex-wrap:wrap;gap:4px 12px;margin:6px 0 2px;font-size:10.5px;color:#cbd5e1}
#bt-red .ley span{display:flex;align-items:center;gap:5px}#bt-red .ley i{width:14px;height:3px;border-radius:2px}
#bt-red .lista{max-height:420px;overflow:auto;scrollbar-width:thin}
#bt-red .grp{margin:8px 0 4px;font-size:9.5px;font-weight:700;letter-spacing:.14em;display:flex;align-items:center;gap:6px}
#bt-red .it{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:11px}
#bt-red .it b{font-weight:600}#bt-red .it small{display:block;color:#94a3b8;font-size:10px;line-height:1.35;margin-top:2px}
@media(max-width:760px){#bt-red .cuerpo{grid-template-columns:1fr}#bt-red .lista{max-height:none}#bt-red .acc button.vt{display:none}}`;
  document.head.appendChild(css2);
  const red = document.createElement('div'); red.id = 'bt-red'; document.body.appendChild(red);
  red.addEventListener('click', e => { if (e.target === red) { red.classList.remove('on'); cancelAnimationFrame(animRed); } });
  addEventListener('keydown', e => { if (e.key === 'Escape') { red.classList.remove('on'); cancelAnimationFrame(animRed); } });
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let animRed = 0;
  const imgCache = {}; const imagen = (k) => { if (!imgCache[k]) { const im = new Image(); im.src = IMG[k]; imgCache[k] = im; } return imgCache[k]; };
  function abrirRed(k) {
    const e = ESP[k], R = REL[k], V = [];
    for (const [f, r] of R.flora) V.push({ n: B.flora[f].n, f, t: r.t, rol: r.rol, r: r.r, flora: true });
    for (const r of R.fauna) V.push({ n: ESP[r.o].n, k: r.o, t: r.t, rol: r.rol, r: r.r });
    V.sort((p, q) => p.t - q.t || (p.flora ? 1 : 0) - (q.flora ? 1 : 0) || p.n.localeCompare(q.n));
    // conexiones entre los vecinos (también están relacionados entre sí en la red)
    const VV = [];
    for (let i = 0; i < V.length; i++) for (let j = 0; j < V.length; j++) {
      const p = V[i], q = V[j]; if (!p.k) continue;
      if (q.flora) { const r = REL[p.k].flora.get(q.f); if (r && r.rol === 'a') VV.push([i, j, r.t]); }
      else if (q.k && i !== j) { const r = REL[p.k].fauna.find(x => x.o === q.k && x.rol === 'a'); if (r) VV.push([i, j, r.t]); }
    }
    // posiciones en una esfera (Fibonacci), en orden de tipo de relación: cada tipo queda agrupado
    const n = Math.max(1, V.length);
    V.forEach((v, i) => { const y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996; v.p = [Math.cos(th) * rr, y, Math.sin(th) * rr]; });
    const tipos = [...new Set(V.map(v => v.t))];
    const grupos = tipos.map(t => `<div class="grp" style="color:${TIPOS[t].c}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${TIPOS[t].c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[t]}</svg>${esc(TIPOS[t].n.toUpperCase())} · ${V.filter(v => v.t === t).length}</div>`
      + V.map((v, i) => v.t === t ? `<div class="it" data-i="${i}"><b>${v.rol === 'a' ? esc(e.n) + ' → ' + esc(v.n) : esc(v.n) + ' → ' + esc(e.n)}</b><small>${esc(v.r || '')}</small></div>` : '').join('')).join('');
    const nInd = POR[k] ? POR[k].length : 0;
    red.innerHTML = `<div class="v"><div class="cab"><img src="${IMG[k]}" alt=""><div><h4>${esc(e.n)}</h4><em>${esc(e.sci || '')} · ${CAT[e.cat].n} · ${nInd} individuos en el territorio · ${V.length} relaciones · ${VV.length} conexiones entre ellas</em></div>
      <div class="acc"><button class="vt">VER EN EL TERRITORIO</button><button class="x" aria-label="Cerrar">×</button></div></div>
      <div class="ley">${tipos.map(t => `<span><i style="background:${TIPOS[t].c}"></i>${esc(TIPOS[t].n)}</span>`).join('')}<span><b style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${CAT[0].c}"></b>árbol del censo</span><span style="color:#94a3b8">arrastra para girar · toca un animal para ver su red</span></div>
      <div class="cuerpo"><div class="lienzo"><canvas aria-label="Red de ${esc(e.n)} en esfera"></canvas><div class="tip"></div></div><div class="lista">${grupos || '<div class="it">Sin relaciones en la red.</div>'}</div></div></div>`;
    red.querySelector('.x').onclick = () => { red.classList.remove('on'); cancelAnimationFrame(animRed); };
    red.querySelector('.vt').onclick = () => { red.classList.remove('on'); cancelAnimationFrame(animRed); const L = (POR[k] || []).filter(a => a.vis); if (L.length) seleccionar(L[Math.floor(rnd() * L.length)], true); };
    red.classList.add('on');

    // ---- dibujo de la bola ----
    const cv = red.querySelector('canvas'), g = cv.getContext('2d'), tip = red.querySelector('.tip');
    let W = 0, H = 0, dpr = 1; const medir = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = Math.round(W * 0.86); cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; };
    medir();
    let yaw = 0.4, pitch = -0.25, auto = true, arr = null, hover = -1, sel = -1;
    const proy = (p) => { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch); let x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy, y = p[1] * cp - z * sp; z = p[1] * sp + z * cp; const s = 2.6 / (2.6 + z), R = Math.min(W, H) * 0.36; return [W / 2 + x * R * s, H / 2 - y * R * s, z, s]; };
    const bola = (x, y, r, c, luz) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, c); gr.addColorStop(1, luz); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
    const oscuro = (hex, k) => { const c = new THREE.Color(hex).multiplyScalar(k); return '#' + c.getHexString(); };
    const lista = red.querySelector('.lista');
    const marcar = (i) => { lista.querySelectorAll('.it').forEach(x => x.style.background = +x.dataset.i === i ? 'rgba(125,211,252,.1)' : ''); };
    lista.querySelectorAll('.it').forEach(x => { x.onmouseenter = () => { sel = +x.dataset.i; }; x.onmouseleave = () => { sel = -1; }; });
    let tPrev = performance.now();
    const cuadro = () => {
      const ahora = performance.now(), dt = Math.min(0.05, (ahora - tPrev) / 1000); tPrev = ahora;
      if (cv.clientWidth !== W) medir();
      if (auto && !arr) yaw += dt * 0.25;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const P = V.map(v => proy(v.p)), C = [W / 2, H / 2, 0, 1], foco = hover >= 0 ? hover : sel;
      // conexiones entre vecinos (finas)
      g.lineWidth = 1;
      for (const [i, j, t] of VV) { const a = P[i], b = P[j], on = foco === i || foco === j; g.strokeStyle = TIPOS[t].c; g.globalAlpha = (on ? 0.75 : 0.16) * (0.5 + 0.5 * (1 - (a[2] + b[2]) / 2) / 2); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2 + (W / 2 - (a[0] + b[0]) / 2) * 0.25, (a[1] + b[1]) / 2 + (H / 2 - (a[1] + b[1]) / 2) * 0.25, b[0], b[1]); g.stroke(); }
      // relaciones con la especie del centro, con un pulso de quien actúa hacia quien recibe
      V.forEach((v, i) => {
        const a = P[i], on = foco === i, fr = 0.35 + 0.65 * (1 - a[2]) / 2;
        g.strokeStyle = TIPOS[v.t].c; g.globalAlpha = on ? 1 : (foco >= 0 ? 0.25 : 0.75) * fr; g.lineWidth = on ? 2.4 : 1.4;
        g.beginPath(); g.moveTo(C[0], C[1]); g.lineTo(a[0], a[1]); g.stroke();
        const u = ((ahora / 1000) * 0.45 + i * 0.137) % 1, s = v.rol === 'a' ? u : 1 - u; g.fillStyle = TIPOS[v.t].c; g.beginPath(); g.arc(C[0] + (a[0] - C[0]) * s, C[1] + (a[1] - C[1]) * s, on ? 2 : 1.4, 0, 6.2832); g.fill();
      });
      g.globalAlpha = 1;
      // esferas: de atrás hacia adelante; el centro va donde le toca por profundidad (z = 0)
      const orden = V.map((v, i) => i).sort((i, j) => P[j][2] - P[i][2]); let centroHecho = false;
      const centro = () => { const r = Math.min(W, H) * 0.075; bola(C[0], C[1], r, CAT[e.cat].c, oscuro(CAT[e.cat].c, 0.35)); const im = imagen(k); if (im.complete) g.drawImage(im, C[0] - r * 0.85, C[1] - r * 0.52, r * 1.7, r * 1.04); g.font = '700 12px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#e2f3ff'; g.fillText(e.n, C[0], C[1] + r + 15); centroHecho = true; };
      for (const i of orden) {
        const v = V[i], a = P[i]; if (!centroHecho && a[2] < 0) centro();
        const r = (v.flora ? 7 : 15) * a[3] * (foco === i ? 1.25 : 1), c = v.flora ? CAT[0].c : CAT[ESP[v.k].cat].c, fr = 0.45 + 0.55 * (1 - a[2]) / 2;
        g.globalAlpha = foco >= 0 && foco !== i ? 0.55 * fr + 0.2 : fr;
        bola(a[0], a[1], r, c, oscuro(c, 0.3));
        if (!v.flora) { const im = imagen(v.k); if (im.complete) g.drawImage(im, a[0] - r * 0.85, a[1] - r * 0.52, r * 1.7, r * 1.04); }
        g.strokeStyle = TIPOS[v.t].c; g.lineWidth = foco === i ? 2.5 : 1.2; g.beginPath(); g.arc(a[0], a[1], r + 1.5, 0, 6.2832); g.stroke();
        if (a[2] < -0.25 || foco === i || (!v.flora && a[2] < 0.3)) { g.font = (foco === i ? '700 ' : '') + '10px system-ui,sans-serif'; g.textAlign = a[0] >= W / 2 ? 'left' : 'right'; g.fillStyle = v.flora ? '#b9c9bd' : '#e2f3ff'; g.fillText(v.n.length > 26 ? v.n.slice(0, 25) + '…' : v.n, a[0] + (a[0] >= W / 2 ? r + 4 : -r - 4), a[1] + 3); }
        g.globalAlpha = 1;
      }
      if (!centroHecho) centro();
      cv._P = P;
      animRed = requestAnimationFrame(cuadro);
    };
    const cerca = (ev) => { const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, P = cv._P || []; let b = -1, bd = 18; P.forEach((a, i) => { const d = Math.hypot(a[0] - x, a[1] - y); if (d < bd && a[2] < 0.6) { bd = d; b = i; } }); return [b, x, y]; };
    cv.addEventListener('pointerdown', (ev) => { arr = { x: ev.clientX, y: ev.clientY, yaw, pitch, mov: 0 }; cv.setPointerCapture(ev.pointerId); });
    cv.addEventListener('pointermove', (ev) => {
      if (arr) { const dx = ev.clientX - arr.x, dy = ev.clientY - arr.y; arr.mov = Math.max(arr.mov, Math.hypot(dx, dy)); yaw = arr.yaw + dx * 0.008; pitch = Math.max(-1.2, Math.min(1.2, arr.pitch + dy * 0.008)); auto = false; return; }
      const [i, x, y] = cerca(ev); hover = i; marcar(i);
      if (i >= 0) { const v = V[i]; tip.style.display = 'block'; tip.style.left = Math.min(x + 14, cv.clientWidth - 220) + 'px'; tip.style.top = (y + 10) + 'px'; tip.innerHTML = `<b>${esc(v.n)}</b><span style="color:${TIPOS[v.t].c}">${esc(TIPOS[v.t].n)} · ${v.rol === 'a' ? esc(e.n) + ' → ' + esc(v.n) : esc(v.n) + ' → ' + esc(e.n)}</span>${v.k ? '<small>Toca para ver su red</small>' : ''}`; } else tip.style.display = 'none';
    });
    cv.addEventListener('pointerleave', () => { hover = -1; tip.style.display = 'none'; marcar(-1); });
    cv.addEventListener('pointerup', (ev) => { const fue = arr; arr = null; if (fue && fue.mov < 5) { const [i] = cerca(ev); if (i >= 0 && V[i].k) { cancelAnimationFrame(animRed); abrirRed(V[i].k); } } });
    cancelAnimationFrame(animRed); animRed = requestAnimationFrame(cuadro);
  }

  /* ---------- bucle ---------- */  let ult = performance.now(), tUI = 0, tPot = 0;
  function cuadro() {
    const ahora = performance.now(), dt = Math.min(0.1, (ahora - ult) / 1000); ult = ahora;
    for (const a of AG) { if (a.huye && (a.huye.t -= dt) <= 0) a.huye = null; MOV[ESP[a.e].mov](a, dt); }
    actualizarRed(dt); instancias(dt); dibujarRed(ahora / 1000);
    if ((tUI -= dt) <= 0) { tUI = 0.5; TIPOS.forEach(t => { const el = document.getElementById('bt-c-' + t.id); if (el) el.textContent = CUENTA[t.id]; }); if (ESTADO.sel) pintarFicha(); }
    if (ESTADO.sel && (tPot -= dt) <= 0) { tPot = 1.5; ESTADO.pot = redPotencial(ESTADO.sel); }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  return { AG, ESP, LINKS, ESTADO };
}
