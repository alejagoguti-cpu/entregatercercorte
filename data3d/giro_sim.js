/* ============ SIMULACIÓN SOBRE EL GIRO DE KENNEDY (giro.html) ============
   Encima del render de Unreal, con la misma cámara (window.GIRO.proyectar):
   - Calles con SINTAXIS ESPACIAL (análisis angular de segmentos, método de DepthmapX, github.com/SpaceGroupUCL/depthmapX):
     integración y elección calculadas en tools/kennedy_sim_datos.py, con la escala de color de DepthmapX (azul -> rojo).
   - Movimiento natural (Hillier): carros, motos, camiones, bicis y peatones eligen en cada cruce el tramo siguiente con
     probabilidad proporcional a su valor de sintaxis (elección para vehículos, integración para peatones) y a la
     continuidad del giro. Así el flujo se concentra donde la configuración de la red lo concentra.
   - Convenciones del programa (matriz del Corte III):
     P1 Seguimiento y cuidado del humedal (bordes de El Burro, La Vaca y Techo): habitantes y colectivos ambientales,
        jornada diurna 7:00-11:30 y jornada después del almuerzo 14:00-17:30.
     P2 Biofabricación y cultivo popular de hongos junto a Corabastos: madres comunitarias, recuperadores de Corabastos
        (traen el sustrato orgánico) y jóvenes aprendices; hongos orellana como actor no humano.
     P3 Cocinas comunitarias y degustación barrial: cocineras tradicionales, niños de colegios con su maestra y vecinos.
     P4 Huertas en lotes baldíos: huerteros, abejas, aves que atrae la huerta (copetón, mirla patiamarilla, colibrí
        chillón) y lombriz roja californiana en el compost.
   Cantidades y tiempos sin fuente: marcados [SUP] (supuestos de escala para discutir). */

const DEPTHMAP = [[0, 0, 255], [0, 102, 255], [0, 204, 255], [0, 255, 204], [0, 255, 102], [51, 255, 0], [153, 255, 0], [255, 255, 0], [255, 204, 0], [255, 136, 0], [255, 68, 0], [255, 0, 0]]; // escala DepthmapX
const colorDM = (v) => { const c = DEPTHMAP[Math.min(DEPTHMAP.length - 1, Math.floor(v * DEPTHMAP.length))]; return `rgb(${c[0]},${c[1]},${c[2]})`; };
const H = (h, m = 0) => h * 60 + m;
const JORNADAS = { P1: [[H(7), H(11, 30)], [H(14), H(17, 30)]], P2: [[H(8), H(12)], [H(13, 30), H(16, 30)]], P3: [[H(8), H(12, 30)], [H(14), H(16, 30)]], P4: [[H(7), H(10)], [H(15), H(17, 30)]] }; // [SUP]
const enJornada = (p, t) => JORNADAS[p].some(([a, b]) => t >= a && t < b);

// tipos de actor: nombre, grupo, color, tamaño (m), conteo [SUP]
const ACT = {
  carro: { n: 'Carros', g: 'h', c: '#f8fafc', r: 2.2 }, moto: { n: 'Motos', g: 'h', c: '#fde047', r: 1.4 }, camion: { n: 'Camiones', g: 'h', c: '#fb923c', r: 3 },
  bici: { n: 'Ciclistas', g: 'h', c: '#7dd3fc', r: 1.3 }, peaton: { n: 'Peatones', g: 'h', c: '#e2e8f0', r: 1 },
  hab: { n: 'Habitantes', g: 'h', c: '#34d399', r: 2.2, p: 'P1' }, col: { n: 'Colectivos ambientales', g: 'h', c: '#059669', r: 2.2, p: 'P1' },
  madre: { n: 'Madres comunitarias', g: 'h', c: '#f472b6', r: 2.2, p: 'P2' }, recu: { n: 'Recuperadores de Corabastos', g: 'h', c: '#fb7185', r: 2.2, p: 'P2' }, joven: { n: 'Jóvenes aprendices', g: 'h', c: '#c084fc', r: 2, p: 'P2' },
  cocinera: { n: 'Cocineras tradicionales', g: 'h', c: '#facc15', r: 2.2, p: 'P3' }, nino: { n: 'Niños de colegios', g: 'h', c: '#60a5fa', r: 1.6, p: 'P3' }, maestra: { n: 'Maestras', g: 'h', c: '#2563eb', r: 2, p: 'P3' }, vecino: { n: 'Vecinos en la degustación', g: 'h', c: '#a3e635', r: 1.8, p: 'P3' },
  huertero: { n: 'Huerteros', g: 'h', c: '#84cc16', r: 2, p: 'P4' },
  tingua: { n: 'Tingua bogotana', g: 'n', c: '#b45309', r: 1.4, p: 'P1' }, garza: { n: 'Garza blanca', g: 'n', c: '#ffffff', r: 2, p: 'P1' }, pato: { n: 'Pato turrio', g: 'n', c: '#92400e', r: 1.4, p: 'P1' }, monjita: { n: 'Monjita', g: 'n', c: '#eab308', r: 1, p: 'P1' },
  hongo: { n: 'Hongo orellana (bolsas)', g: 'n', c: '#e9d5ff', r: 0, p: 'P2' },
  abeja: { n: 'Abejas', g: 'n', c: '#fde047', r: 0.8, p: 'P4' }, copeton: { n: 'Copetón', g: 'n', c: '#a16207', r: 1.1, p: 'P4' }, mirla: { n: 'Mirla patiamarilla', g: 'n', c: '#334155', r: 1.3, p: 'P4' },
  colibri: { n: 'Colibrí chillón', g: 'n', c: '#22d3ee', r: 0.9, p: 'P4' }, lombriz: { n: 'Lombriz roja californiana', g: 'n', c: '#be123c', r: 0, p: 'P4' }
};
const CONV = {
  P1: { t: 'Seguimiento y cuidado del humedal', a: 'Habitantes y colectivos ambientales', h: 'Diurna 7:00–11:30 · tarde 14:00–17:30', c: '#34d399' },
  P2: { t: 'Biofabricación y cultivo popular de hongos', a: 'Madres comunitarias, recuperadores y jóvenes', h: '8:00–12:00 · 13:30–16:30', c: '#f472b6' },
  P3: { t: 'Cocina comunitaria y degustación barrial', a: 'Cocineras tradicionales, niños de colegios y vecinos', h: 'Degustación 10:30 y 15:00', c: '#facc15' },
  P4: { t: 'Huerta en lote baldío', a: 'Huerteros, abejas, aves y lombrices', h: '7:00–10:00 · 15:00–17:30', c: '#84cc16' }
};

const CSS = `
#gs-cv,#gs-cv2{position:fixed;inset:0;width:100%;height:100%;z-index:7;pointer-events:none}
.gs-pan{position:fixed;z-index:10;width:262px;padding:11px 12px;border-radius:14px;background:rgba(8,16,26,.8);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(125,211,252,.22);font-size:11.5px;color:#e2f3ff;max-height:calc(100vh - 170px);overflow:auto;scrollbar-width:none}
.gs-pan::-webkit-scrollbar{display:none}
.gs-pan h3{display:flex;justify-content:space-between;align-items:center;margin:0 0 8px;font-size:10px;letter-spacing:.22em;color:#94a3b8;font-weight:700}
.gs-pan h3 em{font-style:normal;color:#7dd3fc;letter-spacing:.06em}
#gs-izq{left:14px;top:72px}#gs-der{right:14px;top:56px}
.gs-reloj{display:flex;align-items:center;gap:12px}
.gs-reloj>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.gs-reloj b{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.02em}
.gs-reloj small{color:#7dd3fc;font-size:11px;font-weight:600}
.gs-reloj em{font-style:normal;color:#64748b;font-size:9.5px;line-height:1.3}
#gs-dial{flex:none;width:104px;height:104px;cursor:grab;touch-action:none;outline:none;border-radius:50%}
#gs-dial:focus-visible{box-shadow:0 0 0 2px #7dd3fc}
#gs-dial.arr{cursor:grabbing}.gs-fila{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}
.gs-fila3{grid-template-columns:repeat(3,1fr)}
.gs-pan button{height:30px;border:none;border-radius:8px;background:rgba(255,255,255,.06);color:#cbd5e1;font:700 10px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}
.gs-pan button.on{background:#7dd3fc;color:#04121c}
.gs-pan input[type=range]{width:100%;margin:8px 0 2px;accent-color:#7dd3fc}
.gs-ley{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:10px;color:#94a3b8}
.gs-ley i{flex:1;height:7px;border-radius:4px;background:linear-gradient(90deg,${DEPTHMAP.map(c => `rgb(${c})`).join(',')})}
.gs-sub{margin:10px 0 4px;font-size:9.5px;letter-spacing:.2em;color:#94a3b8;font-weight:700;display:flex;justify-content:space-between}
.gs-t{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.gs-t td{padding:2px 0;font-size:11px}
.gs-t td:first-child{width:12px}.gs-t td:nth-child(3),.gs-t td:nth-child(4){text-align:right;padding-left:6px}
.gs-t td:nth-child(4){color:#7dd3fc;width:38px}
.gs-t i{display:inline-block;width:7px;height:7px;border-radius:50%}
.gs-t .p{color:#64748b;font-size:9.5px;margin-left:4px}
.gs-ind{display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:11px}
.gs-ind b{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.gs-ind span{color:#94a3b8}
.gs-conv{display:flex;gap:7px;margin-top:6px;font-size:10.5px;line-height:1.35}
.gs-conv b{flex:none;width:26px;height:20px;border-radius:6px;display:grid;place-items:center;color:#04121c;font-size:10px}
.gs-conv small{display:block;color:#94a3b8}
.gs-nota{margin-top:8px;font-size:9.5px;color:#64748b;line-height:1.35}
#gs-tog{display:none}
@media(max-width:760px){
  .gs-pan{display:none;left:8px!important;right:8px!important;top:auto!important;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 56px);width:auto;max-height:46vh}
  body.gs-abierto .gs-pan.gs-act{display:block}
  #gs-tog{display:flex;position:fixed;z-index:11;right:10px;top:62px;height:34px;padding:0 12px;align-items:center;border:none;border-radius:10px;background:rgba(8,16,26,.8);color:#e2f3ff;font:700 10px system-ui,sans-serif;letter-spacing:.12em;border:1px solid rgba(125,211,252,.3)}
  #gs-tog.on{background:#7dd3fc;color:#04121c}
}`;

