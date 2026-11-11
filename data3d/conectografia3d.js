/* ============ RED DE ACTORES 3D → CONECTOGRAFÍA (modo Kennedy) ============
   Datos: data3d/red_georef_actores.json (5 hubs + 45 nodos, WGS84, relaciones por dimensión).
   Fase RED: grafo 3D flotando sobre Kennedy con conexiones directas (gruesas) e indirectas (a 2 pasos, finas).
     · clic en un nodo: lo selecciona y resalta sus conexiones directas e indirectas
     · doble clic en un nodo: lo apaga / lo vuelve a encender (sus conexiones se recalculan)
     · la leyenda apaga comunidades y dimensiones; interruptores para directas, indirectas y nombres
   Fase CONECTOGRAFÍA: cada nodo vuela a su coordenada real y las conexiones se vuelven arcos sobre el territorio. */
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export async function iniciarConectografia({ THREE, T3, llw, Y0 = 2.0 }) {
  const D = await (await fetch('data3d/red_georef_actores.json?v=1')).json();
  const COM = D.comunidades, DIM = D.dimensiones, ORD = Object.keys(COM);
  const A = D.actores, byId = {};
  A.forEach((a, i) => { a.i = i; byId[a.id] = a; });

  // relaciones directas: cada nodo con su hub + las relaciones cruzadas
  const REL = [];
  A.forEach(a => { if (!a.hub) REL.push({ a: a.id, b: 'H-' + a.com, d: a.dim }); });
  D.relaciones.forEach(r => REL.push({ a: r[0], b: r[1], d: r[2] }));

  /* ---------- estado ---------- */
  const off = new Set();               // nodos apagados (doble clic)
  const comOff = new Set(), dimOff = new Set();
  let verDir = true, verInd = true, nombres = 'hubs'; // 'hubs' | 'todos' | 'ninguno'
  let sel = null, hover = null;
  let fase = 0, faseObj = 0;           // 0 = red, 1 = conectografía
  let IND = [];                        // conexiones indirectas actuales [{a,b,via:[...]}]

  const activo = a => !off.has(a.id) && !comOff.has(a.com);
  const relActiva = r => activo(byId[r.a]) && activo(byId[r.b]) && !dimOff.has(String(r.d));
  function calcIndirectas() {
    const vec = {}; A.forEach(a => vec[a.id] = new Map());
    REL.filter(relActiva).forEach(r => { vec[r.a].set(r.b, r.d); vec[r.b].set(r.a, r.d); });
    const m = new Map();
    for (const v of A) {
      if (!activo(v)) continue;
      const ns = [...vec[v.id].keys()];
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
        const [p, q] = ns[i] < ns[j] ? [ns[i], ns[j]] : [ns[j], ns[i]];
        if (vec[p].has(q)) continue;
        const k = p + '|' + q; if (!m.has(k)) m.set(k, { a: p, b: q, via: [] }); m.get(k).via.push(v.id);
      }
    }
    IND = [...m.values()];
    return vec;
  }
  let VEC = calcIndirectas();

  /* ---------- posiciones: red (layout de fuerzas 3D) y territorio ---------- */
  const [cx, cz] = llw(-74.1515, 4.6295);
  const CEN = new THREE.Vector3(cx, Y0 + 900, cz);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = A.map(a => {
    const g = ORD.indexOf(a.com), ang = g / ORD.length * Math.PI * 2;
    return new THREE.Vector3(Math.cos(ang) * 700 + (rnd() - .5) * 400, (rnd() - .5) * 400, Math.sin(ang) * 700 + (rnd() - .5) * 400);
  });
  { // fuerzas: repulsión, resortes en las relaciones, atracción al centro de su comunidad
    const L = REL.map(r => [byId[r.a].i, byId[r.b].i]), F = P.map(() => new THREE.Vector3()), d = new THREE.Vector3();
    for (let it = 0; it < 420; it++) {
      const k = 1 - it / 420; F.forEach(f => f.set(0, 0, 0));
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        d.subVectors(P[i], P[j]); const r2 = Math.max(d.lengthSq(), 400); d.multiplyScalar(9e6 / (r2 * Math.sqrt(r2)));
        F[i].add(d); F[j].sub(d);
      }
      for (const [i, j] of L) { d.subVectors(P[j], P[i]); const r = d.length() || 1, ideal = (A[i].hub || A[j].hub) ? 330 : 480; d.multiplyScalar((r - ideal) * 0.04 / r); F[i].add(d); F[j].sub(d); }
      A.forEach((a, i) => { const g = ORD.indexOf(a.com), ang = g / ORD.length * Math.PI * 2; F[i].x += (Math.cos(ang) * 650 - P[i].x) * 0.012; F[i].z += (Math.sin(ang) * 650 - P[i].z) * 0.012; F[i].y += -P[i].y * 0.02; });
      F.forEach((f, i) => { if (f.length() > 60) f.setLength(60); P[i].addScaledVector(f, k); });
    }
  }
  const PR = P.map(p => p.clone().multiplyScalar(1).add(CEN));                       // posición en la red
  const PG = A.map(a => { const [x, z] = llw(a.lng, a.lat); return new THREE.Vector3(x, Y0 + (a.hub ? 170 : 95), z); }); // en el territorio
  const PS = A.map(() => new THREE.Vector3());                                         // posición actual

  /* ---------- objetos 3D ---------- */
  const grupo = new THREE.Group(); grupo.name = 'conectografia'; grupo.visible = false; T3.scene.add(grupo);
  const esf = new THREE.SphereGeometry(1, 20, 14);
  const NODOS = A.map(a => {
    const col = new THREE.Color(COM[a.com].c);
    const m = new THREE.Mesh(esf, new THREE.MeshBasicMaterial({ fog: false, color: col, transparent: true, depthTest: false }));
    const halo = new THREE.Mesh(esf, new THREE.MeshBasicMaterial({ fog: false, color: col.clone().lerp(new THREE.Color('#ffffff'), .35), transparent: true, opacity: .22, depthTest: false, depthWrite: false }));
    m.add(halo); halo.scale.setScalar(1.7);
    m.renderOrder = 62; halo.renderOrder = 61; m.userData.a = a; grupo.add(m);
    a.r = a.hub ? 46 : 20 + Math.min(14, (VEC[a.id].size) * 2.2);
    return { m, halo, col };
  });

  // conexiones directas: líneas gruesas (LineSegments2), una curva de N tramos por relación
  const N = 28;
  const matDir = new LineMaterial({ fog: false, linewidth: 2.6, vertexColors: true, transparent: true, opacity: .95, depthTest: false, worldUnits: false });
  const geoDir = new LineSegmentsGeometry();
  const lDir = new LineSegments2(geoDir, matDir); lDir.renderOrder = 60; lDir.frustumCulled = false; grupo.add(lDir);
  // conexiones indirectas: líneas finas con transparencia por vértice
  const geoInd = new THREE.BufferGeometry();
  const lInd = new THREE.LineSegments(geoInd, new THREE.LineBasicMaterial({ fog: false, vertexColors: true, transparent: true, depthTest: false, depthWrite: false }));
  lInd.renderOrder = 59; lInd.frustumCulled = false; grupo.add(lInd);
  // plomadas al suelo y discos en el territorio (aparecen con la conectografía)
  const geoPin = new THREE.BufferGeometry();
  const matPin = new THREE.LineBasicMaterial({ fog: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
  const lPin = new THREE.LineSegments(geoPin, matPin); lPin.frustumCulled = false; lPin.renderOrder = 58; grupo.add(lPin);
  const disco = new THREE.RingGeometry(0.55, 1, 40); disco.rotateX(-Math.PI / 2);
  const DISCOS = A.map(a => { const m = new THREE.Mesh(disco, new THREE.MeshBasicMaterial({ fog: false, color: COM[a.com].c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.position.set(PG[a.i].x, Y0 + 3, PG[a.i].z); m.scale.setScalar(a.hub ? 90 : 45); m.renderOrder = 57; grupo.add(m); return m; });
  // velo negro sobre el suelo: el territorio queda oscuro y la red resalta (los edificios siguen encima)
  const velo = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .78, depthWrite: false, fog: false }));
  velo.rotation.x = -Math.PI / 2; velo.position.set(cx, Y0 + 0.8, cz); velo.renderOrder = 10; grupo.add(velo);
  let fondoNegro = true;
  // pulsos que viajan por las conexiones directas
  const NPU = REL.length * 2, pulG = new THREE.BufferGeometry();
  pulG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NPU * 3), 3));
  pulG.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(NPU * 3), 3));
  const pul = new THREE.Points(pulG, new THREE.PointsMaterial({ fog: false, size: 9, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .95, depthTest: false, depthWrite: false }));
  pul.renderOrder = 63; pul.frustumCulled = false; grupo.add(pul);

  const ease = t => t * t * (3 - 2 * t);
  const tmp = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3();
  // punto s∈[0,1] de la curva entre i y j según la fase actual (recta levemente curva en la red, arco en el territorio)
  function curva(i, j, s, out) {
    const e = ease(fase);
    // red
    tA.lerpVectors(PR[i], PR[j], s); const bowR = PR[i].distanceTo(PR[j]) * 0.08 * Math.sin(Math.PI * s); tA.y += bowR;
    // territorio
    tB.lerpVectors(PG[i], PG[j], s); const dist = Math.hypot(PG[i].x - PG[j].x, PG[i].z - PG[j].z); tB.y += (90 + dist * 0.32) * Math.sin(Math.PI * s);
    return out.lerpVectors(tA, tB, e);
  }

  /* ---------- colores según estado ---------- */
  const GRIS = new THREE.Color('#3a4553');
  function foco() { return sel || hover; }
  function vecinosDe(id) { return VEC[id] || new Map(); }
  function indDe(id) { return IND.filter(x => x.a === id || x.b === id); }
  let dirty = true;
  function construir() {
    const f = foco(), vf = f ? vecinosDe(f) : null, indF = f ? new Set(indDe(f).map(x => x.a === f ? x.b : x.a)) : null;
    // nodos
    A.forEach((a, i) => {
      const n = NODOS[i], on = activo(a);
      let op = on ? 1 : .25, col = on ? n.col : GRIS;
      if (on && f && a.id !== f && !vf.has(a.id) && !indF.has(a.id)) op = .18;
      n.m.material.color.copy(col); n.m.material.opacity = op; n.halo.visible = on && (!f || a.id === f || vf.has(a.id));
      n.halo.material.opacity = a.id === f ? .45 : .22;
      n.base = on ? a.r : a.r * .55;
    });
    // directas
    const pos = [], cols = [], c = new THREE.Color(), p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
    PULSOS.length = 0;
    for (const r of REL) {
      const i = byId[r.a].i, j = byId[r.b].i;
      if (!verDir || !relActiva(r)) continue;
      const toca = f && (r.a === f || r.b === f);
      c.set(DIM[r.d].c); if (f && !toca) c.lerp(GRIS, .82);
      for (let k = 0; k < N; k++) { curva(i, j, k / N, p0); curva(i, j, (k + 1) / N, p1); pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z); cols.push(c.r, c.g, c.b, c.r, c.g, c.b); }
      if (!f || toca) PULSOS.push({ i, j, c: new THREE.Color(DIM[r.d].c) });
    }
    if (!pos.length) pos.push(0, -9999, 0, 0, -9999, 0), cols.push(0, 0, 0, 0, 0, 0);
    geoDir.setPositions(pos); geoDir.setColors(cols);
    // indirectas
    const pi = [], ci = [];
    if (verInd) for (const x of IND) {
      const i = byId[x.a].i, j = byId[x.b].i, toca = f && (x.a === f || x.b === f);
      if (f && !toca) continue;
      const al = toca ? .75 : .13;
      for (let k = 0; k < N; k += 2) { curva(i, j, k / N, p0); curva(i, j, Math.min(1, (k + 1) / N), p1); pi.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z); ci.push(1, 1, 1, al, 1, 1, 1, al); } // trazo punteado
    }
    geoInd.setAttribute('position', new THREE.Float32BufferAttribute(pi, 3)); geoInd.setAttribute('color', new THREE.Float32BufferAttribute(ci, 4));
    // plomadas
    const pp = [], pc = [];
    A.forEach((a, i) => { if (!activo(a)) return; const cc = new THREE.Color(COM[a.com].c); pp.push(PS[i].x, PS[i].y, PS[i].z, PG[i].x, Y0 + 2, PG[i].z); pc.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b); });
    geoPin.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); geoPin.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3));
    dirty = false; pintarPanel();
  }
  const PULSOS = [];

  /* ---------- interfaz ---------- */
  const css = document.createElement('style'); css.textContent = `
#cg-btn{position:fixed;z-index:91;right:205px;top:16px;display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(8,16,26,.96));border:1.5px solid #e0a21f;box-shadow:0 8px 24px rgba(0,0,0,.6),0 0 14px rgba(224,162,31,.35);color:#fff3d6;font:750 12px system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;backdrop-filter:blur(10px)}
#cg-btn:hover{transform:translateY(-2px)}
#cg-pan{position:fixed;z-index:97;right:16px;top:60px;width:min(350px,calc(100vw - 24px));max-height:calc(100vh - 80px);overflow:auto;background:rgba(8,16,26,.95);backdrop-filter:blur(18px);border:1.5px solid rgba(224,162,31,.55);border-radius:16px;box-shadow:0 24px 55px rgba(0,0,0,.75);color:#e2f3ff;font:12px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;display:none;scrollbar-width:thin}
#cg-pan.on{display:block}
#cg-pan h4{margin:0;font-size:14px;color:#fff}
#cg-pan .hd{display:flex;align-items:flex-start;gap:8px;padding:12px 14px 8px;border-bottom:1px solid rgba(255,255,255,.08)}
#cg-pan .hd p{margin:2px 0 0;color:#94a3b8;font-size:11px}
#cg-pan .x{margin-left:auto;flex:none;width:28px;height:28px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#cbd5e1;cursor:pointer;font-size:15px}
#cg-pan .sec{padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.06)}
#cg-pan .t{font-size:10px;font-weight:800;letter-spacing:.08em;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;display:flex;justify-content:space-between}
#cg-fase{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#cg-pan button.b{padding:7px 8px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#cbd5e1;font:700 11px system-ui,sans-serif;cursor:pointer}
#cg-pan button.b.on{background:#e0a21f;color:#1a1204;border-color:transparent}
#cg-pan .chips{display:flex;flex-wrap:wrap;gap:5px}
#cg-pan .chip{display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e2e8f0;font-size:11px;cursor:pointer;user-select:none}
#cg-pan .chip i{width:10px;height:10px;border-radius:50%;flex:none}
#cg-pan .chip i.ln{height:3px;width:16px;border-radius:2px}
#cg-pan .chip.off{opacity:.35;text-decoration:line-through}
#cg-pan .met{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
#cg-pan .met div{padding:5px;border-radius:8px;background:rgba(255,255,255,.04);text-align:center}
#cg-pan .met b{display:block;font-size:14px;color:#fcd34d}
#cg-pan .met span{font-size:9px;color:#94a3b8}
#cg-ficha b.n{font-size:13px;color:#fff;display:block}
#cg-ficha .k{display:inline-block;padding:1px 7px;border-radius:5px;color:#fff;font-size:10px;font-weight:700;margin:3px 4px 4px 0}
#cg-ficha ul{margin:4px 0 0;padding:0;list-style:none;max-height:150px;overflow:auto}
#cg-ficha li{padding:2px 0;color:#cbd5e1;font-size:11px;cursor:pointer}
#cg-ficha li:hover{color:#fff}
#cg-ficha li i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}
#cg-pan .ayuda{color:#94a3b8;font-size:10.5px}
#cg-pan a{color:#fcd34d}
.cg-et{position:fixed;z-index:9;transform:translate(-50%,-130%);pointer-events:none;padding:2px 7px;border-radius:7px;background:rgba(8,16,26,.82);border:1px solid var(--c);color:#f1f5f9;font:700 10.5px system-ui,sans-serif;white-space:nowrap;display:none}
.cg-et.hub{font-size:12px;padding:3px 9px;border-width:1.5px}
.cg-et.apag{opacity:.45;text-decoration:line-through}
@media(max-width:760px){#cg-btn{top:auto;right:12px;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 100px);font-size:11px;padding:7px 11px}#cg-pan{top:auto;left:8px;right:8px;width:auto;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 52px);max-height:62vh}}
`; document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'cg-btn'; btn.innerHTML = '<span>✦</span><span>RED 3D · CONECTOGRAFÍA</span>'; document.body.appendChild(btn);
  const pan = document.createElement('div'); pan.id = 'cg-pan'; document.body.appendChild(pan);
  pan.innerHTML = `
<div class="hd"><div><h4>✦ Red de actores 3D</h4><p>5 hubs · ${A.length - 5} nodos · conexiones directas e indirectas</p></div><button class="x" title="Cerrar">✕</button></div>
<div class="sec"><div class="t">Vista</div><div id="cg-fase"><button class="b on" data-f="0">🕸️ Red</button><button class="b" data-f="1">🗺️ Conectografía</button></div></div>
<div class="sec"><div class="t"><span>Métricas</span><span id="cg-off"></span></div><div class="met" id="cg-met"></div></div>
<div class="sec"><div class="t">Conexiones</div><div class="chips" id="cg-con"></div></div>
<div class="sec"><div class="t">Comunidades (color del nodo)</div><div class="chips" id="cg-com"></div></div>
<div class="sec"><div class="t">Dimensiones (color de la conexión)</div><div class="chips" id="cg-dim"></div></div>
<div class="sec" id="cg-ficha"></div>
<div class="sec ayuda">Clic en un nodo: ver sus conexiones · <b>doble clic: apagar / encender</b> · clic en el vacío: soltar.<br>Arrastra para girar. <a href="red_georef.html" target="_blank">Lámina 2D para imprimir ↗</a></div>
<div class="sec"><button class="b on" id="cg-modelo" style="width:100%">🔁 Bavaria Común: sintaxis, sub-red, asambleas y modelo ↗</button><div class="ayuda" style="margin-top:5px">Abre el modelo dinámico (tipo Vensim) con los actores que tengas encendidos aquí.</div></div>`;
  const $ = s => pan.querySelector(s);
  pan.querySelector('#cg-modelo').onclick = () => open('bavaria_comun.html?off=' + [...off].join(',') + '&com=' + [...comOff].join(',') + '#modelo', '_blank');
  $('.x').onclick = () => abrir(false);
  btn.onclick = () => abrir(!grupo.visible);
  pan.querySelectorAll('#cg-fase .b').forEach(b => b.onclick = () => irFase(+b.dataset.f));
  $('#cg-com').innerHTML = ORD.map(k => `<span class="chip" data-com="${k}" title="${COM[k].d}"><i style="background:${COM[k].c}"></i>${COM[k].n}</span>`).join('');
  $('#cg-dim').innerHTML = Object.entries(DIM).map(([k, d]) => `<span class="chip" data-dim="${k}" title="${d.d}"><i class="ln" style="background:${d.c}"></i>${k} · ${d.n}</span>`).join('');
  pan.querySelectorAll('[data-com]').forEach(c => c.onclick = () => { const k = c.dataset.com; comOff.has(k) ? comOff.delete(k) : comOff.add(k); recalcular(); });
  pan.querySelectorAll('[data-dim]').forEach(c => c.onclick = () => { const k = c.dataset.dim; dimOff.has(k) ? dimOff.delete(k) : dimOff.add(k); recalcular(); });
  function pintarCon() {
    $('#cg-con').innerHTML = `<span class="chip ${verDir ? '' : 'off'}" data-c="dir"><i class="ln" style="background:#e2e8f0;height:3px"></i>Directas</span><span class="chip ${verInd ? '' : 'off'}" data-c="ind"><i class="ln" style="background:repeating-linear-gradient(90deg,#e2e8f0 0 3px,transparent 3px 6px)"></i>Indirectas (2 pasos)</span><span class="chip ${fondoNegro ? '' : 'off'}" data-c="neg">🌑 Fondo negro</span><span class="chip" data-c="nom">🏷️ Nombres: ${nombres}</span>${off.size ? `<span class="chip" data-c="on">💡 Encender todos (${off.size})</span>` : ''}`;
    pan.querySelectorAll('[data-c]').forEach(c => c.onclick = () => {
      const k = c.dataset.c;
      if (k === 'dir') verDir = !verDir; else if (k === 'ind') verInd = !verInd;
      else if (k === 'nom') nombres = nombres === 'hubs' ? 'todos' : nombres === 'todos' ? 'ninguno' : 'hubs';
      else if (k === 'on') off.clear();
      else if (k === 'neg') { fondoNegro = !fondoNegro; velo.visible = fondoNegro; }
      recalcular();
    });
  }
  function pintarPanel() {
    pan.querySelectorAll('[data-com]').forEach(c => c.classList.toggle('off', comOff.has(c.dataset.com)));
    pan.querySelectorAll('[data-dim]').forEach(c => c.classList.toggle('off', dimOff.has(c.dataset.dim)));
    pan.querySelectorAll('#cg-fase .b').forEach(b => b.classList.toggle('on', +b.dataset.f === faseObj));
    pintarCon();
    const act = A.filter(activo).length, dir = REL.filter(relActiva).length;
    const dens = act > 1 ? (2 * dir / (act * (act - 1)) * 100).toFixed(1) : '0';
    $('#cg-met').innerHTML = `<div><b>${act}</b><span>actores</span></div><div><b>${dir}</b><span>directas</span></div><div><b>${IND.length}</b><span>indirectas</span></div><div><b>${dens}%</b><span>densidad</span></div>`;
    $('#cg-off').textContent = off.size ? off.size + ' apagados' : '';
    const fi = $('#cg-ficha'), f = sel && byId[sel];
    if (!f) { fi.innerHTML = '<div class="t">Actor</div><div class="ayuda">Toca un nodo para ver sus conexiones directas e indirectas.</div>'; return; }
    const v = vecinosDe(f.id), ind = indDe(f.id);
    fi.innerHTML = `<div class="t">Actor seleccionado</div><b class="n">${f.n}</b>
<span class="k" style="background:${COM[f.com].c}">${COM[f.com].n}${f.hub ? ' · hub' : ''}</span><span class="k" style="background:${DIM[f.dim].c}">${f.dim} · ${DIM[f.dim].n}</span>${off.has(f.id) ? '<span class="k" style="background:#475569">apagado</span>' : ''}
<div style="color:#cbd5e1">${f.d}</div><div class="ayuda" style="margin-top:3px">${f.lat.toFixed(5)}°, ${f.lng.toFixed(5)}°</div>
<div class="t" style="margin-top:8px"><span>Directas</span><span>${v.size}</span></div><ul>${[...v].map(([id, d]) => `<li data-id="${id}"><i style="background:${DIM[d].c}"></i>${byId[id].n}</li>`).join('') || '<li>—</li>'}</ul>
<div class="t" style="margin-top:8px"><span>Indirectas (vía)</span><span>${ind.length}</span></div><ul>${ind.map(x => { const o = x.a === f.id ? x.b : x.a; return `<li data-id="${o}"><i style="background:${COM[byId[o].com].c}"></i>${byId[o].n} <span style="color:#64748b">· vía ${x.via.map(w => byId[w].n).join(', ')}</span></li>`; }).join('') || '<li>—</li>'}</ul>
<div style="display:flex;gap:6px;margin-top:8px"><button class="b" id="cg-tog">${off.has(f.id) ? '💡 Encender' : '⏻ Apagar'} nodo</button><button class="b" id="cg-ir">🎯 Enfocar</button></div>`;
    fi.querySelectorAll('li[data-id]').forEach(li => li.onclick = () => seleccionar(li.dataset.id, true));
    $('#cg-tog').onclick = () => alternar(f.id);
    $('#cg-ir').onclick = () => enfocar(f.id);
  }
  function recalcular() { VEC = calcIndirectas(); dirty = true; }
  function alternar(id) { off.has(id) ? off.delete(id) : off.add(id); recalcular(); }
  function seleccionar(id, volar) { sel = id; dirty = true; if (volar) enfocar(id); }

  // etiquetas
  const ETQ = A.map(a => { const d = document.createElement('div'); d.className = 'cg-et' + (a.hub ? ' hub' : ''); d.style.setProperty('--c', COM[a.com].c); d.textContent = a.n; document.body.appendChild(d); return d; });

  /* ---------- cámara ---------- */
  const volar = (target, dist, alto, lado = -0.45) => {
    const p1 = new THREE.Vector3(target.x + dist * lado, target.y + alto, target.z + dist);
    if (innerWidth > 760) { const dir = target.clone().sub(p1).setY(0).normalize(), der = new THREE.Vector3(-dir.z, 0, dir.x), k = Math.hypot(dist, alto) * 0.2; target = target.clone().addScaledVector(der, k); p1.addScaledVector(der, k); }
    T3.anim = { t: 0, dur: 2.2, p0: T3.camera.position.clone(), p1, c0: T3.orbit.target.clone(), c1: target.clone() };
  };
  function vistaFase(f) { if (f === 0) volar(CEN, 3500, 1100); else volar(new THREE.Vector3(cx, Y0 + 200, cz + 200), 3900, 3100, -0.35); }
  function enfocar(id) { const i = byId[id].i; volar(PS[i].clone(), 900, 420); }
  function irFase(f) { faseObj = f; vistaFase(f); dirty = true; pintarPanel(); }
  /* fondo negro mientras la red está abierta: cielo oculto, fondo y niebla negros (la niebla, más tenue).
     Se aplica justo antes de cada render y se deshace después, así el ciclo de 24 h del cielo (cielo.js) no se pisa. */
  const NEGRO = new THREE.Color(0x000000), guard = { bg: new THREE.Color(), fog: new THREE.Color(), dens: 0, cielo: [] };
  const cielos = () => T3.scene.children.filter(o => o.isMesh && o.material && o.material.isShaderMaterial && o.material.side === THREE.BackSide);
  const sc = T3.scene, antes = sc.onBeforeRender, despues = sc.onAfterRender;
  sc.onBeforeRender = function (...a) {
    antes && antes.apply(this, a);
    if (!grupo.visible || !fondoNegro) return;
    guard.on = true;
    if (sc.background && sc.background.isColor) { guard.bg.copy(sc.background); sc.background.copy(NEGRO); }
    if (sc.fog) { guard.fog.copy(sc.fog.color); sc.fog.color.copy(NEGRO); if (sc.fog.density != null) { guard.dens = sc.fog.density; sc.fog.density *= 0.35; } }
    guard.cielo = cielos().filter(o => o.visible); guard.cielo.forEach(o => o.visible = false);
  };
  sc.onAfterRender = function (...a) {
    if (guard.on) {
      guard.on = false;
      if (sc.background && sc.background.isColor) sc.background.copy(guard.bg);
      if (sc.fog) { sc.fog.color.copy(guard.fog); if (sc.fog.density != null) sc.fog.density = guard.dens; }
      guard.cielo.forEach(o => o.visible = true);
    }
    despues && despues.apply(this, a);
  };
  function abrir(on) {
    grupo.visible = on; pan.classList.toggle('on', on); btn.classList.toggle('on', on);
    if (!on) { ETQ.forEach(e => e.style.display = 'none'); return; }
    dirty = true; vistaFase(faseObj);
  }

  /* ---------- selección con el puntero ---------- */
  const cvs = T3.renderer.domElement, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  const tocar = e => {
    const r = cvs.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, T3.camera);
    const h = ray.intersectObjects(NODOS.map(n => n.m), false); return h.length ? h[0].object.userData.a : null;
  };
  let pd = null;
  cvs.addEventListener('pointerdown', e => { pd = [e.clientX, e.clientY]; });
  cvs.addEventListener('pointerup', e => {
    if (!grupo.visible || !pd || Math.hypot(e.clientX - pd[0], e.clientY - pd[1]) > 6) return;
    const a = tocar(e); sel = a ? a.id : null; dirty = true;
  });
  cvs.addEventListener('dblclick', e => { if (!grupo.visible) return; const a = tocar(e); if (a) { e.preventDefault(); e.stopPropagation(); alternar(a.id); sel = a.id; } }, true);
  let ultMov = 0;
  cvs.addEventListener('pointermove', e => {
    if (!grupo.visible || e.buttons || performance.now() - ultMov < 60) return; ultMov = performance.now();
    const a = tocar(e), id = a ? a.id : null; cvs.style.cursor = a ? 'pointer' : '';
    if (id !== hover) { hover = id; dirty = true; }
  });

  /* ---------- bucle ---------- */
  const v = new THREE.Vector3(); let ult = performance.now();
  const pp = pulG.attributes.position.array, pcol = pulG.attributes.color.array;
  function bucle() {
    requestAnimationFrame(bucle);
    if (!grupo.visible) return;
    const ahora = performance.now(), dt = Math.min(.1, (ahora - ult) / 1000); ult = ahora;
    matDir.resolution.set(innerWidth, innerHeight);
    // transición red ↔ conectografía
    if (fase !== faseObj) { fase += Math.sign(faseObj - fase) * dt / 3.2; if (Math.abs(fase - faseObj) < dt / 3.2) fase = faseObj; dirty = true; }
    const e = ease(fase);
    A.forEach((a, i) => {
      PS[i].lerpVectors(PR[i], PG[i], e);
      const n = NODOS[i], s = (n.base || a.r) * (1 - .35 * e) * (a.id === sel ? 1.35 : 1);
      n.m.position.copy(PS[i]); n.m.scale.setScalar(s);
      DISCOS[i].material.opacity = activo(a) ? e * .7 : 0;
    });
    matPin.opacity = e * .55;
    if (dirty) construir();
    // pulsos
    let k = 0; const f = foco();
    for (const q of PULSOS) for (let j = 0; j < 2 && k < NPU; j++, k++) {
      const u = ((ahora / 1000) * (f ? .32 : .18) + j * .5 + k * .037) % 1; curva(q.i, q.j, u, v);
      pp[k * 3] = v.x; pp[k * 3 + 1] = v.y; pp[k * 3 + 2] = v.z; pcol[k * 3] = q.c.r; pcol[k * 3 + 1] = q.c.g; pcol[k * 3 + 2] = q.c.b;
    }
    pulG.setDrawRange(0, k); pulG.attributes.position.needsUpdate = true; pulG.attributes.color.needsUpdate = true;
    // etiquetas
    const W_ = innerWidth, H_ = innerHeight, cam = T3.camera, vf = f ? vecinosDe(f) : null;
    A.forEach((a, i) => {
      const el = ETQ[i], on = activo(a);
      let ver = nombres === 'todos' || (nombres === 'hubs' && a.hub) || a.id === f || (vf && vf.has(a.id) && on);
      if (comOff.has(a.com)) ver = false;
      if (!ver) { el.style.display = 'none'; return; }
      v.copy(PS[i]); v.y += NODOS[i].m.scale.x; v.project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { el.style.display = 'none'; return; }
      el.style.display = 'block'; el.classList.toggle('apag', !on);
      el.style.left = ((v.x + 1) / 2 * W_).toFixed(1) + 'px'; el.style.top = ((1 - v.y) / 2 * H_).toFixed(1) + 'px';
    });
  }
  requestAnimationFrame(bucle);

  return { abrir, irFase, seleccionar, alternar };
}
