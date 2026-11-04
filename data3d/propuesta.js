/* ============ SIMULADOR DE LA PROPUESTA: descentralizar Corabastos (mercados de barrio + huertas) ============
   Se monta sobre el simulador tipo God's Eye (simulador.js): agrega dos paneles (PROPUESTA y RESULTADOS), los nodos
   en el mapa (Corabastos, mercados de barrio, huertas) y los agentes de abastecimiento que recorren las vías reales.
   Pide la guía del Corte III (§4.1): cambiar variables del territorio mientras corre y saltar la cámara de un agente a otro.

   MODELO (un día simulado = DIA_S segundos reales a x1). Cifras sin fuente marcadas [SUP] (supuesto declarado).
   Entorno: red de vías (net.json), Corabastos, mercados, huertas, clima.  Agentes activos: compradores (tiendas,
   comedores y colegios), camiones de Corabastos, furgones de productores, bicicargas de las huertas, peatones que van al
   mercado. Agentes pasivos (recursos/nodos): huertas, mercados, Corabastos.
   Regla del comprador: por cada grupo de alimentos compara costo en Corabastos y en su mercado más cercano
   (precio + transporte) y su confianza en el mercado; si el mercado no le cumple, la confianza baja (aprende).
   Regla de Corabastos: cuando pierde volumen baja su precio (responde a la competencia).
   Autonomía relativa: carne y lácteos siguen viniendo de Corabastos; el 15 % llega por otros canales. */

const DIA_S = 40;                                         // segundos reales por día simulado a x1
const GRUPOS = ['hort', 'fruta', 'grano', 'carne'];
const NOMBRE_G = { hort: 'hortalizas', fruta: 'frutas', grano: 'granos y tubérculos', carne: 'carne y lácteos' };
const P = {
  demTienda: { hort: 30, fruta: 25, grano: 40, carne: 25 }, // [SUP] kg/día por tienda (A15 del grupo: 150 tiendas)
  kgRacion: 0.45, repRacion: { hort: 0.3, fruta: 0.15, grano: 0.35, carne: 0.2 }, // [SUP]
  otros: 0.15,              // [SUP] parte que hoy llega por supermercados y distribuidores
  rendHuerta: 3 / 365,      // [SUP] kg/m²/día (3 kg/m²/año, huerta urbana intensiva)
  capMercado: 2500,         // [SUP] kg/día que mueve un mercado de barrio
  costoKm: 0.05,            // [SUP] costo relativo de transporte por km
  elast: 0.35,              // [SUP] cuánto baja Corabastos el precio por volumen perdido
  aprende: 0.2,             // [SUP] velocidad de ajuste de la confianza
  kgCamion: 2000, kgFurgon: 600, kgBici: 80
};
const CLIMA = { normal: 1, lluvia: 0.8, sequia: 0.55 }; // [SUP] rendimiento de las huertas
const ESCENARIOS = {
  actual:    { mercados: 0, huertas: 0, area: 1500, directa: 0, alcance: 600, precio: 1.0, clima: 'normal', cerrada: false },
  propuesta: { mercados: 8, huertas: 12, area: 2500, directa: 45, alcance: 700, precio: 0.97, clima: 'normal', cerrada: false },
  choque:    { mercados: 8, huertas: 12, area: 2500, directa: 45, alcance: 700, precio: 0.97, clima: 'sequia', cerrada: true }
};
const COL = { cora: '#ff3b3b', merc: '#ffb020', huerta: '#9cff57', camion: '#ff5a4f', furgon: '#ffcf4a', bici: '#9cff57', comp: '#00d4ff' };
const TIPOS = [ // saltar de agente (tecla Tab): como en Everything, la cámara pasa de un agente a otro
  ['carro', 'Carro'], ['camion', 'Camión'], ['furgon', 'Furgón'], ['bici', 'Bicicarga'], ['comp', 'Comprador'], ['peaton', 'Peatón']
];

const CSS = `
.p-sl{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 8px;margin:6px 0 2px;font-size:10px;color:var(--g-tx2);letter-spacing:.06em}
.p-sl b{font-weight:600;color:var(--g-tx);font-variant-numeric:tabular-nums}
.p-sl input{grid-column:1/3;width:100%;margin:0;height:18px;accent-color:var(--g-ac);cursor:pointer}
.p-seg3{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.p-seg6{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.p-big{display:flex;align-items:baseline;justify-content:space-between;margin:2px 0 6px}
.p-big b{font-size:24px;font-weight:600;color:var(--g-tx);font-variant-numeric:tabular-nums}
.p-big small{color:var(--g-tx3);font-size:9.5px;letter-spacing:.14em;text-align:right}
.p-big em{font-style:normal;font-size:11px;margin-left:6px}
#p-spark{display:block;width:100%;height:34px;margin-top:7px;border-top:1px solid var(--g-bd)}
.p-ley{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:7px;font-size:9.5px;color:var(--g-tx2)}
.p-ley i{display:inline-block;width:7px;height:7px;margin-right:4px;border-radius:1px}
.p-nota{margin-top:6px;font-size:9.5px;color:var(--g-tx3);line-height:1.35}
#p-trk{border-color:rgba(0,212,255,.5)}
#p-det{position:fixed;inset:0;width:100%;height:100%;z-index:6;pointer-events:none}
body:not(.sim) #p-det{display:none}`;