export async function iniciarSimulacion(cfg = {}) {
  // dos modos: sobre el giro renderizado (2D, window.GIRO) o dentro de la maqueta 3D (cfg.T3: calles pintadas en el suelo, agentes 3D)
  const M3 = !!cfg.T3, T3 = cfg.T3, GIRO = M3 ? null : window.GIRO;
  const OX = 2095.67, OZ = -109.06; // marco del giro (X este, Y sur, desde El Burro) -> mundo de la maqueta (x, z)
  const D = await (await fetch('data3d/giro_sim.json')).json();
  const $ = (id) => document.getElementById(id);
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const cv = document.createElement('canvas'); cv.id = 'gs-cv'; const g = cv.getContext('2d');
  const cv2 = document.createElement('canvas'); cv2.id = 'gs-cv2'; const g2 = cv2.getContext('2d'); cv2.style.zIndex = 7;
  document.body.append(cv, cv2); if (M3) cv.style.display = 'none';
  let v3p = null;
  const proy = M3 ? (X, Y, Z) => { if (!v3p) v3p = new T3.THREE.Vector3(); v3p.set(X + OX, Z, Y + OZ); const d = v3p.distanceTo(T3.camera.position); v3p.project(T3.camera); if (v3p.z > 1 || v3p.z < -1) return null; return [(v3p.x + 1) / 2 * W, (1 - v3p.y) / 2 * Hh, d]; } : (X, Y, Z) => GIRO.proyectar(X, Y, Z);

  /* ---------- red ---------- */
  const N = D.nodos, S = D.seg, ADJ = N.map(() => []);
  S.forEach((s, i) => { ADJ[s.a].push(i); ADJ[s.b].push(i); const c = [0]; for (let k = 1; k < s.p.length; k++) c.push(c[k - 1] + Math.hypot(s.p[k][0] - s.p[k - 1][0], s.p[k][1] - s.p[k - 1][1])); s.cum = c; s.len = c[c.length - 1] || 1; });
  const R_SIM = 2900; // radio de la simulación de movimiento alrededor del giro [m]
  const enRadio = (p) => Math.hypot(p[0], p[1]) < R_SIM;
  function enTramo(s, d) { let k = 1; while (k < s.cum.length - 1 && s.cum[k] < d) k++; const a = s.p[k - 1], b = s.p[k], f = (d - s.cum[k - 1]) / ((s.cum[k] - s.cum[k - 1]) || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]; }
  function rumboSalida(s, desdeA) { const p = s.p; return desdeA ? Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]) : Math.atan2(p[p.length - 2][1] - p[p.length - 1][1], p[p.length - 2][0] - p[p.length - 1][0]); }
  // movimiento natural: en el cruce elige el tramo siguiente según sintaxis espacial y continuidad del giro
  function siguiente(ag, nodo, rumbo) {
    const op = ADJ[nodo]; let tot = 0; const w = [];
    for (const j of op) {
      const s = S[j]; if (j === ag.s && op.length > 1) { w.push(0); continue; }
      if (ag.veh && !s.v) { w.push(0); continue; }
      const desdeA = s.a === nodo, r = rumboSalida(s, desdeA), giro = Math.abs(((r - rumbo + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const val = ag.veh ? s.c : s.i, otro = N[desdeA ? s.b : s.a];
      let p = Math.pow(0.05 + val, ag.beta) * Math.exp(-giro / ag.giro) * (ag.tipo === 'camion' ? 1 + s.j * s.j : 1);
      if (!enRadio(otro)) p *= 0.04;
      w.push(p); tot += p;
    }
    if (tot <= 0) return ag.s;
    let r = Math.random() * tot; for (let k = 0; k < op.length; k++) { r -= w[k]; if (r <= 0) return op[k]; } return op[op.length - 1];
  }
  const candVeh = [], candPea = [];
  S.forEach((s, i) => { const m = s.p[Math.floor(s.p.length / 2)]; if (!enRadio(m)) return; if (s.v) candVeh.push(i); candPea.push(i); });
  function sortear(cand, clave, beta) { let t = 0; const ac = cand.map(i => (t += Math.pow(0.05 + S[i][clave], beta))); return () => { const r = Math.random() * t; let lo = 0, hi = ac.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (ac[m] < r) lo = m + 1; else hi = m; } return cand[lo]; }; }
  const sorteoVeh = sortear(candVeh, 'c', 2), sorteoPea = sortear(candPea, 'i', 2);

  // rutas (Dijkstra por longitud) para los recorridos con destino
  function nodoCercano(x, y) { let b = 0, bd = 1e18; N.forEach((p, i) => { if (!ADJ[i].length) return; const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }
  function ruta(x0, y0, x1, y1) {
    const a = nodoCercano(x0, y0), b = nodoCercano(x1, y1), dist = new Float64Array(N.length).fill(Infinity), prev = new Int32Array(N.length).fill(-1), h = [[0, a]]; dist[a] = 0;
    const push = (it) => { h.push(it); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
    const pop = () => { const top = h[0], l = h.pop(); if (h.length) { h[0] = l; let i = 0; for (;;) { const x = 2 * i + 1, y = x + 1; let m = i; if (x < h.length && h[x][0] < h[m][0]) m = x; if (y < h.length && h[y][0] < h[m][0]) m = y; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
    while (h.length) { const [d, u] = pop(); if (u === b) break; if (d > dist[u]) continue; for (const j of ADJ[u]) { const s = S[j], v = s.a === u ? s.b : s.a, nd = d + s.len; if (nd < dist[v]) { dist[v] = nd; prev[v] = j; push([nd, v]); } } }
    const pts = [[x1, y1]]; let u = b;
    while (u !== a && prev[u] >= 0) { const s = S[prev[u]], desdeB = s.b === u; const q = desdeB ? s.p.slice().reverse() : s.p; for (const p of q) pts.push(p); u = desdeB ? s.a : s.b; }
    pts.push([x0, y0]); pts.reverse(); return linea(pts);
  }
  const linea = (pts) => { const c = [0]; for (let k = 1; k < pts.length; k++) c.push(c[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); return { p: pts, cum: c, len: c[c.length - 1] || 1 }; };
  const sobre = (l, d) => { d = Math.max(0, Math.min(l.len, d)); let k = 1; while (k < l.cum.length - 1 && l.cum[k] < d) k++; const a = l.p[k - 1], b = l.p[k], f = (d - l.cum[k - 1]) / ((l.cum[k] - l.cum[k - 1]) || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
  const dentroPol = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  function puntoEn(P) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } for (let k = 0; k < 200; k++) { const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0); if (dentroPol(x, y, P)) return [x, y]; } return [(x0 + x1) / 2, (y0 + y1) / 2]; }
  const cerca = (c, r) => [c[0] + (Math.random() - 0.5) * 2 * r, c[1] + (Math.random() - 0.5) * 2 * r];

  /* ---------- actores ---------- */
  const FLUJO = { p: new Float32Array(S.length), v: new Float32Array(S.length) }; // pasos por tramo (análisis de agentes)
  const A = []; const IND = { rondas: 0, residuos: 0, registros: 0, huidas: 0, sustrato: 0, hongos: 0, entregado: 0, degust: 0, visitas: 0, polen: 0, cosecha: 0, humus: 0, lombricesComidas: 0 };
  const CNT = {}; const contar = (t, n) => { CNT[t] = (CNT[t] || 0) + n; };
  // tráfico y peatones (movimiento natural sobre la sintaxis espacial)
  const red = (tipo, n, veh, vel, beta, giro) => { for (let k = 0; k < n; k++) { const s = (veh ? sorteoVeh : sorteoPea)(); A.push({ tipo, red: true, veh, s, dir: Math.random() < 0.5 ? 1 : -1, d: Math.random() * S[s].len, vel: vel * (0.8 + Math.random() * 0.4), beta, giro, vis: true }); } contar(tipo, n); };
  red('carro', 520, true, 9, 1.6, 0.6); red('moto', 180, true, 11, 1.4, 0.8); red('camion', 60, true, 7, 1.2, 0.5); red('bici', 90, false, 4.5, 1.6, 0.7); red('peaton', 900, false, 1.3, 2.2, 0.9); // [SUP]
  // P1: habitantes y colectivos ambientales en el borde de cada humedal
  const HUM = D.humedales.map(h => ({ ...h, l: linea(h.borde) }));
  const P1n = { 'Humedal El Burro': [10, 8], 'Humedal La Vaca': [6, 5], 'Humedal de Techo': [4, 3] }; // [SUP] habitantes, colectivos
  const AVES_H = { 'Humedal El Burro': { tingua: 6, garza: 8, pato: 10, monjita: 16 }, 'Humedal La Vaca': { tingua: 3, garza: 4, pato: 6, monjita: 8 }, 'Humedal de Techo': { tingua: 1, garza: 2, pato: 4, monjita: 6 } }; // [SUP]
  for (const h of HUM) {
    const [nh, nc] = P1n[h.n] || [3, 2];
    for (let k = 0; k < nh + nc; k++) A.push({ tipo: k < nh ? 'hab' : 'col', ronda: h, d: Math.random() * h.l.len, sentido: Math.random() < 0.5 ? 1 : -1, vel: 1.0, prox: 60 + Math.random() * 120, pausa: 0, ini: Math.random() * 35, vis: false });
    contar('hab', nh); contar('col', nc);
    for (const [t, n] of Object.entries(AVES_H[h.n] || {})) { for (let k = 0; k < n; k++) { const p = puntoEn(h.poly); A.push({ tipo: t, ave: h, x: p[0], y: p[1], obj: puntoEn(h.poly), vel: t === 'garza' ? 0.5 : 0.35, vis: true }); } contar(t, n); }
  }
  // P2: biofábrica de hongos junto a Corabastos
  const BIO = D.biofabrica, CORA = D.corabastos.c, rRecu = ruta(CORA[0], CORA[1], BIO[0], BIO[1]);
  for (let k = 0; k < 12; k++) A.push({ tipo: 'madre', zona: BIO, rz: 30, x: BIO[0], y: BIO[1], obj: cerca(BIO, 30), pausa: 0, ini: Math.random() * 20, vis: false });
  for (let k = 0; k < 6; k++) A.push({ tipo: 'recu', lin: rRecu, d: Math.random() * rRecu.len, sentido: 1, vel: 1.1, carga: true, ini: Math.random() * 20, vis: false });
  for (let k = 0; k < 4; k++) A.push({ tipo: 'joven', zona: BIO, rz: 35, x: BIO[0], y: BIO[1], obj: cerca(BIO, 35), pausa: 0, ini: Math.random() * 20, vis: false });
  contar('madre', 12); contar('recu', 6); contar('joven', 4); contar('hongo', 600); // [SUP] 600 bolsas de orellana
  // P3: cocinas comunitarias, colegios y degustación barrial
  const COC = D.cocinas.map(c => ({ ...c }));
  for (const c of COC) { for (let k = 0; k < 4; k++) A.push({ tipo: 'cocinera', zona: c.p, rz: 14, x: c.p[0], y: c.p[1], obj: cerca(c.p, 14), pausa: 0, ini: Math.random() * 15, vis: false }); }
  contar('cocinera', COC.length * 4);
  const rEntrega = COC.map(c => ruta(BIO[0], BIO[1], c.p[0], c.p[1]));
  D.colegios.forEach((co) => {
    let ci = 0, bd = 1e18; COC.forEach((c, i) => { const d = Math.hypot(c.p[0] - co.p[0], c.p[1] - co.p[1]); if (d < bd) { bd = d; ci = i; } });
    const l = ruta(co.p[0], co.p[1], COC[ci].p[0], COC[ci].p[1]);
    for (let k = 0; k < 16; k++) A.push({ tipo: k ? 'nino' : 'maestra', grupo: l, coc: ci, d: -k * 2.2, fase: 0, vis: false, off: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4] });
  });
  contar('nino', D.colegios.length * 15); contar('maestra', D.colegios.length);
  for (const [ci, c] of COC.entries()) for (let k = 0; k < 18; k++) { const o = cerca(c.p, 380); A.push({ tipo: 'vecino', lin: ruta(o[0], o[1], c.p[0], c.p[1]), coc: ci, d: 0, ini: Math.random() * 25, vis: false, fase: 0 }); }
  contar('vecino', COC.length * 18);
  // P4: huertas en lotes baldíos
  const HUE = D.huertas.map(h => ({ ...h, colmena: [h.c[0] + 6, h.c[1] - 6], flores: Array.from({ length: 14 }, () => puntoEn(h.poly)), lomb: 2000 })); // [SUP] 2.000 lombrices por compostera
  for (const h of HUE) {
    for (let k = 0; k < 3; k++) A.push({ tipo: 'huertero', zona: h.c, pol: h.poly, x: h.c[0], y: h.c[1], obj: puntoEn(h.poly), pausa: 0, ini: Math.random() * 25, vis: false });
    for (let k = 0; k < 30; k++) A.push({ tipo: 'abeja', h, x: h.colmena[0], y: h.colmena[1], obj: null, pausa: Math.random() * 3, vis: false });
    for (let k = 0; k < 6; k++) { const p = puntoEn(h.poly); A.push({ tipo: 'copeton', h, x: p[0], y: p[1], obj: puntoEn(h.poly), vel: 0.8, vis: true }); }
    for (let k = 0; k < 3; k++) { const p = puntoEn(h.poly); A.push({ tipo: 'mirla', h, x: p[0], y: p[1], obj: puntoEn(h.poly), vel: 0.7, vis: true }); }
    for (let k = 0; k < 2; k++) { const p = puntoEn(h.poly); A.push({ tipo: 'colibri', h, x: p[0], y: p[1], obj: h.flores[0], vel: 6, pausa: 0, vis: true }); }
  }
  contar('huertero', HUE.length * 3); contar('abeja', HUE.length * 30); contar('copeton', HUE.length * 6); contar('mirla', HUE.length * 3); contar('colibri', HUE.length * 2); contar('lombriz', HUE.length * 2000);
  const bicis = rEntrega.map((l, i) => ({ tipo: 'recu', entrega: i, lin: l, d: 0, sentido: 1, vis: false })); // bicicargas de hongos a las cocinas (se ven como recuperadores)
  A.push(...bicis);
  // la red biótica (data3d/biotica.js) trae su propia fauna con forma 3D y movimiento por especie: aquí no se duplica
  const SIN = new Set(cfg.sinFauna || []);
  if (SIN.size) { for (let i = A.length - 1; i >= 0; i--) if (SIN.has(A[i].tipo)) A.splice(i, 1); for (const k of SIN) delete CNT[k]; }

  /* ---------- interfaz ---------- */
  const st0 = { t: H(6, 30), dia: 1, vel: 60, play: true, capa: 'i', agentes: true, conv: true };
  const izq = document.createElement('div'); izq.className = 'gs-pan gs-act'; izq.id = 'gs-izq';
  izq.innerHTML = `<h3>SIMULACIÓN <em id="gs-dia">DÍA 1</em></h3>
    <div class="gs-reloj"><svg id="gs-dial" viewBox="0 0 120 120" role="slider" tabindex="0" aria-label="Hora del día (24 horas): arrastra alrededor" aria-valuemin="0" aria-valuemax="1439"></svg><div><b id="gs-hora">06:30</b><small id="gs-jor">Antes de la jornada</small><em>Arrastra la bola alrededor: después de las 23:59 sigue la 00:00</em></div></div>
    <div class="gs-fila"><button id="gs-play">❚❚</button><button data-v="20">x20</button><button data-v="60" class="on">x60</button><button data-v="240">x240</button></div>
    <div class="gs-sub">SINTAXIS ESPACIAL <span>DepthmapX</span></div>
    <div class="gs-fila gs-fila3" id="gs-capa"><button data-c="i" class="on">Integración</button><button data-c="c">Elección</button><button data-c="">Apagar</button></div>
    <div class="gs-ley"><span>baja</span><i></i><span>alta</span></div>
    <div class="gs-fila" style="grid-template-columns:1fr 1fr"><button id="gs-ag" class="on">Agentes</button><button id="gs-cv-b" class="on">Convenciones</button></div>
    <div class="gs-sub">CONVENCIONES</div>
    ${Object.entries(CONV).map(([k, c]) => `<div class="gs-conv"><b style="background:${c.c}">${k}</b><div>${c.t}<small>${c.a} · ${c.h}</small></div></div>`).join('')}`;
  const der = document.createElement('div'); der.className = 'gs-pan'; der.id = 'gs-der';
  const fila = (k) => `<tr><td><i style="background:${ACT[k].c}"></i></td><td>${ACT[k].n}${ACT[k].p ? `<span class="p">${ACT[k].p}</span>` : ''}</td><td>${(CNT[k] || 0).toLocaleString('es-CO')}</td><td id="gs-a-${k}">–</td></tr>`;
  const H_ = Object.keys(ACT).filter(k => ACT[k].g === 'h'), NH = Object.keys(ACT).filter(k => ACT[k].g === 'n' && !SIN.has(k));
  const tot = (L) => L.reduce((s, k) => s + (CNT[k] || 0), 0).toLocaleString('es-CO');
  der.innerHTML = `<h3>ACTORES <em>total · activos</em></h3>
    <div class="gs-sub">HUMANOS <span>${tot(H_)}</span></div><table class="gs-t">${H_.map(fila).join('')}</table>
    <div class="gs-sub">NO HUMANOS <span>${tot(NH)}</span></div><table class="gs-t">${NH.map(fila).join('')}</table>
    <div class="gs-sub">LO QUE PASA HOY</div>
    <div class="gs-ind">
      <span>P1 recorridos de cuidado</span><b id="gs-i-rondas">0</b><span>P1 residuos recogidos</span><b id="gs-i-residuos">0</b><span>P1 registros de aves</span><b id="gs-i-registros">0</b>
      <span>P2 sustrato traído</span><b id="gs-i-sustrato">0</b><span>P2 hongos cosechados</span><b id="gs-i-hongos">0</b><span>P3 degustaciones</span><b id="gs-i-degust">0</b>
      <span>P4 visitas de abejas</span><b id="gs-i-visitas">0</b><span>P4 cosecha de huerta</span><b id="gs-i-cosecha">0</b><span>P4 humus de lombriz</span><b id="gs-i-humus">0</b>
    </div>
    <div class="gs-nota">Calles: análisis angular de segmentos (método DepthmapX) sobre OpenStreetMap. Cantidades y horarios son supuestos de escala [SUP] para discutir con el grupo.</div>`;
  const tog = document.createElement('button'); tog.id = 'gs-tog'; tog.textContent = 'DATOS';
  document.body.append(izq, der, tog);
  tog.onclick = () => { const on = !document.body.classList.contains('gs-abierto'); document.body.classList.toggle('gs-abierto', on); tog.classList.toggle('on', on); if (!on) return; const vis = izq.classList.contains('gs-act'); izq.classList.toggle('gs-act', !vis); der.classList.toggle('gs-act', vis); tog.textContent = vis ? 'ACTORES' : 'SIMULACIÓN'; };
  if (matchMedia('(max-width:760px)').matches) { izq.classList.remove('gs-act'); der.classList.add('gs-act'); }
  if (M3) T3.reloj = st0; // el cielo de 24 horas (data3d/cielo.js) sigue esta hora
  // reloj circular de 24 horas (0:00 arriba, sentido horario): se arrastra la bola alrededor y la hora sigue sin cortes por la medianoche
  const dial = $('gs-dial'), tl = dial;
  {
    const NS = 'http://www.w3.org/2000/svg', el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const col = (h) => h < 4.7 || h >= 19.3 ? '#16213f' : h < 5.6 ? '#6d4f8a' : h < 6.6 ? '#f59e5b' : h < 17.2 ? '#5cb8e6' : h < 18.1 ? '#f4a259' : '#c26b9a'; // noche, alba, amanecer, día, atardecer, anochecer
    const pt = (r, a) => [60 + r * Math.sin(a), 60 - r * Math.cos(a)];
    for (let i = 0; i < 96; i++) { const a0 = i / 96 * 6.2832, a1 = (i + 1.05) / 96 * 6.2832, [x0, y0] = pt(48, a0), [x1, y1] = pt(48, a1); dial.appendChild(el('path', { d: `M${x0.toFixed(2)} ${y0.toFixed(2)}A48 48 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, stroke: col(i / 4), 'stroke-width': 9, fill: 'none' })); }
    for (let h = 0; h < 24; h++) { const a = h / 24 * 6.2832, [x0, y0] = pt(38, a), [x1, y1] = pt(h % 6 ? 35.5 : 33, a); dial.appendChild(el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: h % 6 ? '#475569' : '#94a3b8', 'stroke-width': h % 6 ? 1 : 1.6 })); }
    for (const h of [0, 6, 12, 18]) { const [x, y] = pt(25, h / 24 * 6.2832); const tx = el('text', { x, y: y + 3.2, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: '#94a3b8', 'font-family': 'system-ui,sans-serif' }); tx.textContent = h; dial.appendChild(tx); }
    dial.appendChild(el('circle', { cx: 60, cy: 60, r: 3, fill: '#7dd3fc' }));
    const aguja = el('line', { x1: 60, y1: 60, x2: 60, y2: 16, stroke: '#7dd3fc', 'stroke-width': 1.6, 'stroke-linecap': 'round' }); dial.appendChild(aguja);
    const bola = el('circle', { cx: 60, cy: 12, r: 7.5, fill: '#e0f2fe', stroke: '#0ea5e9', 'stroke-width': 2.5 }); dial.appendChild(bola);
    dial.pintar = (T) => { const a = (T % 1440) / 1440 * 6.2832, [x, y] = pt(48, a), [ax, ay] = pt(40, a); bola.setAttribute('cx', x.toFixed(2)); bola.setAttribute('cy', y.toFixed(2)); aguja.setAttribute('x2', ax.toFixed(2)); aguja.setAttribute('y2', ay.toFixed(2)); dial.setAttribute('aria-valuenow', Math.floor(T)); dial.setAttribute('aria-valuetext', String(Math.floor(T / 60)).padStart(2, '0') + ':' + String(Math.floor(T % 60)).padStart(2, '0')); };
    const fijar = (nuevo) => { nuevo = ((nuevo % 1440) + 1440) % 1440; const d = nuevo - st0.t; if (d < -720) st0.dia++; else if (d > 720 && st0.dia > 1) st0.dia--; st0.t = nuevo; dial.pintar(st0.t); }; // cruzar la medianoche cambia el día
    const desdePuntero = (e) => { const r = dial.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); let a = Math.atan2(x, -y); if (a < 0) a += 6.2832; fijar(Math.round(a / 6.2832 * 1440)); };
    let arr = false;
    dial.addEventListener('pointerdown', (e) => { arr = true; dial.classList.add('arr'); dial.setPointerCapture(e.pointerId); desdePuntero(e); e.preventDefault(); });
    dial.addEventListener('pointermove', (e) => { if (arr) desdePuntero(e); });
    const soltar = () => { arr = false; dial.classList.remove('arr'); }; dial.addEventListener('pointerup', soltar); dial.addEventListener('pointercancel', soltar);
    dial.addEventListener('keydown', (e) => { const p = { ArrowRight: 15, ArrowUp: 15, ArrowLeft: -15, ArrowDown: -15, PageUp: 60, PageDown: -60 }[e.key]; if (p) { fijar(st0.t + p); e.preventDefault(); } });
    dial.pintar(st0.t);
  }
  $('gs-play').onclick = () => { st0.play = !st0.play; $('gs-play').textContent = st0.play ? '❚❚' : '▶'; };
  izq.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { st0.vel = +b.dataset.v; izq.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === b)); });
  izq.querySelectorAll('#gs-capa button').forEach(b => b.onclick = () => { st0.capa = b.dataset.c; izq.querySelectorAll('#gs-capa button').forEach(x => x.classList.toggle('on', x === b)); vCache = -1; if (M3) capa3D(); });
  $('gs-ag').onclick = (e) => { st0.agentes = !st0.agentes; e.currentTarget.classList.toggle('on', st0.agentes); if (M3) for (const m of Object.values(MALLAS)) m.visible = st0.agentes; };
  $('gs-cv-b').onclick = (e) => { st0.conv = !st0.conv; e.currentTarget.classList.toggle('on', st0.conv); vCache = -1; if (M3) ZONAS3D.visible = st0.conv; };

  /* ---------- capa fija por ángulo: calles con sintaxis espacial y zonas de las convenciones ---------- */
  let vCache = -1, W = 0, Hh = 0, dpr = 1;
  const Z0 = 0; // altura del suelo en el marco del render
  function dibujarFija() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, Hh);
    const P = GIRO.proyectar;
    if (st0.capa) {
      const clave = st0.capa, cubos = DEPTHMAP.map(() => [new Path2D(), new Path2D(), new Path2D()]); // color × grosor
      for (const s of S) {
        const v = s[clave], ci = Math.min(DEPTHMAP.length - 1, Math.floor(v * DEPTHMAP.length));
        let prev = null, zsum = 0, n = 0; const path = new Path2D(); let algo = false;
        for (const q of s.p) {
          const r = P(q[0], q[1], Z0);
          if (r && r[0] > -200 && r[0] < W + 200 && r[1] > -200 && r[1] < Hh + 200) { if (prev) path.lineTo(r[0], r[1]); else path.moveTo(r[0], r[1]); prev = r; zsum += r[2]; n++; algo = true; } else prev = null;
        }
        if (!algo || n < 2) continue;
        const z = zsum / Math.max(1, n), gi = z < 900 ? 0 : z < 2200 ? 1 : 2;
        cubos[ci][gi].addPath(path);
      }
      const anchos = [2.4, 1.5, 0.9];
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (let gi = 2; gi >= 0; gi--) for (let ci = 0; ci < DEPTHMAP.length; ci++) {
        g.globalAlpha = 0.16 + 0.26 * (ci / DEPTHMAP.length) * (gi === 2 ? 0.75 : 1); g.strokeStyle = colorDM((ci + 0.5) / DEPTHMAP.length); g.lineWidth = anchos[gi] * (0.75 + 0.5 * ci / DEPTHMAP.length); g.stroke(cubos[ci][gi]);
      }
      g.globalAlpha = 1;
    }
    if (st0.conv) {
      const poli = (pts, fill, stroke, w) => { const p = new Path2D(); let ok = 0; pts.forEach((q, k) => { const r = P(q[0], q[1], Z0); if (!r) return; ok++; k ? p.lineTo(r[0], r[1]) : p.moveTo(r[0], r[1]); }); if (ok < 3) return; p.closePath(); if (fill) { g.fillStyle = fill; g.fill(p); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke(p); } };
      for (const h of HUM) { g.setLineDash([7, 5]); poli(h.borde, null, CONV.P1.c, 2.4); g.setLineDash([]); poli(h.poly, 'rgba(52,211,153,.10)', null); }
      const circ = (c, r, col) => { const pts = []; for (let k = 0; k < 28; k++) pts.push([c[0] + Math.cos(k / 28 * 6.283) * r, c[1] + Math.sin(k / 28 * 6.283) * r]); poli(pts, col + '33', col, 2); };
      circ(BIO, 45, CONV.P2.c); for (const c of COC) circ(c.p, 26, CONV.P3.c);
      for (const h of HUE) poli(h.poly, 'rgba(132,204,22,.22)', CONV.P4.c, 2);
    }
  }
  const LBL = []; // rectángulos de las etiquetas P1-P4 (para el clic)
  function etiquetas() { // tarjetas P1-P4 encima de los agentes
    const P = proy, L = []; LBL.length = 0;
    if (st0.conv) {
      for (const h of HUM) { const q = h.borde[Math.floor(h.borde.length * 0.15)]; L.push(['P1', q, h.n.replace('Humedal ', '')]); }
      L.push(['P2', BIO, 'junto a Corabastos']); COC.forEach((c, i) => L.push(['P3', c.p, 'Cocina ' + (i + 1)])); HUE.forEach((h, i) => L.push(['P4', h.c, 'Lote ' + (i + 1)]));
    }
    g2.font = '700 11px system-ui,-apple-system,"Segoe UI",sans-serif'; g2.textBaseline = 'middle';
    for (const [k, q, sub] of L) {
      const r = P(q[0], q[1], 8); if (!r || r[0] < 0 || r[0] > W || r[1] < 60 || r[1] > Hh - 60 || r[2] > 4200) continue;
      const c = CONV[k], t1 = k + ' · ' + c.t, t2 = sub + ' · ' + c.h, big = r[2] < 1500;
      const w = big ? Math.max(g2.measureText(t1).width, g2.measureText(t2).width * 0.9) + 20 : g2.measureText(k).width + 14, x = r[0], y = r[1] - (big ? 46 : 26) - (k === 'P2' ? 48 : 0);
      g2.strokeStyle = c.c; g2.lineWidth = 1.2; g2.beginPath(); g2.moveTo(x, r[1]); g2.lineTo(x, y + (big ? 16 : 9)); g2.stroke();
      g2.fillStyle = 'rgba(8,16,26,.86)'; g2.beginPath(); g2.roundRect(x - w / 2, y - (big ? 16 : 9), w, big ? 32 : 18, 8); g2.fill(); g2.stroke(); LBL.push({ k, q, sub, x: x - w / 2, y: y - (big ? 16 : 9), w, h: big ? 32 : 18 });
      g2.fillStyle = c.c; g2.textAlign = 'center';
      if (big) { g2.fillText(t1, x, y - 6); g2.font = '500 10px system-ui,sans-serif'; g2.fillStyle = '#cbd5e1'; g2.fillText(t2, x, y + 8); g2.font = '700 11px system-ui,-apple-system,"Segoe UI",sans-serif'; }
      else g2.fillText(k, x, y);
    }
    g2.textAlign = 'left';
  }

  /* ---------- un paso de simulación ---------- */
  const mover2 = (a, vel, dt) => { const dx = a.obj[0] - a.x, dy = a.obj[1] - a.y, d = Math.hypot(dx, dy); if (d < 0.6) return true; const s = Math.min(d, vel * dt); a.x += dx / d * s; a.y += dy / d * s; return false; };
  function paso(dtR) {
    const T = st0.t, dtS = st0.play ? dtR * st0.vel / 60 : 0, F = Math.min(st0.vel, 8) * (st0.play ? 1 : 0), dt = dtR * F, dtT = dtS * 60; // dtT: segundos simulados (recorridos con horario) // dtS en minutos simulados; dt en segundos "visuales"
    if (st0.play) { st0.t += dtS; if (st0.t >= H(24)) { st0.t -= H(24); st0.dia++; for (const k of Object.keys(IND)) IND[k] = 0; } } // reloj de 24 horas: a medianoche empieza el día siguiente
    const humanos = [];
    for (const a of A) {
      if (a.red) { // tráfico y peatones
        a.d += a.vel * dt;
        while (a.d > S[a.s].len) { FLUJO[a.veh ? 'v' : 'p'][a.s]++; const s = S[a.s], nodo = a.dir > 0 ? s.b : s.a, r = enTramo(s, a.dir > 0 ? s.len : 0)[2] + (a.dir > 0 ? 0 : Math.PI); a.d -= s.len; const j = siguiente(a, nodo, r); a.dir = S[j].a === nodo ? 1 : -1; a.s = j; }
        const s = S[a.s], p = enTramo(s, a.dir > 0 ? a.d : s.len - a.d); a.x = p[0]; a.y = p[1];
        if (a.tipo === 'peaton') humanos.push(a);
        continue;
      }
      switch (a.tipo) {
        case 'hab': case 'col': {
          const on = enJornada('P1', T - a.ini); a.vis = on; if (!on) break;
          if (a.pausa > 0) { a.pausa -= dtS; if (a.pausa <= 0) { IND.residuos += a.tipo === 'col' ? 0.6 : 0.3; IND.registros += Math.random() < 0.7 ? 1 + Math.floor(Math.random() * 3) : 0; } }
          else { const m = a.vel * dt; a.d = (a.d + a.sentido * m + a.ronda.l.len) % a.ronda.l.len; IND.rondas += a.vel * dtS * 60 / 1000; a.prox -= m; if (a.prox <= 0) { a.pausa = 4 + Math.random() * 8; a.ev = (a.ev || 0) + 1; a.prox = 70 + Math.random() * 110; } }
          const p = sobre(a.ronda.l, a.d); a.x = p[0]; a.y = p[1]; humanos.push(a); break;
        }
        case 'madre': case 'joven': case 'cocinera': case 'huertero': {
          const pk = ACT[a.tipo].p, on = enJornada(pk, T - a.ini); a.vis = on; if (!on) break;
          if (a.pausa > 0) { a.pausa -= dtS; if (a.pausa <= 0) { if (a.tipo === 'madre') IND.hongos += 0.35; if (a.tipo === 'huertero') IND.cosecha += 0.4; } }
          else if (mover2(a, 0.9, dt)) { a.pausa = 3 + Math.random() * 9; a.ev = (a.ev || 0) + 1; a.obj = a.pol ? puntoEn(a.pol) : cerca(a.zona, a.rz); }
          humanos.push(a); break;
        }
        case 'recu': {
          if (a.entrega !== undefined) { // bicicarga con hongos hacia la cocina, a las 9:00
            const on = T >= H(9) && T < H(11); a.vis = on && a.d < a.lin.len * 2; if (!a.vis) { if (T < H(9)) a.d = 0; break; }
            a.d += 4 * dtT; const ida = a.d <= a.lin.len, p = sobre(a.lin, ida ? a.d : 2 * a.lin.len - a.d); a.x = p[0]; a.y = p[1];
            if (!ida && !a.ok) { a.ok = true; IND.entregado += 25; } if (T < H(9, 5)) a.ok = false; break;
          }
          const on = enJornada('P2', T - a.ini); a.vis = on; if (!on) break;
          a.d += a.sentido * 1.1 * dtT;
          if (a.d >= a.lin.len) { a.d = a.lin.len; a.sentido = -1; IND.sustrato += 40; a.ev = (a.ev || 0) + 1; } else if (a.d <= 0) { a.d = 0; a.sentido = 1; }
          const p = sobre(a.lin, a.d); a.x = p[0]; a.y = p[1]; humanos.push(a); break;
        }
        case 'nino': case 'maestra': { // grupos escolares: salen 10:00, degustación 10:30-11:30, regresan
          const l = a.grupo, ida = T >= H(10) && T < H(11, 30), vuelta = T >= H(11, 30) && T < H(12, 30);
          a.vis = ida || vuelta; if (!a.vis) { a.d = a.d0 === undefined ? (a.d0 = a.d) : a.d0; a.fase = 0; break; }
          if (ida) { if (a.d < l.len) a.d = Math.min(l.len, a.d + 1.1 * dtT); else if (!a.fase) { a.fase = 1; IND.degust++; a.ev = (a.ev || 0) + 1; } }
          else a.d = Math.max(0, a.d - 1.1 * dtT);
          const p = sobre(l, a.d), j = a.d >= l.len - 0.5 ? 6 : 1; a.x = p[0] + a.off[0] * j; a.y = p[1] + a.off[1] * j; humanos.push(a); break;
        }
        case 'vecino': { // degustación de la tarde 15:00-16:00
          const l = a.lin, ida = T >= H(14, 40) + a.ini && T < H(16), vuelta = T >= H(16) && T < H(16, 40);
          a.vis = ida || vuelta; if (!a.vis) { a.d = 0; a.fase = 0; break; }
          if (ida) { if (a.d < l.len) a.d = Math.min(l.len, a.d + 1.2 * dtT); else if (!a.fase) { a.fase = 1; IND.degust++; a.ev = (a.ev || 0) + 1; } } else a.d = Math.max(0, a.d - 1.2 * dtT);
          const p = sobre(l, a.d); a.x = p[0]; a.y = p[1]; humanos.push(a); break;
        }
        default: break;
      }
    }
    // no humanos: reaccionan a las personas cercanas
    const cercaHumano = (x, y, r) => { for (const h of humanos) if (h.vis !== false && Math.abs(h.x - x) < r && Math.abs(h.y - y) < r && Math.hypot(h.x - x, h.y - y) < r) return h; return null; };
    for (const a of A) {
      switch (a.tipo) {
        case 'tingua': case 'garza': case 'pato': case 'monjita': {
          const h = cercaHumano(a.x, a.y, a.tipo === 'garza' ? 35 : 25);
          if (h && !a.huye) { a.huye = 1; IND.huidas++; a.ev = (a.ev || 0) + 1; const dx = a.x - h.x, dy = a.y - h.y, d = Math.hypot(dx, dy) || 1; let o = [a.x + dx / d * 60, a.y + dy / d * 60]; if (!dentroPol(o[0], o[1], a.ave.poly)) o = puntoEn(a.ave.poly); a.obj = o; }
          if (mover2(a, a.huye ? (a.tipo === 'garza' ? 5 : 2) : a.vel, dt)) { a.huye = 0; a.obj = Math.random() < 0.7 ? cerca([a.x, a.y], 25) : puntoEn(a.ave.poly); if (!dentroPol(a.obj[0], a.obj[1], a.ave.poly)) a.obj = puntoEn(a.ave.poly); }
          break;
        }
        case 'abeja': { // pecorea entre 9:00 y 16:00: de la colmena a una flor y de vuelta
          a.vis = T >= H(9) && T < H(16); if (!a.vis) { a.x = a.h.colmena[0]; a.y = a.h.colmena[1]; break; }
          if (a.pausa > 0) { a.pausa -= dtS; break; }
          if (!a.obj) a.obj = Math.random() < 0.85 ? a.h.flores[Math.floor(Math.random() * a.h.flores.length)] : cerca(a.h.c, 220);
          if (mover2(a, 5, dt)) { if (a.obj === a.h.colmena) { a.obj = null; a.pausa = 1 + Math.random() * 2; } else { IND.visitas++; IND.polen += 0.02; a.ev = (a.ev || 0) + 1; a.pausa = 0.5 + Math.random(); a.obj = a.h.colmena; } }
          break;
        }
        case 'copeton': case 'mirla': {
          const h = cercaHumano(a.x, a.y, 12);
          if (h) { const dx = a.x - h.x, dy = a.y - h.y, d = Math.hypot(dx, dy) || 1; a.obj = [a.x + dx / d * 25, a.y + dy / d * 25]; if (!a.huye) { a.huye = 1; IND.huidas++; a.ev = (a.ev || 0) + 1; } }
          if (mover2(a, a.huye ? 6 : a.vel, dt)) { a.huye = 0; a.obj = puntoEn(a.h.poly); if (a.tipo === 'mirla' && Math.random() < 0.15) { IND.lombricesComidas++; } }
          break;
        }
        case 'colibri': {
          if (a.pausa > 0) { a.pausa -= dtS; break; }
          if (mover2(a, a.vel, dt)) { a.pausa = 0.3 + Math.random() * 0.6; a.obj = a.h.flores[Math.floor(Math.random() * a.h.flores.length)]; IND.visitas++; a.ev = (a.ev || 0) + 1; }
          break;
        }
      }
    }
    // lombrices: transforman el compost en humus (0,3 g por lombriz y día de actividad) [SUP]
    for (const h of HUE) { IND.humus += h.lomb * 0.0003 * dtS / 60 * (T > H(6) && T < H(19) ? 1 : 0.5); h.lomb += h.lomb * 0.00002 * dtS - (IND.lombricesComidas > (h.comidas || 0) ? 1 : 0); h.comidas = IND.lombricesComidas; }
  }

  /* ---------- dibujo de agentes ---------- */
  function dibujarAgentes() {
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, Hh);
    const P = proy, foco = Hh / (2 * Math.tan(Math.atan(18 / 20) / 1.7778)); // aprox. píxeles por metro a 1 m
    const activos = {};
    if (st0.agentes) {
      const lotes = {};
      for (const a of A) {
        if (a.vis === false) continue;
        activos[a.tipo] = (activos[a.tipo] || 0) + 1;
        const r = P(a.x, a.y, a.tipo === 'garza' || a.tipo === 'abeja' || a.tipo === 'colibri' ? 3 : 1.2); if (!r || r[0] < -5 || r[0] > W + 5 || r[1] < -5 || r[1] > Hh + 5 || r[2] > 3200) continue;
        const t = ACT[a.tipo], px = Math.max(a.red ? 1 : 1.6, Math.min(7, t.r * 2.4 * 780 / r[2]));
        (lotes[a.tipo] = lotes[a.tipo] || []).push(r[0], r[1], px, a.pausa > 0 ? 1 : 0);
      }
      for (const [k, L] of Object.entries(lotes)) {
        const t = ACT[k]; g2.fillStyle = t.c;
        const borde = t.p && k !== 'abeja';
        for (let i = 0; i < L.length; i += 4) {
          const x = L[i], y = L[i + 1], r = L[i + 2];
          g2.beginPath(); g2.arc(x, y, r, 0, 6.283); g2.fill();
          if (borde) { g2.strokeStyle = 'rgba(4,18,28,.85)'; g2.lineWidth = 1; g2.stroke(); }
          if (L[i + 3] && t.g === 'h') { g2.strokeStyle = t.c; g2.globalAlpha = 0.55; g2.beginPath(); g2.arc(x, y, r + 4, 0, 6.283); g2.stroke(); g2.globalAlpha = 1; }
        }
      }
    }
    etiquetas();
    return activos;
  }

  /* ---------- modo maqueta 3D: calles pintadas en el suelo, zonas de las convenciones y agentes 3D ---------- */
  const MALLAS = {}, Y0 = 2.0;
  let ZONAS3D = null, CINTAS = null, COLS = null, capa3D = () => {}, actualizar3D = () => ({}), flujo3D = () => {}, seleccion = () => {};
  if (M3) {
    window.KEN3D = T3; // para depurar desde la consola
    const THREE = T3.THREE, rgb = (v) => { const c = DEPTHMAP[Math.min(DEPTHMAP.length - 1, Math.floor(v * DEPTHMAP.length))]; return [c[0] / 255, c[1] / 255, c[2] / 255]; };
    // calles: cintas sobre el suelo con el ancho de la vía y el color de DepthmapX
    const pos = [], cI = [], cC = [], idx = [], RANGO = [];
    const ANCHO = { 5: 16, 4: 13, 3: 10.5, 2: 8.5 };
    for (let si = 0; si < S.length; si++) { const s = S[si];
      const m = s.p[Math.floor(s.p.length / 2)]; if (Math.hypot(m[0], m[1]) > 3800 || s.p.length < 2) continue;
      const w = (s.v ? (ANCHO[s.j] || 6.5) : 2.6) / 2, ci = rgb(s.i), cc = rgb(s.c), base = pos.length / 3, n = s.p.length; RANGO.push([si, base, n]);
      for (let k = 0; k < n; k++) {
        const a = s.p[Math.max(0, k - 1)], b = s.p[Math.min(n - 1, k + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const x = s.p[k][0] + OX, z = s.p[k][1] + OZ;
        pos.push(x - dy * w, Y0 + s.j * 0.01, z + dx * w, x + dy * w, Y0 + s.j * 0.01, z - dx * w);
        cI.push(...ci, ...ci); cC.push(...cc, ...cc);
        if (k < n - 1) { const v = base + k * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); COLS = { i: new Float32Array(cI), c: new Float32Array(cC) };
    geo.setAttribute('color', new THREE.BufferAttribute(COLS.i.slice(), 3)); geo.setIndex(idx);
    CINTAS = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 }));
    CINTAS.renderOrder = 2; CINTAS.frustumCulled = false; T3.scene.add(CINTAS);
    capa3D = () => { if (!st0.capa) { CINTAS.visible = false; return; } CINTAS.visible = true; geo.attributes.color.array.set(COLS[st0.capa]); geo.attributes.color.needsUpdate = true; };
    // convenciones: borde de cuidado de los humedales, biofábrica, cocinas y huertas pintados en el suelo
    ZONAS3D = new THREE.Group(); T3.scene.add(ZONAS3D);
    const matZ = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 });
    const cinta = (pts, w, c, o, cerrada) => { const P = [], I = []; const n = pts.length; for (let k = 0; k < n; k++) { const a = pts[(k - 1 + n) % n], b = pts[(k + 1) % n]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const x = pts[k][0] + OX, z = pts[k][1] + OZ; P.push(x - dy * w, Y0 + 0.1, z + dx * w, x + dy * w, Y0 + 0.1, z - dx * w); if (k < n - 1 || cerrada) { const v = k * 2, u = ((k + 1) % n) * 2; I.push(v, v + 1, u, v + 1, u + 1, u); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); const m = new THREE.Mesh(g, matZ(c, o)); m.renderOrder = 3; ZONAS3D.add(m); };
    const relleno = (pts, c, o) => { const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0] + OX, -(p[1] + OZ)))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, Y0 + 0.08, 0); const m = new THREE.Mesh(g, matZ(c, o)); m.renderOrder = 3; ZONAS3D.add(m); };
    const circulo = (c, r) => { const pts = []; for (let k = 0; k < 40; k++) pts.push([c[0] + Math.cos(k / 40 * 6.283) * r, c[1] + Math.sin(k / 40 * 6.283) * r]); return pts; };
    for (const h of HUM) cinta(h.borde, 2.2, CONV.P1.c, 0.9, true);
    relleno(circulo(BIO, 45), CONV.P2.c, 0.32); cinta(circulo(BIO, 45), 1.5, CONV.P2.c, 0.95, true);
    for (const c of COC) { relleno(circulo(c.p, 26), CONV.P3.c, 0.32); cinta(circulo(c.p, 26), 1.3, CONV.P3.c, 0.95, true); }
    for (const h of HUE) { relleno(h.poly, CONV.P4.c, 0.35); cinta(h.poly, 1.2, CONV.P4.c, 0.95, true); }
    // agentes: cajas para vehículos, cápsulas para personas, esferas para aves y abejas (escala de maqueta: los animales se ven más grandes)
    const FORMA = { carro: [1.9, 1.5, 4.3], moto: [0.8, 1.3, 2], camion: [2.5, 3.2, 8], bici: [0.7, 1.4, 1.8] };
    const ALTO = { tingua: 0.6, garza: 1.4, pato: 0.4, monjita: 1.6, copeton: 0.8, mirla: 0.9, colibri: 2.2, abeja: 1.6 };
    const cuantos = {}; for (const a of A) cuantos[a.tipo] = (cuantos[a.tipo] || 0) + 1;
    for (const [k, t] of Object.entries(ACT)) {
      if (!cuantos[k] || (cfg.sinMalla || []).includes(k)) continue; // sinMalla: la lógica sigue (indicadores P4) pero se dibuja en la red biótica
      let g;
      if (FORMA[k]) { g = new THREE.BoxGeometry(...FORMA[k]); g.translate(0, FORMA[k][1] / 2, 0); }
      else if (t.g === 'h') { const nino = k === 'nino', r = nino ? 0.24 : 0.3; g = new THREE.CapsuleGeometry(r, nino ? 0.7 : 1.15, 3, 8); g.translate(0, (nino ? 0.7 : 1.15) / 2 + r, 0); }
      else { g = new THREE.SphereGeometry(Math.max(0.35, t.r * 0.55), 10, 8); }
      const col = new THREE.Color(t.c);
      const m = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: col, emissive: col.clone().multiplyScalar(0.35) }), cuantos[k]);
      m.count = 0; m.frustumCulled = false; m.castShadow = !!FORMA[k]; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(m); MALLAS[k] = m;
    }
    // ---- luces de los vehículos de noche (T3.noche: 0 de día, 1 de noche; la pone data3d/cielo.js): faros, luces traseras y haz en el piso ----
    const LUZ = {}; // tipo -> [faros, traseras, haz] (mismas matrices que la caja; el frente es +z)
    {
      const haz = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,236,200,0.9)'); gr.addColorStop(1, 'rgba(255,236,200,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(24, 128); x.lineTo(40, 128); x.lineTo(64, 0); x.lineTo(0, 0); x.closePath(); x.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
      const mFaro = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.9, 2.3), toneMapped: false }), mRoja = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.15, 0.1), toneMapped: false });
      const mHaz = new THREE.MeshBasicMaterial({ map: haz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const unir = (L) => { const G = L.map(g => g.toNonIndexed()), n = G.reduce((s, g) => s + g.attributes.position.count, 0), P = new Float32Array(n * 3); let o = 0; for (const g of G) { P.set(g.attributes.position.array, o); o += g.attributes.position.array.length; } const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); return r; };
      for (const k of Object.keys(FORMA)) {
        if (!MALLAS[k]) continue; const [w, h, l] = FORMA[k], par = k === 'carro' || k === 'camion';
        const caja = (x, y, z, sx, sy, sz) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g; };
        const faros = unir(par ? [caja(-w * 0.32, h * 0.42, l / 2 + 0.03, 0.34, 0.16, 0.06), caja(w * 0.32, h * 0.42, l / 2 + 0.03, 0.34, 0.16, 0.06)] : [caja(0, h * 0.6, l / 2 + 0.03, 0.18, 0.14, 0.06)]);
        const rojas = unir(par ? [caja(-w * 0.36, h * 0.48, -l / 2 - 0.03, 0.26, 0.2, 0.06), caja(w * 0.36, h * 0.48, -l / 2 - 0.03, 0.26, 0.2, 0.06)] : [caja(0, h * 0.55, -l / 2 - 0.03, 0.14, 0.1, 0.05)]);
        const lh = k === 'bici' ? 5 : 13, gh = new THREE.PlaneGeometry(par ? w * 1.9 : 1.6, lh); gh.rotateX(-Math.PI / 2); gh.translate(0, 0.12, l / 2 + lh / 2);
        const im = (g, m) => { const x = new THREE.InstancedMesh(g, m, cuantos[k]); x.count = 0; x.frustumCulled = false; x.visible = false; x.instanceMatrix = MALLAS[k].instanceMatrix; T3.scene.add(x); return x; };
        LUZ[k] = [im(faros, mFaro), im(rojas, mRoja), im(gh, mHaz)];
      }
      LUZ._haz = mHaz;
    }
    const d = new THREE.Object3D(), n = {};
    actualizar3D = () => {
      const activos = {}; for (const k in n) n[k] = 0;
      for (const a of A) {
        const m = MALLAS[a.tipo]; if (!m || a.vis === false || a.x === undefined) { if (a.vis !== false && a.x !== undefined) activos[a.tipo] = (activos[a.tipo] || 0) + 1; continue; }
        activos[a.tipo] = (activos[a.tipo] || 0) + 1;
        const dx = a.x - (a.px ?? a.x), dy = a.y - (a.py ?? a.y); if (dx * dx + dy * dy > 1e-4) a.rot = Math.atan2(dx, dy); a.px = a.x; a.py = a.y;
        d.position.set(a.x + OX, Y0 + (ALTO[a.tipo] || 0), a.y + OZ); d.rotation.set(0, a.rot || 0, 0); d.scale.setScalar(ACT[a.tipo].g === 'n' && !FORMA[a.tipo] ? 2.2 : 1); d.updateMatrix();
        const i = n[a.tipo] = (n[a.tipo] || 0); m.setMatrixAt(i, d.matrix); n[a.tipo] = i + 1;
      }
      for (const [k, m] of Object.entries(MALLAS)) { m.count = n[k] || 0; m.instanceMatrix.needsUpdate = true; }
      const noche = T3.noche || 0; // luces de los vehículos: se prenden al atardecer
      for (const k of Object.keys(LUZ)) if (k !== '_haz') for (const x of LUZ[k]) { x.visible = noche > 0.05; x.count = n[k] || 0; }
      LUZ._haz.opacity = Math.min(1, noche) * 0.55;
      g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, Hh); etiquetas(); seleccion(1 / 60);
      return activos;
    };

    // ---- look del giro de Unreal: imagen clara, un poco más saturada y sin viñeta oscura ----
    T3.renderer.domElement.style.filter = 'saturate(0.92) contrast(1.02)';
    { const gr = document.getElementById('grade'); if (gr) gr.style.display = 'none'; }
    // ---- capa de flujo de agentes (análisis de agentes, como el "gate count" de DepthmapX): cuántos pasan por cada tramo ----
    const pf = new Float32Array(pos.length);
    for (let k = 0; k < pos.length; k += 6) for (let q = 0; q < 3; q++) { const L = pos[k + q], Rr = pos[k + 3 + q], mid = (L + Rr) / 2; pf[k + q] = mid + (L - mid) * 0.36; pf[k + 3 + q] = mid + (Rr - mid) * 0.36; }
    for (let k = 1; k < pf.length; k += 3) pf[k] += 0.12;
    const gf = new THREE.BufferGeometry(), colF = new Float32Array(pos.length / 3 * 4);
    gf.setAttribute('position', new THREE.BufferAttribute(pf, 3)); gf.setAttribute('color', new THREE.BufferAttribute(colF, 4)); gf.setIndex(idx);
    const FLUJO3D = new THREE.Mesh(gf, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -20 }));
    FLUJO3D.renderOrder = 3; FLUJO3D.visible = false; FLUJO3D.frustumCulled = false; T3.scene.add(FLUJO3D);
    flujo3D = () => {
      if (!st0.flujo) { FLUJO3D.visible = false; return; } FLUJO3D.visible = true;
      const Fv = FLUJO[st0.flujo], vals = []; for (const r of RANGO) if (Fv[r[0]] > 0) vals.push(Fv[r[0]]); vals.sort((a, b) => a - b);
      const q = (v) => { let lo = 0, hi = vals.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] < v) lo = m + 1; else hi = m; } return lo / Math.max(1, vals.length - 1); };
      for (const [si, base, n] of RANGO) { const v = Fv[si], cc = v > 0 ? rgb(q(v)) : [0, 0, 0], al = v > 0 ? 0.95 : 0; for (let k = 0; k < n * 2; k++) { const o = (base + k) * 4; colF[o] = cc[0]; colF[o + 1] = cc[1]; colF[o + 2] = cc[2]; colF[o + 3] = al; } }
      gf.attributes.color.needsUpdate = true;
    };
    setInterval(() => flujo3D(), 2000);
    izq.querySelector('.gs-ley').insertAdjacentHTML('afterend', `<div class="gs-sub">FLUJO DE AGENTES <span>conteo por tramo</span></div>
      <div class="gs-fila gs-fila3" id="gs-flujo"><button data-f="p">Peatones</button><button data-f="v">Vehículos</button><button data-f="" class="on">Apagar</button></div>`);
    izq.querySelectorAll('#gs-flujo button').forEach(b => b.onclick = () => { st0.flujo = b.dataset.f; izq.querySelectorAll('#gs-flujo button').forEach(x => x.classList.toggle('on', x === b)); flujo3D(); });

    // ---- clic en un agente o en una convención: ficha con su comportamiento, sus interacciones y su ruta ----
    const REGLA = {
      carro: 'Movimiento natural: en cada cruce elige el tramo siguiente según la ELECCIÓN angular (sintaxis espacial) y prefiere seguir derecho.',
      moto: 'Como los carros, pero gira más y va más rápido: elige por ELECCIÓN angular.', camion: 'Prefiere las vías arteriales (jerarquía alta) y la ELECCIÓN angular; abastece Corabastos.',
      bici: 'Elige por INTEGRACIÓN angular: calles a mano, con pocos giros.', peaton: 'Movimiento natural: elige por INTEGRACIÓN angular; por eso se concentra en las calles más integradas.',
      hab: 'En jornada diurna (7:00–11:30) y después del almuerzo (14:00–17:30) recorre el borde del humedal; cada 70–180 m se detiene 4–12 min a revisar el agua y registrar aves.',
      col: 'Recorre el borde del humedal en las dos jornadas; en cada parada recoge residuos (0,6 kg) y hace registro de aves.',
      madre: 'En la biofábrica (8:00–12:00 y 13:30–16:30) inocula bolsas con el sustrato de Corabastos y cosecha orellanas.',
      recu: 'Lleva sustrato orgánico de Corabastos a la biofábrica (40 kg por viaje) y vuelve; a las 9:00 sale la bicicarga con hongos a las cocinas.',
      joven: 'Aprende el oficio en la biofábrica junto a las madres comunitarias.', cocinera: 'Cocina con los hongos (P2) y la cosecha de las huertas (P4) y atiende la degustación barrial.',
      nino: 'Sale del colegio a las 10:00 con su maestra, camina a la cocina, prueba los alimentos (10:30–11:30) y regresa.', maestra: 'Acompaña al grupo del colegio a la degustación.',
      vecino: 'Llega desde su casa a la degustación de la tarde (15:00–16:00).', huertero: 'Siembra, riega y cosecha en el lote baldío (7:00–10:00 y 15:00–17:30).',
      tingua: 'Se mueve dentro del humedal; si una persona se acerca a menos de 25 m, huye.', garza: 'Camina en el humedal; si una persona se acerca a menos de 35 m, vuela a otra parte.',
      pato: 'Nada en el humedal; huye si una persona se acerca a menos de 25 m.', monjita: 'Vive en el juncal; huye si una persona se acerca a menos de 25 m.',
      abeja: 'Entre 9:00 y 16:00 vuela de la colmena a las flores de la huerta (poliniza) y vuelve.', copeton: 'Come semillas en la huerta; huye si un huertero se acerca a 12 m.',
      mirla: 'Busca lombrices en la huerta; huye si un huertero se acerca a 12 m.', colibri: 'Visita las flores de la huerta muy rápido (néctar).'
    };
    const INTER = {
      P1: 'Agente–agente: las personas que recorren el borde hacen que tinguas, garzas, patos y monjitas se alejen. Agente–entorno: cada parada recoge residuos y registra aves en el sendero de borde, a 22 m del agua.',
      P2: 'Corabastos (entorno) produce el residuo orgánico; los recuperadores lo llevan a la biofábrica; las madres comunitarias y los jóvenes lo convierten en orellanas; a las 9:00 las bicicargas las llevan a las cocinas (P3).',
      P3: 'Las cocineras cocinan con hongos (P2) y cosecha de huertas (P4); los niños llegan a las 10:30 y los vecinos a las 15:00 caminando por las calles más integradas.',
      P4: 'Las abejas polinizan las flores de la huerta; copetones y mirlas comen semillas y lombrices y se alejan de los huerteros; las lombrices convierten el compost en humus.'
    };
    const estado = (a) => a.vis === false ? 'Fuera de jornada' : a.huye ? 'Huyendo de una persona' : a.pausa > 0 ? ({ hab: 'Detenido: revisa el agua y registra aves', col: 'Detenido: recoge residuos', madre: 'Inoculando o cosechando', joven: 'Aprendiendo', cocinera: 'Cocinando', huertero: 'Sembrando o regando', abeja: 'En una flor', colibri: 'Tomando néctar' }[a.tipo] || 'Detenido')
      : a.red ? 'Circulando por ' + (S[a.s].v ? 'una vía' : 'un andén') + ' · integración ' + Math.round(S[a.s].i * 100) + ' % · elección ' + Math.round(S[a.s].c * 100) + ' %' : (a.sentido < 0 ? 'De regreso' : a.lin || a.grupo || a.ronda ? 'En camino' : 'Moviéndose');
    const RUTA3D = new THREE.Group(); T3.scene.add(RUTA3D);
    const limpiarRuta = () => { while (RUTA3D.children.length) { const m = RUTA3D.children.pop(); m.geometry.dispose(); m.material.dispose(); } };
    const trazo = (pts, w, color, cerrada, grupo = RUTA3D) => {
      if (!pts || pts.length < 2) return; const P = [], I = [], n = pts.length;
      for (let k = 0; k < n; k++) { const a = pts[cerrada ? (k - 1 + n) % n : Math.max(0, k - 1)], b = pts[cerrada ? (k + 1) % n : Math.min(n - 1, k + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const x = pts[k][0] + OX, z = pts[k][1] + OZ; P.push(x - dy * w, Y0 + 0.35, z + dx * w, x + dy * w, Y0 + 0.35, z - dx * w); if (k < n - 1 || cerrada) { const v = k * 2, u = ((k + 1) % n) * 2; I.push(v, v + 1, u, v + 1, u + 1, u); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -30 })); m.renderOrder = 6; m.frustumCulled = false; grupo.add(m); return m;
    };
    const ficha = document.createElement('div'); ficha.id = 'gs-ficha'; document.body.appendChild(ficha);
    const fst = document.createElement('style'); fst.textContent = `#gs-ficha{position:fixed;z-index:12;left:50%;bottom:96px;transform:translateX(-50%);width:min(440px,calc(100vw - 24px));padding:13px 14px;border-radius:14px;background:rgba(8,16,26,.9);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(125,211,252,.3);color:#e2f3ff;font:12px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;display:none}
      #gs-ficha.on{display:block}#gs-ficha h4{margin:0 26px 2px 0;font-size:14px;display:flex;gap:8px;align-items:center}#gs-ficha h4 b{font-size:10px;padding:2px 7px;border-radius:6px;color:#04121c}
      #gs-ficha .es{color:#7dd3fc;font-weight:600;margin:4px 0}#gs-ficha p{margin:4px 0;color:#cbd5e1}#gs-ficha .bt{display:flex;gap:6px;margin-top:8px}#gs-ficha button{height:30px;padding:0 12px;border:none;border-radius:8px;background:rgba(255,255,255,.08);color:#e2f3ff;font:700 10px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}
      #gs-ficha button.on{background:#7dd3fc;color:#04121c}#gs-ficha .x{position:absolute;right:8px;top:8px;width:26px;padding:0}
      @media(max-width:760px){#gs-ficha{bottom:calc(max(18px,env(safe-area-inset-bottom)) + 56px)}}`; document.head.appendChild(fst);
    let SEL = null;
    const cerrarFicha = () => { SEL = null; ficha.classList.remove('on'); limpiarRuta(); };
    const volar = (x, y, dist) => { const t = new THREE.Vector3(x + OX, 0, y + OZ), c = T3.camera.position, v = c.clone().sub(T3.orbit.target); v.setLength(dist); T3.anim = { t: 0, dur: 1.2, p0: c.clone(), p1: t.clone().add(v), c0: T3.orbit.target.clone(), c1: t }; };
    function abrirAgente(a) {
      limpiarRuta(); const t = ACT[a.tipo], col = t.c;
      SEL = { a, seguir: true, rastro: [], tR: 0 };
      if (a.ronda) trazo(a.ronda.l.p, 1.4, col, true);
      else if (a.lin) trazo(a.lin.p, 1.4, col);
      else if (a.grupo) trazo(a.grupo.p, 1.4, col);
      else if (a.pol) trazo(a.pol, 1, col, true);
      else if (a.zona) { const pts = []; for (let k = 0; k < 40; k++) pts.push([a.zona[0] + Math.cos(k / 40 * 6.283) * a.rz, a.zona[1] + Math.sin(k / 40 * 6.283) * a.rz]); trazo(pts, 1, col, true); }
      else if (a.ave) trazo(a.ave.poly, 1, col, true);
      else if (a.h) { if (a.tipo === 'abeja' || a.tipo === 'colibri') for (const fl of a.h.flores) trazo([a.h.colmena, fl], 0.5, col); trazo(a.h.poly, 1, col, true); }
      ficha.innerHTML = `<button class="x" aria-label="Cerrar">✕</button><h4>${t.n}${t.p ? `<b style="background:${CONV[t.p].c}">${t.p}</b>` : ''}</h4>
        <div class="es" id="gs-f-es">${estado(a)}</div><p>${REGLA[a.tipo] || ''}</p><p id="gs-f-ev"></p>
        <div class="bt"><button id="gs-f-seg" class="on">Seguir con la cámara</button></div>`;
      ficha.classList.add('on'); ficha.querySelector('.x').onclick = cerrarFicha;
      ficha.querySelector('#gs-f-seg').onclick = (e) => { SEL.seguir = !SEL.seguir; e.currentTarget.classList.toggle('on', SEL.seguir); };
      if (a.x !== undefined) volar(a.x, a.y, a.red ? 140 : 90);
    }
    function abrirConv(lb) {
      limpiarRuta(); SEL = null; const k = lb.k, cv = CONV[k], q = lb.q;
      const actores = Object.keys(ACT).filter(t => ACT[t].p === k).map(t => `${ACT[t].n} (${(CNT[t] || 0).toLocaleString('es-CO')})`).join(' · ');
      if (k === 'P1') { const h = HUM.reduce((b, h) => Math.hypot(h.borde[0][0] - q[0], h.borde[0][1] - q[1]) < Math.hypot(b.borde[0][0] - q[0], b.borde[0][1] - q[1]) ? h : b, HUM[0]); trazo(h.l.p, 2.2, cv.c, true); trazo(h.poly, 1, '#7dd3fc', true); }
      if (k === 'P2') { trazo(rRecu.p, 2, cv.c); rEntrega.forEach(l => trazo(l.p, 1.6, CONV.P3.c)); }
      if (k === 'P3') { for (const a of A) if ((a.tipo === 'maestra' && a.grupo) || (a.tipo === 'vecino' && a.ini < 2)) trazo((a.grupo || a.lin).p, 1.4, ACT[a.tipo].c); rEntrega.forEach(l => trazo(l.p, 1.4, CONV.P2.c)); }
      if (k === 'P4') { const h = HUE.reduce((b, h) => Math.hypot(h.c[0] - q[0], h.c[1] - q[1]) < Math.hypot(b.c[0] - q[0], b.c[1] - q[1]) ? h : b, HUE[0]); for (const fl of h.flores) trazo([h.colmena, fl], 0.6, ACT.abeja.c); trazo(h.poly, 1.4, cv.c, true); }
      ficha.innerHTML = `<button class="x" aria-label="Cerrar">✕</button><h4><b style="background:${cv.c}">${k}</b>${cv.t}</h4>
        <div class="es">${lb.sub} · ${cv.h}</div><p><b>Actores:</b> ${actores}</p><p><b>Interacciones:</b> ${INTER[k]}</p><p style="color:#94a3b8">Las líneas de color muestran las rutas de sus agentes. Toca un agente para ver cómo se comporta.</p>`;
      ficha.classList.add('on'); ficha.querySelector('.x').onclick = cerrarFicha;
      volar(q[0], q[1], 420);
    }
    let pd = null; const el = T3.renderer.domElement;
    el.addEventListener('pointerdown', (e) => { pd = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!pd || Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 6 || performance.now() - pd.t > 500) return;
      const x = e.clientX, y = e.clientY;
      for (const lb of LBL) if (x >= lb.x && x <= lb.x + lb.w && y >= lb.y && y <= lb.y + lb.h) { abrirConv(lb); return; }
      let best = null, bd = 26 * 26;
      for (const a of A) { if (a.vis === false || a.x === undefined) continue; const r = proy(a.x, a.y, 1.5); if (!r || r[2] > 2500) continue; const d = (r[0] - x) ** 2 + (r[1] - y) ** 2; if (d < bd) { bd = d; best = a; } }
      if (best) abrirAgente(best);
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarFicha(); });
    window.KENSIM = { A, abrirAgente, proy }; // para depurar
    let tFicha = 0, rastroM = null;
    seleccion = (dt) => {
      if (!SEL) return; const a = SEL.a;
      if (a.x !== undefined && a.vis !== false) {
        if (SEL.seguir && !T3.anim && SEL.px !== undefined) { const dx = a.x - SEL.px, dz = a.y - SEL.py; if (Math.abs(dx) + Math.abs(dz) < 60) { T3.orbit.target.x += dx; T3.orbit.target.z += dz; T3.camera.position.x += dx; T3.camera.position.z += dz; } }
        SEL.px = a.x; SEL.py = a.y;
        if (a.red || a.ave || a.tipo === 'copeton' || a.tipo === 'mirla') { const u = SEL.rastro[SEL.rastro.length - 1]; if (!u || Math.hypot(u[0] - a.x, u[1] - a.y) > 3) { SEL.rastro.push([a.x, a.y]); if (SEL.rastro.length > 120) SEL.rastro.shift(); } }
      }
      if ((tFicha -= dt) <= 0) {
        tFicha = 0.3; const es = document.getElementById('gs-f-es'), ev = document.getElementById('gs-f-ev');
        if (es) es.textContent = estado(a);
        if (ev) ev.textContent = a.ev ? 'Lo que ha hecho hoy: ' + a.ev + ({ hab: ' paradas de monitoreo', col: ' paradas de limpieza', recu: ' viajes con sustrato', abeja: ' flores visitadas', colibri: ' flores visitadas', nino: ' degustación', vecino: ' degustación', madre: ' tareas en la biofábrica', huertero: ' tareas en la huerta', tingua: ' huidas', garza: ' huidas', pato: ' huidas', monjita: ' huidas', copeton: ' huidas', mirla: ' huidas' }[a.tipo] || ' eventos') : '';
        if (SEL.rastro.length > 1) { if (rastroM) { RUTA3D.remove(rastroM); rastroM.geometry.dispose(); rastroM.material.dispose(); } rastroM = trazo(SEL.rastro, 1.3, ACT[a.tipo].c); }
      }
    };
    // botones de cámara: ángulo (bajo, oblicuo, planta), girar y acercar, alrededor del punto que se mira
    izq.insertAdjacentHTML('afterbegin', `<div class="gs-sub" style="margin-top:0">ÁNGULO DE VISIÓN <span>arrastra para girar</span></div>
      <div class="gs-fila gs-fila3" id="gs-ang"><button data-a="14">Bajo</button><button data-a="38">Oblicuo</button><button data-a="86">Planta</button></div>
      <div class="gs-fila"><button data-g="-45" title="Girar a la izquierda">⟲</button><button data-g="45" title="Girar a la derecha">⟳</button><button data-z="0.6" title="Acercar">＋</button><button data-z="1.6" title="Alejar">－</button></div>
      <div style="height:10px"></div>`);
    const camara = (fn) => { const c = T3.camera.position, t = T3.orbit.target.clone(), v = c.clone().sub(t); let r = v.length(), az = Math.atan2(v.x, v.z), el = Math.asin(Math.max(-1, Math.min(1, v.y / r))); [r, az, el] = fn(r, az, el); const p1 = new THREE.Vector3(t.x + r * Math.cos(el) * Math.sin(az), t.y + r * Math.sin(el), t.z + r * Math.cos(el) * Math.cos(az)); T3.anim = { t: 0, dur: 0.9, p0: c.clone(), p1, c0: t.clone(), c1: t.clone() }; };
    izq.querySelectorAll('[data-a]').forEach(b => b.onclick = () => camara((r, az) => [r, az, +b.dataset.a * Math.PI / 180]));
    izq.querySelectorAll('[data-g]').forEach(b => b.onclick = () => camara((r, az, el) => [r, az + +b.dataset.g * Math.PI / 180, el]));
    izq.querySelectorAll('[data-z]').forEach(b => b.onclick = () => camara((r, az, el) => [Math.max(40, Math.min(6000, r * +b.dataset.z)), az, el]));
    if (cfg.say) setTimeout(() => cfg.say('Arrastra para girar · clic derecho o dos dedos para desplazarte · rueda para acercar · W A S D para avanzar', 9000), 3500);
    // cámara inicial: la misma del giro (dron a 260 m, 650 m al norte de El Burro), luego se mueve libre
    T3.anim = { t: 0, dur: 2.2, p0: T3.camera.position.clone(), p1: new THREE.Vector3(OX, 300, OZ - 720), c0: T3.orbit.target.clone(), c1: new THREE.Vector3(OX, 0, OZ) };
  }

  let ult = performance.now(), tPanel = 0;
  function cuadro() {
    const ahora = performance.now(), dtR = Math.min(0.1, (ahora - ult) / 1000); ult = ahora;
    dpr = Math.min(devicePixelRatio || 1, 2);
    if (W !== innerWidth || Hh !== innerHeight) { W = innerWidth; Hh = innerHeight; for (const c of [cv, cv2]) { c.width = Math.round(W * dpr); c.height = Math.round(Hh * dpr); } vCache = -1; }
    if (!M3 && GIRO.v && vCache !== GIRO.v + '|' + GIRO.i) { vCache = GIRO.v + '|' + GIRO.i; dibujarFija(); }
    paso(dtR);
    const act = M3 ? actualizar3D() : dibujarAgentes();
    if ((tPanel -= dtR) <= 0) {
      tPanel = 0.3;
      const T = st0.t, hh = Math.floor(T / 60), mm = Math.floor(T % 60);
      $('gs-hora').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); $('gs-dia').textContent = 'DÍA ' + st0.dia;
      dial.pintar(T);
      $('gs-jor').textContent = T < H(4, 45) ? 'Noche' : T < H(5, 40) ? 'Madrugada · alba' : T < H(7) ? 'Amanece · antes de las jornadas' : T < H(11, 30) ? 'Jornada diurna' : T < H(14) ? 'Almuerzo' : T < H(17, 30) ? 'Jornada después del almuerzo' : T < H(18, 30) ? 'Atardecer' : T < H(19, 15) ? 'Anochece' : 'Noche';
      for (const k of Object.keys(ACT)) { const e = $('gs-a-' + k); if (e) e.textContent = (k === 'hongo' ? (T > H(8) ? 600 : 0) : k === 'lombriz' ? Math.round(HUE.reduce((s, h) => s + h.lomb, 0)) : (act[k] || 0)).toLocaleString('es-CO'); }
      const f = (v, u, d = 0) => v.toLocaleString('es-CO', { maximumFractionDigits: d }) + (u ? ' ' + u : '');
      $('gs-i-rondas').textContent = f(IND.rondas, 'km', 1); $('gs-i-residuos').textContent = f(IND.residuos, 'kg', 1); $('gs-i-registros').textContent = f(IND.registros);
      $('gs-i-sustrato').textContent = f(IND.sustrato, 'kg'); $('gs-i-hongos').textContent = f(IND.hongos, 'kg', 1); $('gs-i-degust').textContent = f(IND.degust);
      $('gs-i-visitas').textContent = f(IND.visitas); $('gs-i-cosecha').textContent = f(IND.cosecha, 'kg', 1); $('gs-i-humus').textContent = f(IND.humus, 'kg', 1);
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}