const PANEL_IZQ = `
<div class="g-pan" id="p-pan"><h3>PROPUESTA <em id="p-dia">DÍA 0</em></h3>
  <div class="p-seg3" id="p-esc"><button data-e="actual">Actual</button><button data-e="propuesta" class="on">Propuesta</button><button data-e="choque">Choque</button></div>
  <label class="p-sl">Mercados de barrio <b id="p-v-mercados"></b><input type="range" id="p-mercados" min="0" max="20" step="1"></label>
  <label class="p-sl">Huertas comunitarias <b id="p-v-huertas"></b><input type="range" id="p-huertas" min="0" max="30" step="1"></label>
  <label class="p-sl">Área por huerta <b id="p-v-area"></b><input type="range" id="p-area" min="500" max="10000" step="250"></label>
  <label class="p-sl">Compra directa a productores <b id="p-v-directa"></b><input type="range" id="p-directa" min="0" max="100" step="5"></label>
  <label class="p-sl">Distancia que se camina al mercado <b id="p-v-alcance"></b><input type="range" id="p-alcance" min="200" max="1200" step="50"></label>
  <label class="p-sl">Precio del mercado (Corabastos = 1) <b id="p-v-precio"></b><input type="range" id="p-precio" min="0.85" max="1.15" step="0.01"></label>
  <div class="p-sl" style="margin-top:8px">Clima</div>
  <div class="p-seg3" id="p-clima"><button data-c="normal">Normal</button><button data-c="lluvia">Lluvia</button><button data-c="sequia">Sequía</button></div>
  <div class="g-row" style="grid-template-columns:1fr"><button id="p-cerrar">Cerrar Corabastos</button></div>
</div>
<div class="g-pan"><h3>CÁMARA <em>TAB</em></h3>
  <div class="p-seg6" id="p-saltar">${TIPOS.map(([k, n]) => `<button data-k="${k}">${n}</button>`).join('')}</div>
  <div class="g-row" style="grid-template-columns:repeat(3,1fr)"><button data-z="45">Agente</button><button data-z="450">Barrio</button><button data-z="2600">Kennedy</button></div>
</div>`;

const PANEL_DER = `
<div class="g-pan" id="p-trk" hidden><h3>AGENTE <em id="p-tid">--</em></h3>
  <div class="g-kv"><span>TIPO</span><b id="p-tt">--</b><span>RUTA</span><b id="p-tr">--</b><span>CARGA</span><b id="p-tc">--</b><span>VEL</span><b id="p-tv">--</b><span>RECORRIDO</span><b id="p-td">--</b></div>
  <button id="p-rel" type="button" style="width:100%;margin-top:8px">Soltar (Esc)</button>
</div>
<div class="g-pan"><h3>RESULTADOS <em id="p-dia2">--</em></h3>
  <div class="p-big"><b id="p-dep">--</b><small>DEPENDENCIA DE<br>CORABASTOS</small></div>
  <div class="g-kv">
    <span>VS. ACTUAL</span><b id="p-vs">--</b>
    <span>HUERTAS</span><b id="p-kgh">--</b>
    <span>COMPRA DIRECTA</span><b id="p-kgd">--</b>
    <span>CAMIONES CORAB.</span><b id="p-cam">--</b>
    <span>A PIE DE MERCADO</span><b id="p-cob">--</b>
    <span>DIST. ABASTO</span><b id="p-dis">--</b>
    <span>SIN CUBRIR</span><b id="p-sin">--</b>
    <span>PRECIO CORAB.</span><b id="p-pre">--</b>
    <span>CONFIANZA</span><b id="p-con">--</b>
  </div>
  <canvas id="p-spark" width="440" height="68"></canvas>
  <div class="p-ley"><span><i style="background:${COL.cora}"></i>Corabastos</span><span><i style="background:${COL.merc}"></i>Mercado</span><span><i style="background:${COL.huerta}"></i>Huerta</span><span><i style="background:${COL.comp}"></i>Comprador</span></div>
  <div class="p-nota">Modelo exploratorio: las cifras marcadas [SUP] en data3d/propuesta.js son supuestos para discutir, no datos medidos.</div>
</div>`;

export function crearPropuesta(ctx) {
  const T3 = ctx.T3(), THREE = T3.THREE, D = ctx.datos;
  const $ = (id) => document.getElementById(id);
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.querySelector('#gevUI .g-left').insertAdjacentHTML('beforeend', PANEL_IZQ);
  document.querySelector('#gevUI .g-right').insertAdjacentHTML('afterbegin', PANEL_DER);
  const cv = document.createElement('canvas'); cv.id = 'p-det'; document.body.appendChild(cv); const g2 = cv.getContext('2d');

  /* ---------- red de vías como grafo (para que los agentes vayan por calles reales) ---------- */
  const cora = D.nodos.find(n => n.t === 'corabastos'), burro = D.nodos.find(n => n.n === 'Humedal El Burro');
  const G = (() => {
    const key = new Map(), X = [], Z = [], adj = [];
    const nodo = (x, z) => { const k = Math.round(x / 4) + ',' + Math.round(z / 4); let i = key.get(k); if (i === undefined) { i = X.length; key.set(k, i); X.push(x); Z.push(z); adj.push([]); } return i; };
    const cerca = (x, z) => Math.hypot(x - burro.x, z - burro.z) < 2700 || Math.hypot(x - cora.x, z - cora.z) < 900;
    for (const [cls, pts0] of T3.net.edges) {
      if (!pts0 || pts0.length < 2) continue;
      const pts = pts0.map(p => ctx.lw(p[0], p[1]));
      if (!cerca(pts[0][0], pts[0][1]) && !cerca(pts[pts.length - 1][0], pts[pts.length - 1][1])) continue;
      let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const a = nodo(pts[0][0], pts[0][1]), b = nodo(pts[pts.length - 1][0], pts[pts.length - 1][1]); if (a === b) continue;
      const e = { a, b, L, pts, cls }; adj[a].push(e); adj[b].push(e);
    }
    // componente más grande
    const comp = new Int32Array(X.length).fill(-1); let best = -1, bestN = 0;
    for (let s = 0; s < X.length; s++) {
      if (comp[s] >= 0) continue; const pila = [s]; comp[s] = s; let n = 0;
      while (pila.length) { const u = pila.pop(); n++; for (const e of adj[u]) { const v = e.a === u ? e.b : e.a; if (comp[v] < 0) { comp[v] = s; pila.push(v); } } }
      if (n > bestN) { bestN = n; best = s; }
    }
    const ok = (i) => comp[i] === best;
    const idx = []; for (let i = 0; i < X.length; i++) if (ok(i)) idx.push(i);
    function cercano(x, z) { let bi = -1, bd = 1e18; for (const i of idx) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; }
    function arbol(fuente) { // Dijkstra con montículo binario
      const dist = new Float64Array(X.length).fill(Infinity), prev = new Array(X.length).fill(null), h = [[0, fuente]]; dist[fuente] = 0;
      const push = (it) => { h.push(it); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
      const pop = () => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
      while (h.length) {
        const [d, u] = pop(); if (d > dist[u]) continue;
        for (const e of adj[u]) { const v = e.a === u ? e.b : e.a, nd = d + e.L; if (nd < dist[v]) { dist[v] = nd; prev[v] = e; push([nd, v]); } }
      }
      return { fuente, dist, prev };
    }
    function ruta(t, destino) { // puntos desde la fuente del árbol hasta el destino
      if (!isFinite(t.dist[destino])) return null;
      const tramos = []; let u = destino;
      while (u !== t.fuente) { const e = t.prev[u]; if (!e) return null; const desde = e.a === u ? e.b : e.a; tramos.push(e.a === desde ? e.pts : e.pts.slice().reverse()); u = desde; }
      const out = [[X[t.fuente], Z[t.fuente]]];
      for (let k = tramos.length - 1; k >= 0; k--) for (const p of tramos[k]) { const q = out[out.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5) out.push(p); }
      return out;
    }
    // entradas de los productores: vías principales en el borde de la zona (occidente, sur y norte)
    const mayores = idx.filter(i => adj[i].some(e => e.cls === 'major'));
    const lejos = (dx, dz) => mayores.reduce((b, i) => ((X[i] - burro.x) * dx + (Z[i] - burro.z) * dz > (X[b] - burro.x) * dx + (Z[b] - burro.z) * dz ? i : b), mayores[0]);
    const entradas = mayores.length ? [lejos(-1, 0), lejos(0, 1), lejos(0, -1), lejos(1, 0)] : [];
    return { X, Z, cercano, arbol, ruta, entradas };
  })();

  /* ---------- lugares: compradores, candidatos a mercado y a huerta ---------- */
  const comp = D.nodos.filter(n => n.t === 'tienda' || n.t === 'comedor' || n.t === 'colegio').map((n, i) => {
    const dem = {};
    if (n.t === 'tienda') Object.assign(dem, P.demTienda);
    else for (const g of GRUPOS) dem[g] = (n.raciones || 500) * P.kgRacion * P.repRacion[g];
    return { i, t: n.t, n: n.n, x: n.x, z: n.z, dem, conf: 0.5, nodo: G.cercano(n.x, n.z), dCora: Math.hypot(n.x - cora.x, n.z - cora.z) * 1.3, m: -1, dM: Infinity, rec: {} };
  });
  // mercados: en el orden en que se van abriendo, repartidos por el territorio (punto más lejano a los ya abiertos)
  const ordenMerc = (() => {
    const cand = comp.filter(c => c.t === 'tienda'), out = [];
    let c0 = cand.reduce((b, c) => (Math.hypot(c.x - burro.x, c.z - burro.z) < Math.hypot(b.x - burro.x, b.z - burro.z) ? c : b), cand[0]);
    out.push(c0);
    while (out.length < 20) {
      let best = null, bd = -1;
      for (const c of cand) { if (out.includes(c)) continue; const d = Math.min(...out.map(o => Math.hypot(c.x - o.x, c.z - o.z))) - 0.25 * Math.hypot(c.x - burro.x, c.z - burro.z); if (d > bd) { bd = d; best = c; } }
      out.push(best);
    }
    return out.map((c, k) => ({ k, n: 'Mercado de barrio ' + (k + 1), x: c.x, z: c.z, nodo: c.nodo }));
  })();
  // huertas: primero las del modelo de agentes (ronda de El Burro y área cedida), luego parques cercanos
  const ordenHuer = (() => {
    const out = D.nodos.filter(n => n.t === 'huerta').map(n => ({ n: n.n, x: n.x, z: n.z }));
    for (const p of D.parques) { if (out.length >= 30) break; if (out.every(o => Math.hypot(o.x - p.x, o.z - p.z) > 140)) out.push({ n: 'Huerta en ' + p.n, x: p.x, z: p.z }); }
    return out.map((h, k) => ({ ...h, k, nodo: G.cercano(h.x, h.z) }));
  })();
  const coraNodo = G.cercano(cora.x, cora.z);
  let arbolCora = null, arbolesMerc = [];

  /* ---------- estado ---------- */
  const V = { ...ESCENARIOS.propuesta };
  const S = { dia: 0, tDia: 0, res: null, base: null, hist: [], mercados: [], huertas: [], cambioLugares: true, trk: null, trail: [], tHud: 0, carro: 0, peaton: 0 };

  /* ---------- modelo de un día ---------- */
  function lugares() {
    S.mercados = ordenMerc.slice(0, V.mercados);
    S.huertas = ordenHuer.slice(0, V.huertas);
    for (const c of comp) {
      c.m = -1; c.dM = Infinity;
      S.mercados.forEach((m, k) => { const d = Math.hypot(c.x - m.x, c.z - m.z) * 1.3; if (d < c.dM) { c.dM = d; c.m = k; } });
    }
    for (const h of ordenHuer) { h.m = -1; let bd = Infinity; S.mercados.forEach((m, k) => { const d = Math.hypot(h.x - m.x, h.z - m.z); if (d < bd) { bd = d; h.m = k; } }); }
  }
  function dia(v, est, conf) { // v: variables; est: estado de Corabastos {precio}; conf: confianza por comprador (se actualiza)
    const nM = v.mercados, clima = CLIMA[v.clima];
    const oferta = Array.from({ length: nM }, () => ({ hort: 0, fruta: 0, grano: 0 }));
    let kgH = 0;
    for (const h of ordenHuer.slice(0, v.huertas)) { const kg = v.area * P.rendHuerta * clima; kgH += kg; if (h.m >= 0 && h.m < nM) oferta[h.m].hort += kg; }
    // compra directa: los productores se comprometen con una parte de las frutas y granos que piden los compradores del área del mercado
    const pedidoArea = Array.from({ length: nM }, () => ({ fruta: 0, grano: 0 }));
    for (const c of comp) if (c.m >= 0 && c.m < nM && c.dM <= v.alcance) { pedidoArea[c.m].fruta += c.dem.fruta; pedidoArea[c.m].grano += c.dem.grano; }
    let kgD = 0;
    for (let k = 0; k < nM; k++) for (const g of ['fruta', 'grano']) { const q = Math.min(pedidoArea[k][g] * v.directa / 100, P.capMercado * 0.6); oferta[k][g] += q; kgD += q; }
    // decisión de cada comprador
    const pedido = Array.from({ length: nM }, () => ({ hort: 0, fruta: 0, grano: 0 }));
    const parte = comp.map((c, i) => {
      const r = {};
      for (const g of ['hort', 'fruta', 'grano']) {
        if (c.m < 0 || c.m >= nM || c.dM > v.alcance) { r[g] = 0; continue; }
        if (v.cerrada) { r[g] = 1; continue; }
        const costoC = est.precio + P.costoKm * c.dCora / 1000, costoM = v.precio + P.costoKm * c.dM / 1000;
        r[g] = 1 / (1 + Math.exp(-((costoC - costoM) * 30 + (conf[i] - 0.5) * 5)));
      }
      for (const g of ['hort', 'fruta', 'grano']) if (c.m >= 0 && c.m < nM) pedido[c.m][g] += c.dem[g] * (1 - P.otros) * r[g];
      return r;
    });
    const llenado = pedido.map((p, k) => ({ hort: p.hort ? Math.min(1, oferta[k].hort / p.hort) : 1, fruta: p.fruta ? Math.min(1, oferta[k].fruta / p.fruta) : 1, grano: p.grano ? Math.min(1, oferta[k].grano / p.grano) : 1 }));
    let tot = 0, deCora = 0, deMerc = 0, sin = 0, kmKg = 0;
    const flujo = comp.map(() => ({ cora: 0, merc: 0 }));
    comp.forEach((c, i) => {
      let llenoSum = 0, llenoN = 0;
      for (const g of GRUPOS) {
        const q = c.dem[g], libre = q * (1 - P.otros); tot += q;
        let aM = 0;
        if (g !== 'carne' && c.m >= 0 && c.m < nM) { const f = llenado[c.m][g]; aM = libre * parte[i][g] * f; if (parte[i][g] > 0.05) { llenoSum += f; llenoN++; } }
        const resto = libre - aM;
        deMerc += aM; flujo[i].merc += aM; kmKg += aM * c.dM / 1000;
        if (v.cerrada) sin += resto; else { deCora += resto; flujo[i].cora += resto; kmKg += resto * c.dCora / 1000; }
      }
      if (llenoN) conf[i] += P.aprende * (llenoSum / llenoN - conf[i]);
    });
    const vol0 = tot * (1 - P.otros);
    const precio = v.cerrada ? est.precio : Math.max(0.75, 1 - P.elast * (1 - deCora / vol0));
    const cob = comp.filter(c => c.m >= 0 && c.m < nM && c.dM <= v.alcance).length / comp.length;
    const confM = comp.reduce((s, c, i) => s + (c.m >= 0 && c.dM <= v.alcance ? conf[i] : 0), 0) / Math.max(1, comp.filter(c => c.m >= 0 && c.dM <= v.alcance).length);
    return { tot, deCora, deMerc, sin, dep: deCora / tot, kgH, kgD, camiones: deCora / P.kgCamion, cob, dist: kmKg / Math.max(1, deCora + deMerc), precio, flujo, conf: confM, oferta, sinP: sin / tot };
  }
  function estable(v) { // corre 30 días con las variables v desde cero (para comparar contra el escenario actual)
    const conf = comp.map(() => 0.5), est = { precio: 1 }; let r = null;
    const guard = comp.map(c => ({ m: c.m, dM: c.dM }));
    const vm = V.mercados; V.mercados = v.mercados; lugares();
    for (let d = 0; d < 30; d++) { r = dia(v, est, conf); est.precio = r.precio; }
    V.mercados = vm; lugares(); comp.forEach((c, i) => { c.m = guard[i].m; c.dM = guard[i].dM; });
    return r;
  }
  const CONF = comp.map(() => 0.5), EST = { precio: 1 };
  function nuevoDia() {
    if (S.cambioLugares) { lugares(); S.cambioLugares = false; rutas(); }
    S.res = dia(V, EST, CONF); EST.precio = S.res.precio; S.dia++;
    S.hist.push(S.res.dep * 100); if (S.hist.length > 60) S.hist.shift();
    repartirAgentes(); pintarResultados();
  }

  /* ---------- rutas y agentes que se mueven ---------- */
  function rutas() {
    arbolCora = G.arbol(coraNodo);
    arbolesMerc = S.mercados.map(m => G.arbol(m.nodo));
    for (const k of Object.keys(AG)) AG[k].lista.length = 0; // los lugares cambiaron: los agentes se vuelven a repartir
  }
  const prep = (pts) => { if (!pts || pts.length < 2) return null; const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; };
  const rnd = (() => { let s = 20261104; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  function elegir(pesos) { let t = 0; for (const p of pesos) t += p; if (t <= 0) return -1; let r = rnd() * t; for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return i; } return pesos.length - 1; }
  const AG = {
    camion: { lista: [], max: 90, vel: 8, alto: 3.2, largo: 8, ancho: 2.5, color: 0xd63a32 },
    furgon: { lista: [], max: 40, vel: 9, alto: 2.4, largo: 5.2, ancho: 2.1, color: 0xf2b630 },
    bici:   { lista: [], max: 60, vel: 4.2, alto: 1.5, largo: 2.4, ancho: 1.0, color: 0x6fd33c },
    comp:   { lista: [], max: 140, vel: 1.3, alto: 1.75, largo: 0.6, ancho: 0.6, color: 0x22c6ee }
  };
  let nid = 1;
  function nuevo(tipo, r, info) { const p = prep(r); if (!p || p.L < 40) return null; const a = { id: nid++, tipo, ...p, s: rnd() * p.L, dir: 1, seg: 0, x: p.pts[0][0], z: p.pts[0][1], rumbo: 0, dist: 0, ...info }; return a; }
  function repartirAgentes() {
    const R = S.res; if (!R || !arbolCora) return;
    const ajustar = (tipo, n, crear) => {
      const L = AG[tipo].lista; n = Math.max(0, Math.min(AG[tipo].max, Math.round(n)));
      while (L.length > n) { const i = Math.floor(rnd() * L.length); if (S.trk && S.trk.a === L[i]) { if (L.length === 1) break; continue; } L.splice(i, 1); }
      let intentos = 0; while (L.length < n && intentos++ < n * 4) { const a = crear(); if (a) L.push(a); }
    };
    // camiones de Corabastos: 1 en pantalla por cada 400 kg/día que despacha [visual]
    ajustar('camion', R.deCora / 400, () => {
      const i = elegir(R.flujo.map(f => f.cora)); if (i < 0) return null; const c = comp[i];
      return nuevo('camion', G.ruta(arbolCora, c.nodo), { de: 'Corabastos', a: c.n, carga: Math.round(R.flujo[i].cora) + ' kg/día' });
    });
    // furgones de productores (compra directa): de una entrada de la ciudad al mercado
    ajustar('furgon', R.kgD / 300, () => {
      const k = elegir(S.mercados.map((m, j) => R.oferta[j] ? R.oferta[j].fruta + R.oferta[j].grano : 0)); if (k < 0 || !G.entradas.length) return null;
      const e = G.entradas[Math.floor(rnd() * G.entradas.length)], r = G.ruta(arbolesMerc[k], e);
      return nuevo('furgon', r && r.slice().reverse(), { de: 'Productores (región)', a: S.mercados[k].n, carga: P.kgFurgon + ' kg' });
    });
    // bicicargas: de cada huerta a su mercado
    ajustar('bici', S.mercados.length ? Math.max(S.huertas.length, R.kgH / 60) : 0, () => {
      const h = S.huertas[Math.floor(rnd() * S.huertas.length)]; if (!h || h.m < 0) return null;
      const r = G.ruta(arbolesMerc[h.m], h.nodo);
      return nuevo('bici', r && r.slice().reverse(), { de: h.n, a: S.mercados[h.m].n, carga: Math.round(V.area * P.rendHuerta * CLIMA[V.clima]) + ' kg/día' });
    });
    // compradores a pie: de la tienda (o la casa) al mercado
    ajustar('comp', R.deMerc / 45, () => {
      const i = elegir(R.flujo.map(f => f.merc)); if (i < 0) return null; const c = comp[i];
      const r = G.ruta(arbolesMerc[c.m], c.nodo);
      return nuevo('comp', r && r.slice().reverse(), { de: c.n, a: S.mercados[c.m].n, carga: Math.round(R.flujo[i].merc) + ' kg/día' });
    });
  }
  function mover(a, dt, vel) {
    const ant = [a.x, a.z];
    a.s += vel * a.dir * dt;
    if (a.s > a.L) { a.s = a.L; a.dir = -1; } else if (a.s < 0) { a.s = 0; a.dir = 1; }
    let sg = a.seg; while (sg > 0 && a.cum[sg] > a.s) sg--; while (sg < a.cum.length - 2 && a.cum[sg + 1] < a.s) sg++; a.seg = sg;
    const p = a.pts[sg], q = a.pts[sg + 1], f = (a.s - a.cum[sg]) / ((a.cum[sg + 1] - a.cum[sg]) || 1);
    a.x = p[0] + (q[0] - p[0]) * f; a.z = p[1] + (q[1] - p[1]) * f;
    a.rumbo = Math.atan2(q[0] - p[0], q[1] - p[1]) + (a.dir < 0 ? Math.PI : 0);
    a.dist += Math.hypot(a.x - ant[0], a.z - ant[1]);
  }

  /* ---------- 3D: agentes (instancias), faros de los nodos y radio a pie de cada mercado ---------- */
  const caja = new THREE.BoxGeometry(1, 1, 1); caja.translate(0, 0.5, 0);
  const persona = new THREE.CapsuleGeometry(0.22, 1.2, 2, 8); persona.translate(0, 0.82, 0);
  for (const [k, a] of Object.entries(AG)) {
    a.mesh = new THREE.InstancedMesh(k === 'comp' ? persona : caja, new THREE.MeshLambertMaterial({ color: a.color, emissive: a.color, emissiveIntensity: 0.25 }), a.max);
    a.mesh.count = 0; a.mesh.frustumCulled = false; a.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T3.scene.add(a.mesh);
  }
  const faroGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 10, 1, true); faroGeo.translate(0, 0.5, 0);
  const faroMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const faros = { cora: new THREE.InstancedMesh(faroGeo, faroMat(0xff3b3b), 1), merc: new THREE.InstancedMesh(faroGeo, faroMat(0xffb020), 20), huerta: new THREE.InstancedMesh(faroGeo, faroMat(0x9cff57), 30) };
  for (const m of Object.values(faros)) { m.frustumCulled = false; m.count = 0; T3.scene.add(m); }
  const anilloGeo = new THREE.RingGeometry(0.985, 1, 96); anilloGeo.rotateX(-Math.PI / 2);
  const anillos = new THREE.InstancedMesh(anilloGeo, new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), 20);
  anillos.frustumCulled = false; anillos.count = 0; T3.scene.add(anillos);
  const dm = new THREE.Object3D();
  function pintar3D() {
    const set = (mesh, lista, alto, ancho) => { lista.forEach((p, i) => { dm.position.set(p.x, 0.5, p.z); dm.rotation.set(0, 0, 0); dm.scale.set(ancho, alto, ancho); dm.updateMatrix(); mesh.setMatrixAt(i, dm.matrix); }); mesh.count = lista.length; mesh.instanceMatrix.needsUpdate = true; };
    set(faros.cora, [cora], V.cerrada ? 25 : 90, 4.5);
    set(faros.merc, S.mercados, 55, 2.4);
    set(faros.huerta, S.huertas, 35, 2);
    S.mercados.forEach((m, i) => { dm.position.set(m.x, 0.8, m.z); dm.rotation.set(0, 0, 0); const r = V.alcance / 1.3; dm.scale.set(r, 1, r); dm.updateMatrix(); anillos.setMatrixAt(i, dm.matrix); });
    anillos.count = S.mercados.length; anillos.instanceMatrix.needsUpdate = true;
  }

  /* ---------- seguimiento y salto de agente ---------- */
  function posDe(trk) {
    if (trk.tipo === 'peaton') { const p = trk.p; let sg = p.seg; const a = p.pts[sg], b = p.pts[sg + 1] || a, f = (p.s - p.cum[sg]) / ((p.cum[sg + 1] - p.cum[sg]) || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, p.v]; }
    return [trk.a.x, trk.a.z, AG[trk.a.tipo].vel];
  }
  function volarA(x, z, d) {
    const cam = T3.camera, t = T3.orbit.target;
    const h = new THREE.Vector3(cam.position.x - t.x, 0, cam.position.z - t.z); if (h.lengthSq() < 1) h.set(0, 0, 1); h.normalize();
    const c1 = new THREE.Vector3(x, 1, z), p1 = c1.clone().addScaledVector(h, d * 0.72); p1.y = Math.max(8, d * 0.7);
    T3.anim = { t: 0, dur: 1.3, p0: cam.position.clone(), p1, c0: t.clone(), c1 };
  }
  function seguir(trk, nombre) {
    if (ctx.sim && ctx.sim.soltar) ctx.sim.soltar();
    S.trk = trk; S.trail = []; trk.t0 = performance.now(); trk.d = 0; trk.ult = null;
    const [x, z] = posDe(trk); volarA(x, z, trk.tipo === 'peaton' || trk.tipo === 'comp' ? 45 : 90);
    $('p-trk').hidden = false; $('p-tid').textContent = nombre; ctx.say('Cámara en ' + nombre);
  }
  function soltar(msg) { if (!S.trk) return; S.trk = null; S.trail = []; $('p-trk').hidden = true; if (msg) ctx.say(msg); }
  function saltar(tipo) {
    const t = T3.orbit.target;
    if (tipo === 'carro') { soltar(); if (ctx.sim && ctx.sim.seguirCercano && ctx.sim.seguirCercano(S.carro++)) return; ctx.say('Los carros todavía están cargando'); return; }
    if (tipo === 'peaton') {
      const PE = ctx.peat(); if (!PE || !PE.list.length) { ctx.say('Los peatones todavía están cargando'); return; }
      const orden = PE.list.map((p, i) => [Math.hypot(p.pts[0][0] - t.x, p.pts[0][1] - t.z), i]).sort((a, b) => a[0] - b[0]);
      const p = PE.list[orden[(S.peaton++) % Math.min(40, orden.length)][1]];
      seguir({ tipo: 'peaton', p }, 'PEATÓN-' + String(PE.list.indexOf(p)).padStart(4, '0')); return;
    }
    const L = AG[tipo].lista; if (!L.length) { ctx.say('No hay ' + TIPOS.find(x => x[0] === tipo)[1].toLowerCase() + 's en este escenario'); return; }
    let a = L[0], bd = Infinity; for (const x of L) { if (S.trk && S.trk.a === x) continue; const d = Math.hypot(x.x - t.x, x.z - t.z) + rnd() * 300; if (d < bd) { bd = d; a = x; } }
    const pref = { camion: 'CAM', furgon: 'FUR', bici: 'BIC', comp: 'CMP' }[tipo];
    seguir({ tipo, a }, pref + '-' + String(a.id).padStart(4, '0'));
  }
  let iTipo = 0;
  document.querySelectorAll('#p-saltar button').forEach((b, i) => b.onclick = () => { iTipo = i; saltar(b.dataset.k); });
  document.querySelectorAll('#p-pan ~ .g-pan [data-z]').forEach(b => b.onclick = () => { const t = T3.orbit.target; volarA(t.x, t.z, +b.dataset.z); });
  $('p-rel').onclick = () => soltar('Seguimiento terminado');
  addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('sim') || /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
    if (e.key === 'Tab') { e.preventDefault(); iTipo = (iTipo + (e.shiftKey ? TIPOS.length - 1 : 1)) % TIPOS.length; saltar(TIPOS[iTipo][0]); }
    if (e.key === 'Escape') soltar('Seguimiento terminado');
  });

  /* ---------- controles ---------- */
  const fmt = { mercados: v => v, huertas: v => v, area: v => (+v).toLocaleString('es-CO') + ' m²', directa: v => v + ' %', alcance: v => v + ' m', precio: v => (+v).toFixed(2) };
  function pintarControles() {
    for (const k of Object.keys(fmt)) { $('p-' + k).value = V[k]; $('p-v-' + k).textContent = fmt[k](V[k]); }
    document.querySelectorAll('#p-clima button').forEach(b => b.classList.toggle('on', b.dataset.c === V.clima));
    $('p-cerrar').classList.toggle('on', V.cerrada); $('p-cerrar').textContent = V.cerrada ? 'Corabastos cerrada · reabrir' : 'Cerrar Corabastos';
  }
  for (const k of Object.keys(fmt)) $('p-' + k).oninput = (e) => {
    V[k] = +e.target.value; $('p-v-' + k).textContent = fmt[k](V[k]);
    document.querySelectorAll('#p-esc button').forEach(b => b.classList.remove('on'));
    if (k === 'mercados' || k === 'huertas') S.cambioLugares = true;
    recalcular();
  };
  document.querySelectorAll('#p-clima button').forEach(b => b.onclick = () => { V.clima = b.dataset.c; pintarControles(); recalcular(); });
  $('p-cerrar').onclick = () => { V.cerrada = !V.cerrada; pintarControles(); recalcular(); ctx.say(V.cerrada ? 'Corabastos cerrada: solo abastecen los mercados y las huertas' : 'Corabastos abre otra vez'); };
  document.querySelectorAll('#p-esc button').forEach(b => b.onclick = () => {
    Object.assign(V, ESCENARIOS[b.dataset.e]); S.cambioLugares = true; S.hist.length = 0; pintarControles();
    document.querySelectorAll('#p-esc button').forEach(x => x.classList.toggle('on', x === b));
    recalcular(); const t = T3.orbit.target; volarA((cora.x + burro.x) / 2, (cora.z + burro.z) / 2, 2400);
    ctx.say('Escenario: ' + b.textContent);
  });
  let tRecalc = null;
  function recalcular() { clearTimeout(tRecalc); tRecalc = setTimeout(() => { S.tDia = 0; nuevoDia(); pintar3D(); }, 120); }

  /* ---------- resultados ---------- */
  const pct = (v) => (v * 100).toFixed(0) + ' %', kg = (v) => Math.round(v).toLocaleString('es-CO') + ' kg';
  function pintarResultados() {
    const R = S.res, B = S.base;
    $('p-dia').textContent = 'DÍA ' + S.dia; $('p-dia2').textContent = 'DÍA ' + S.dia;
    $('p-dep').innerHTML = pct(R.dep) + (B ? `<em style="color:${R.dep < B.dep - 0.005 ? '#9cff57' : R.dep > B.dep + 0.005 ? '#ff3b3b' : 'var(--g-tx3)'}">${R.dep < B.dep ? '▼' : R.dep > B.dep ? '▲' : '='}</em>` : '');
    $('p-vs').textContent = B ? pct(B.dep) + ' → ' + pct(R.dep) : '--';
    $('p-kgh').textContent = kg(R.kgH) + '/día'; $('p-kgd').textContent = kg(R.kgD) + '/día';
    $('p-cam').textContent = R.camiones.toFixed(1) + ' /día'; $('p-cob').textContent = pct(R.cob) + ' tiendas';
    $('p-dis').textContent = R.dist.toFixed(2) + ' km/kg'; $('p-sin').textContent = pct(R.sinP);
    $('p-sin').style.color = R.sinP > 0.01 ? '#ff3b3b' : ''; $('p-pre').textContent = V.cerrada ? 'cerrada' : R.precio.toFixed(2);
    $('p-con').textContent = S.mercados.length ? pct(R.conf) : '--';
    const c = $('p-spark'), g = c.getContext('2d'), w = c.width, h = c.height, a = S.hist;
    g.clearRect(0, 0, w, h);
    if (a.length > 1) {
      const lo = 0, hi = 100, y = (v) => h - 6 - (v - lo) / (hi - lo) * (h - 14);
      if (B) { g.strokeStyle = 'rgba(255,59,59,.5)'; g.setLineDash([6, 6]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, y(B.dep * 100)); g.lineTo(w, y(B.dep * 100)); g.stroke(); g.setLineDash([]); }
      g.beginPath(); a.forEach((v, i) => { const x = i / 59 * w; i ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); });
      g.strokeStyle = '#00d4ff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(232,234,237,.45)'; g.font = '18px "JetBrains Mono",monospace'; g.fillText('DEPENDENCIA % · línea roja = actual', 4, 18);
    }
  }

  /* ---------- cada cuadro ---------- */
  const v3 = new THREE.Vector3();
  function proy(cam, x, y, z, W, H) { v3.set(x, y, z).project(cam); if (v3.z > 1 || v3.x < -1.1 || v3.x > 1.1 || v3.y < -1.1 || v3.y > 1.1) return null; return [(v3.x + 1) * W / 2, (1 - v3.y) * H / 2]; }
  function update(dt) {
    if (!document.body.classList.contains('sim')) return;
    const tr = ctx.traf(), vel = tr ? (tr.playing ? (tr.vel || 1) : 0) : 1, dts = dt * vel;
    if ((S.tDia += dts) >= DIA_S) { S.tDia = 0; nuevoDia(); }
    for (const [k, a] of Object.entries(AG)) {
      a.lista.forEach((x, i) => {
        mover(x, dts, a.vel);
        dm.position.set(x.x, 0.5, x.z); dm.rotation.set(0, x.rumbo, 0);
        if (k === 'comp') dm.scale.set(1, 1, 1); else dm.scale.set(a.ancho, a.alto, a.largo);
        dm.updateMatrix(); a.mesh.setMatrixAt(i, dm.matrix);
      });
      a.mesh.count = a.lista.length; a.mesh.instanceMatrix.needsUpdate = true;
    }
    // el simulador de carros tomó la cámara (clic en un carro): se suelta el agente de la propuesta
    if (S.trk && ctx.sim && ctx.sim.siguiendo && ctx.sim.siguiendo()) soltar();
    const cam = T3.camera;
    if (S.trk) {
      if (S.trk.a && !AG[S.trk.a.tipo].lista.includes(S.trk.a)) soltar('El agente salió de la simulación');
      else {
        const [x, z] = posDe(S.trk);
        if (S.trk.ult) S.trk.d += Math.hypot(x - S.trk.ult[0], z - S.trk.ult[1]); S.trk.ult = [x, z];
        if (!T3.anim) { const t = T3.orbit.target, k = Math.min(1, dt * 4), dx = (x - t.x) * k, dz = (z - t.z) * k; t.x += dx; t.z += dz; cam.position.x += dx; cam.position.z += dz; }
        const hl = S.trail[S.trail.length - 1]; if (!hl || Math.hypot(hl[0] - x, hl[1] - z) > 2) { S.trail.push([x, z]); if (S.trail.length > 90) S.trail.shift(); }
      }
    }
    // capa 2D: nodos con etiqueta, marcas sobre los agentes y estela del seguido
    const dpr = Math.min(devicePixelRatio || 1, 1.5), W = innerWidth, H = innerHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, H);
    cam.updateMatrixWorld();
    g2.font = '600 10px "JetBrains Mono",ui-monospace,monospace'; g2.textBaseline = 'bottom';
    const R = S.res;
    const etiqueta = (x, z, alto, color, t1, t2, forma) => {
      const p = proy(cam, x, alto, z, W, H); if (!p) return;
      g2.fillStyle = color; g2.strokeStyle = color; g2.lineWidth = 1.4;
      if (forma === 'rombo') { g2.beginPath(); g2.moveTo(p[0], p[1] - 7); g2.lineTo(p[0] + 7, p[1]); g2.lineTo(p[0], p[1] + 7); g2.lineTo(p[0] - 7, p[1]); g2.closePath(); g2.stroke(); }
      else g2.strokeRect(p[0] - 5, p[1] - 5, 10, 10);
      g2.globalAlpha = 0.95; g2.fillText(t1, p[0] + 10, p[1] - 1); if (t2) { g2.fillStyle = 'rgba(232,234,237,.75)'; g2.fillText(t2, p[0] + 10, p[1] + 11); } g2.globalAlpha = 1;
    };
    if (R) {
      etiqueta(cora.x, cora.z, V.cerrada ? 25 : 90, COL.cora, 'CORABASTOS', V.cerrada ? 'CERRADA' : pct(R.dep) + ' del abasto · ' + R.camiones.toFixed(0) + ' camiones/día', 'rombo');
      S.mercados.forEach((m, k) => { const o = R.oferta[k]; etiqueta(m.x, m.z, 55, COL.merc, 'MERCADO ' + (k + 1), o ? kg(o.hort + o.fruta + o.grano) + '/día' : '', 'cuadro'); });
      const zoom = cam.position.distanceTo(T3.orbit.target) < 1400;
      S.huertas.forEach(h => etiqueta(h.x, h.z, 35, COL.huerta, zoom ? 'HUERTA' : '', zoom ? kg(V.area * P.rendHuerta * CLIMA[V.clima]) + '/día' : '', 'cuadro'));
    }
    // marcas pequeñas sobre los agentes (se ven aunque estén lejos)
    for (const [k, a] of Object.entries(AG)) {
      g2.fillStyle = COL[k]; g2.globalAlpha = 0.9;
      for (const x of a.lista) { const p = proy(cam, x.x, a.alto + 1, x.z, W, H); if (p) g2.fillRect(p[0] - 1.6, p[1] - 1.6, 3.2, 3.2); }
    }
    g2.globalAlpha = 1;
    if (S.trk) {
      g2.strokeStyle = '#00d4ff'; g2.lineWidth = 2; let prev = null;
      S.trail.forEach((q, i) => { const p = proy(cam, q[0], 1.2, q[1], W, H); if (p && prev) { g2.globalAlpha = 0.15 + 0.8 * i / S.trail.length; g2.beginPath(); g2.moveTo(prev[0], prev[1]); g2.lineTo(p[0], p[1]); g2.stroke(); } prev = p; });
      g2.globalAlpha = 1;
      const [x, z, v] = posDe(S.trk), p = proy(cam, x, 1.5, z, W, H);
      if (p) { const r = 14; g2.strokeRect(p[0] - r, p[1] - r, 2 * r, 2 * r); g2.beginPath(); g2.moveTo(p[0] - r - 8, p[1]); g2.lineTo(p[0] - r, p[1]); g2.moveTo(p[0] + r, p[1]); g2.lineTo(p[0] + r + 8, p[1]); g2.moveTo(p[0], p[1] - r - 8); g2.lineTo(p[0], p[1] - r); g2.moveTo(p[0], p[1] + r); g2.lineTo(p[0], p[1] + r + 8); g2.stroke();
        g2.fillStyle = '#00d4ff'; g2.font = '700 11px "JetBrains Mono",ui-monospace,monospace'; g2.fillText('◆ ' + $('p-tid').textContent, p[0] - r, p[1] - r - 4); }
      if ((S.tHud -= dt) <= 0) {
        S.tHud = 0.25; const a = S.trk.a;
        $('p-tt').textContent = { peaton: 'Peatón', camion: 'Camión de Corabastos', furgon: 'Furgón de productores', bici: 'Bicicarga de huerta', comp: 'Comprador a pie' }[S.trk.tipo];
        $('p-tr').textContent = a ? (a.dir > 0 ? a.de + ' → ' + a.a : a.a + ' → ' + a.de) : 'anden';
        $('p-tc').textContent = a ? (a.dir > 0 ? a.carga : 'regresa') : '--';
        $('p-tv').textContent = Math.round(v * vel * 3.6) + ' km/h'; $('p-td').textContent = Math.round(S.trk.d) + ' m';
      }
    }
  }

  // arranque: línea base (escenario actual estable) y primer día de la propuesta
  pintarControles();
  S.base = estable(ESCENARIOS.actual);
  lugares(); S.cambioLugares = true; nuevoDia(); pintar3D();
  return { update, V, S };
}
