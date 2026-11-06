/* ============ ESTRATEGIA E1 · BAVARIA COMÚN (plan maestro en la antigua fábrica de Bavaria) ============
   Al prender E1 se resalta el predio; al tocarlo se abre la explicación 3D en la fábrica:
   - dinámica actual y lo que se quiere cambiar (una frase) y la dinámica que propicia la estrategia (una frase)
   - PROGRAMA ARQUITECTÓNICO: qué va en cada edificio y zona del predio y qué dinámica genera (volúmenes de color y etiquetas)
   - transporte: entrada de productores al patio de carga interno, salida en triciclos de carga a los barrios, personas a pie y en bici
   - convención de AGENTES HUMANOS (figuras que se mueven entre los espacios de su rol)
   - convención de INTERACCIONES BIÓTICAS que llegan al predio (arcos animados con los colores de la red biótica)
   Ubicación del programa: sobre la imagen satelital y las huellas de OSM (data3d/bavaria.json). Todo son hipótesis de diseño. */

const PROGRAMA = [ // e: índice del edificio en bavaria.json; z: zona abierta de bavaria.json
  { k: 'mercado', n: 'Mercado de proximidad', c: '#f59e0b', e: 2, d: 'Edificio central: se recupera la estructura de ladrillo y se le pone cubierta nueva.', din: 'Puestos pequeños con cupos rotativos y tope de volumen: los productores locales venden directo a los vecinos y arman pedidos por barrio. Ningún productor ni comprador depende solo de Bavaria.' },
  { k: 'cocina', n: 'Cocina y comedor comunitario', c: '#fb7185', e: 3, d: 'Edificio de ladrillo junto al mercado.', din: 'Cocina lo que el mercado no alcanza a vender y abastece a comedores y colegios; los residuos orgánicos van al compostaje y al laboratorio de hongos.' },
  { k: 'talleres', n: 'Talleres de formación', c: '#60a5fa', e: 0, d: 'Edificio norte (estructura de 2,6 ha).', din: 'Oficios, agricultura urbana, cultivo de hongos y energía para jóvenes y vecinos; los talleres generan ingresos para el fondo común.' },
  { k: 'asamblea', n: 'Espacio de asamblea', c: '#34d399', e: 23, d: 'Edificio recuperado en el centro del conjunto.', din: 'La asamblea del barrio decide y las comisiones ejecutan, con cargos rotativos, copresidencia de género y rendición de cuentas.' },
  { k: 'cuidados', n: 'Espacio de cuidados', c: '#f472b6', e: 6, d: 'Edificio del sur, el más tranquilo del conjunto.', din: 'Cuidado de niños y personas mayores mientras otros participan en el mercado, los talleres y la asamblea.' },
  { k: 'hongos', n: 'Laboratorio de hongos', c: '#e9d5ff', e: 4, d: 'Bloque de ladrillo del suroccidente (parte del distrito).', din: 'Convierte los residuos orgánicos del mercado y la cocina en sustrato para orellanas; la venta de hongos alimenta el fondo común.' },
  { k: 'energia', n: 'Energía', c: '#facc15', e: 9, d: 'Edificio junto al tanque de agua (parte del distrito).', din: 'Varias fuentes de energía y un respaldo para la refrigeración del mercado si se va la luz.' },
  { k: 'sede', n: 'Comisiones y equipo técnico', c: '#c084fc', e: 5, d: 'Edificio administrativo (la torre).', din: 'Gestiona el acuerdo escrito de cesión de uso con el propietario y la fiducia, las cuentas del fondo común y los permisos.' },
  { k: 'patio', n: 'Patio de carga interno', c: '#38bdf8', z: 'patio', d: 'Pavimento junto al acceso por la Av. Boyacá.', din: 'Todo se carga y descarga dentro del predio, en ventanas horarias fuera de las horas pico, y no sobre la Av. Boyacá.' },
  { k: 'huerto', n: 'Huerto', c: '#84cc16', z: 'huerto', d: 'Prado del oriente, entre los dos bosques.', din: 'Solo después del estudio de suelo (no se ha hecho estudio de toxicología ambiental); si hay contaminación, camas elevadas.' },
  { k: 'compost', n: 'Compostaje', c: '#a16207', z: 'compost', d: 'Borde del parqueadero de asfalto, junto al huerto.', din: 'Recibe los residuos orgánicos del mercado y la cocina; el compost y las lombrices alimentan el huerto y se venden.' },
  { k: 'bosque', n: 'Borde arbolado', c: '#166534', bosque: true, d: 'Bosque del oriente y del sur del predio.', din: 'No se interviene: se observa y se conecta con los humedales. La suspensión judicial de la tala y el riesgo de incendio lo hacen una condición, no una opción.' }
];
const AGENTES = [ // convención de agentes humanos: color, cuántos y a qué espacios van
  { k: 'vecinos', n: 'Vecinos (asamblea y comisiones)', c: '#34d399', cant: 34, a: ['asamblea', 'mercado', 'talleres', 'huerto', 'cuidados'] },
  { k: 'productores', n: 'Productores locales y periurbanos', c: '#f59e0b', cant: 12, a: ['patio', 'mercado'] },
  { k: 'puesteros', n: 'Puesteros del mercado', c: '#fb923c', cant: 18, a: ['mercado'] },
  { k: 'recicladores', n: 'Recicladores', c: '#a3e635', cant: 6, a: ['mercado', 'compost', 'cocina'] },
  { k: 'comedores', n: 'Comedores y colegios', c: '#60a5fa', cant: 10, a: ['cocina', 'patio'] },
  { k: 'cuidadoras', n: 'Cuidadoras', c: '#f472b6', cant: 8, a: ['cuidados', 'asamblea'] },
  { k: 'tecnico', n: 'Equipo técnico', c: '#c084fc', cant: 5, a: ['sede', 'hongos', 'energia'] },
  { k: 'propietario', n: 'Propietario y fiducia', c: '#94a3b8', cant: 2, a: ['sede'] },
  { k: 'ambiente', n: 'Secretaría de Ambiente (permisos del arbolado)', c: '#2dd4bf', cant: 2, a: ['bosque'] }
];
const BIOTICAS = [ // interacciones bióticas que llegan al predio (colores de la red biótica)
  { k: 'dosel', n: 'Aves que anidan en el dosel del bosque', c: '#D1A996', de: 'bosque', a: 'bosque' },
  { k: 'humedal', n: 'Conexión ecológica bosque ↔ humedales', c: '#6B9080', de: 'bosque', a: 'humedales' },
  { k: 'hongos', n: 'Residuos orgánicos → hongos y microorganismos del sustrato', c: '#E7C878', de: 'mercado', a: 'hongos' },
  { k: 'lombrices', n: 'Compost y lombrices → suelo del huerto', c: '#84A48B', de: 'compost', a: 'huerto' },
  { k: 'polin', n: 'Abejas y aves del bosque polinizan el huerto', c: '#A386A9', de: 'bosque', a: 'huerto' },
  { k: 'roedores', n: 'Roedores atraídos por residuos (manejo del compost)', c: '#C96349', de: 'bosque', a: 'compost' }
];
const TEXTO = {
  hoy: 'Hoy Bavaria es un predio cerrado y abandonado de 71 ha junto a la Av. Boyacá: sus edificios se deterioran, el bosque está amenazado por la tala y los incendios, y el abastecimiento del barrio depende de Corabastos y de camiones que congestionan la zona; queremos que el barrio lo recupere y lo gobierne en común, sin que se convierta en otro gran centro mayorista.',
  propone: 'Bavaria Común propicia un nodo pequeño de acopio, producción y formación gobernado por la asamblea: los productores llegan en vehículos livianos a un patio interno, el mercado y la cocina abastecen a barrios, comedores y colegios en triciclos de carga, los residuos vuelven como hongos y compost, y el bosque se conserva y se conecta con los humedales.'
};

export async function iniciarPlanBavaria({ THREE, T3, lw, OX, OZ, Y0 = 2.0 }) {
  const [D, G] = await Promise.all(['data3d/bavaria.json?v=2', 'data3d/giro_sim.json'].map(u => fetch(u).then(r => r.json())));
  const ARB = await fetch('data3d/bavaria_arboles.json?v=1').then(r => r.json()).then(j => j.arboles).catch(() => []);
  const W = (p) => lw(p[0], p[1]);
  const sitio = D.sitio.map(W), dentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  const centro = (P) => { let x = 0, z = 0; for (const p of P) { x += p[0]; z += p[1]; } return [x / P.length, z / P.length]; };
  const [scx, scz] = centro(sitio);
  const forma = (P, y) => { const s = new THREE.Shape(P.map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
  const borde = (P, y, col, op = 1) => { const a = []; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a.push(p[0], y, p[1], q[0], y, q[1]); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); };

  /* ---------- 1. resaltado del predio (estrategia prendida) ---------- */
  const resalte = new THREE.Group(); resalte.visible = false; T3.scene.add(resalte);
  const mRes = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const fRes = new THREE.Mesh(forma(sitio, Y0 + 0.6), mRes); fRes.renderOrder = 6; resalte.add(fRes);
  for (const dy of [0.7, 4, 8]) { const b = borde(sitio, Y0 + dy, 0x7dd3fc, dy > 1 ? 0.45 : 1); b.renderOrder = 7; resalte.add(b); }

  /* ---------- 2. plan (al tocar el resaltado) ---------- */
  const plan = new THREE.Group(); plan.visible = false; T3.scene.add(plan);
  const PUNTO = {}; // espacio -> {c: centro mundo, poly, y}
  for (const p of PROGRAMA) {
    const col = new THREE.Color(p.c);
    if (p.e !== undefined) {
      const e = D.edif[p.e], P = e.p.map(W), h = e.h;
      const s = new THREE.Shape(P.map(q => new THREE.Vector2(q[0], -q[1]))), g = new THREE.ExtrudeGeometry(s, { depth: h + 2.5, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, Y0 - 1.5, 0);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.38, depthWrite: false })); m.renderOrder = 6; plan.add(m);
      const ed = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.95 })); ed.renderOrder = 7; plan.add(ed);
      PUNTO[p.k] = { c: centro(P), poly: P, y: Y0 + h + 4, m };
    } else if (p.z) {
      const P = D.zonas[p.z].map(W);
      const m = new THREE.Mesh(forma(P, Y0 + 0.5), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 6; plan.add(m);
      plan.add(borde(P, Y0 + 0.6, col));
      PUNTO[p.k] = { c: centro(P), poly: P, y: Y0 + 6, m };
    } else if (p.bosque) {
      // borde arbolado: los árboles del predio fuera de los edificios; se marca con postes de color y su centro es el del bosque oriental
      const pts = ARB.map(t => W(t)); const L = pts.filter((q, i) => i % 9 === 0);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(L.flatMap(q => [q[0], Y0 + 24, q[1]]), 3));
      const m = new THREE.Points(g, new THREE.PointsMaterial({ color: col.clone().offsetHSL(0, 0, 0.25), size: 5, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false })); plan.add(m);
      const este = pts.filter(q => q[0] > scx + 120); PUNTO.bosque = { c: centro(este.length ? este : pts), pts, y: Y0 + 28, m };
    }
  }

  /* ---------- 3. transporte: entrada, salida y personas ---------- */
  const cercanoBorde = (x, z) => { let best = null, bd = 1e18; for (let i = 0; i < sitio.length; i++) { const a = sitio[i], b = sitio[(i + 1) % sitio.length], dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1, f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)), px = a[0] + dx * f, pz = a[1] + dz * f, d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = [px, pz]; } } return best; };
  const afuera = (p, d) => { const dx = p[0] - scx, dz = p[1] - scz, l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * d, p[1] + dz / l * d]; };
  const puerta = (mx, my) => { const w = W([mx, my]); return cercanoBorde(w[0], w[1]); };
  const pW = puerta(9000, 3260), pS = puerta(9660, 2620), pN = puerta(9470, 3520);
  const M = (x, y) => W([x, y]); // punto del modelo (bavaria.json) -> mundo
  const FLUJOS = [
    { k: 'entrada', n: 'Entrada: productores en vehículos livianos al patio interno (fuera de horas pico)', c: '#f59e0b', ruta: [afuera(pW, 70), pW, PUNTO.patio.c], v: 7, tipo: 'van', cant: 4 },
    { k: 'salida', n: 'Salida: pedidos por barrio en triciclos de carga a tiendas de barrio, conjuntos, comedores y colegios', c: '#38bdf8', ruta: [PUNTO.patio.c, M(9230, 2955), M(9417, 2823), M(9566, 2721), pS, afuera(pS, 160)], v: 4, tipo: 'triciclo', cant: 7 },
    { k: 'personas', n: 'Personas: a pie y en bici, sin parqueadero masivo', c: '#e2e8f0', ruta: [afuera(pN, 90), pN, M(9420, 3230), PUNTO.mercado.c], v: 1.4, tipo: 'persona', cant: 10 },
    { k: 'personas2', n: '', c: '#e2e8f0', ruta: [afuera(pS, 90), pS, M(9417, 2823), PUNTO.asamblea.c], v: 1.4, tipo: 'persona', cant: 8 },
    { k: 'residuos', n: 'Residuos orgánicos: mercado y cocina → compostaje y laboratorio de hongos', c: '#a16207', ruta: [PUNTO.mercado.c, M(9440, 3010), PUNTO.compost.c], v: 3, tipo: 'triciclo', cant: 2 }
  ];
  const linea = (P, y, col, op) => { const a = []; for (let i = 0; i < P.length - 1; i++) a.push(P[i][0], y, P[i][1], P[i + 1][0], y, P[i + 1][1]); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); l.renderOrder = 8; return l; };
  const largoRuta = (R) => { const c = [0]; for (let i = 1; i < R.length; i++) c.push(c[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1])); return c; };
  const enRuta = (R, C, d) => { d = ((d % C[C.length - 1]) + C[C.length - 1]) % C[C.length - 1]; let i = 1; while (i < C.length - 1 && C[i] < d) i++; const f = (d - C[i - 1]) / ((C[i] - C[i - 1]) || 1); return [R[i - 1][0] + (R[i][0] - R[i - 1][0]) * f, R[i - 1][1] + (R[i][1] - R[i - 1][1]) * f, Math.atan2(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1])]; };
  const GEOV = { van: new THREE.BoxGeometry(2.0, 2.2, 4.6).translate(0, 1.1, 0), triciclo: new THREE.BoxGeometry(1.2, 1.4, 2.2).translate(0, 0.7, 0), persona: new THREE.CapsuleGeometry(0.3, 1.1, 3, 6).translate(0, 0.85, 0) };
  const MOV = [];
  for (const f of FLUJOS) {
    f.C = largoRuta(f.ruta); plan.add(linea(f.ruta, Y0 + 0.9, f.c, 0.95));
    const im = new THREE.InstancedMesh(GEOV[f.tipo], new THREE.MeshBasicMaterial({ color: f.c }), f.cant); im.frustumCulled = false; plan.add(im);
    MOV.push({ f, im, d: Array.from({ length: f.cant }, (_, i) => i / f.cant * f.C[f.C.length - 1]) });
  }

  /* ---------- 4. agentes humanos ---------- */
  const puntoEn = (P) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } for (let k = 0; k < 60; k++) { const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0); if (dentro(P, x, z)) return [x, z]; } return centro(P); };
  const destino = (k) => { const s = PUNTO[k]; if (!s) return [scx, scz]; if (s.pts) { const q = s.pts[Math.floor(Math.random() * s.pts.length)]; return [q[0] + 4, q[1] + 4]; } return puntoEn(s.poly); };
  const HUM = [];
  const figura = new THREE.CapsuleGeometry(0.34, 1.15, 3, 8).translate(0, 0.92, 0);
  for (const t of AGENTES) {
    const im = new THREE.InstancedMesh(figura, new THREE.MeshLambertMaterial({ color: t.c, emissive: new THREE.Color(t.c).multiplyScalar(0.45) }), t.cant); im.frustumCulled = false; plan.add(im);
    const L = []; for (let i = 0; i < t.cant; i++) { const p = destino(t.a[i % t.a.length]); L.push({ x: p[0], z: p[1], obj: destino(t.a[Math.floor(Math.random() * t.a.length)]), pausa: Math.random() * 8 }); }
    HUM.push({ t, im, L });
  }

  /* ---------- 5. interacciones bióticas que llegan ---------- */
  const humedales = (G.humedales || []).map(h => { let x = 0, z = 0; for (const p of h.poly) { x += p[0] + OX; z += p[1] + OZ; } return [x / h.poly.length, z / h.poly.length]; }).filter(c => Math.hypot(c[0] - scx, c[1] - scz) < 4000);
  const ARCOS = [];
  const arco = (a, b, col, alto) => { const N = 28, P = []; for (let i = 0; i <= N; i++) { const u = i / N; P.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * u, a[2] + (b[2] - a[2]) * u + Math.sin(Math.PI * u) * alto, a[1] + (b[1] - a[1]) * u)); } const g = new THREE.BufferGeometry().setFromPoints(P); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false })); l.renderOrder = 9; plan.add(l); return P; };
  const pulsosG = new THREE.BufferGeometry(), NPU = 90, pp = new Float32Array(NPU * 3), pc = new Float32Array(NPU * 3);
  pulsosG.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pulsosG.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const pulsos = new THREE.Points(pulsosG, new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, depthWrite: false })); pulsos.frustumCulled = false; plan.add(pulsos);
  for (const b of BIOTICAS) {
    const col = new THREE.Color(b.c), lista = [];
    const pto = (k) => { const s = PUNTO[k]; if (k === 'bosque') { const q = s.pts[Math.floor(Math.random() * s.pts.length)]; return [q[0], q[1], Y0 + 18]; } return [s.c[0], s.c[1], s.y - 2]; };
    if (b.a === 'humedales') for (const h of humedales) lista.push(arco(pto('bosque'), [h[0], h[1], Y0 + 2], col, 160));
    else if (b.k === 'dosel') for (let i = 0; i < 5; i++) { const a = pto('bosque'), c = pto('bosque'); lista.push(arco(a, c, col, 25)); }
    else for (let i = 0; i < (b.de === 'bosque' ? 3 : 1); i++) lista.push(arco(pto(b.de), pto(b.a), col, 40));
    for (const P of lista) ARCOS.push({ P, col });
  }

  /* ---------- 6. etiquetas del programa ---------- */
  const css = document.createElement('style'); css.textContent = `
.bp-et{position:fixed;z-index:9;transform:translate(-50%,-100%);display:flex;align-items:center;gap:6px;padding:4px 9px 4px 4px;border-radius:999px;background:rgba(8,16,26,.88);border:1.5px solid var(--c);color:#e2f3ff;font:600 11px system-ui,-apple-system,"Segoe UI",sans-serif;white-space:nowrap;cursor:pointer}
.bp-et b{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--c);color:#04121c;font-size:10px}
.bp-et.sel{box-shadow:0 0 0 3px rgba(125,211,252,.45)}
#bp-res{position:fixed;z-index:9;transform:translate(-50%,-100%);padding:6px 12px;border-radius:12px;background:rgba(8,16,26,.9);border:1.5px solid #38bdf8;color:#e2f3ff;font:700 12px system-ui,sans-serif;cursor:pointer;white-space:nowrap}
#bp-res small{display:block;font-weight:500;color:#7dd3fc;font-size:10.5px}
#bp-pan{position:fixed;z-index:20;right:14px;top:14px;bottom:14px;width:min(400px,calc(100vw - 28px));overflow:auto;scrollbar-width:thin;padding:14px 15px;border-radius:16px;background:rgba(8,16,26,.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(125,211,252,.3);color:#e2f3ff;font:12px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;display:none}
#bp-pan.on{display:block}
#bp-pan .cab{display:flex;align-items:flex-start;gap:10px}#bp-pan .cab span{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:9px;background:#38bdf8;color:#04121c;font:800 13px system-ui}
#bp-pan h4{margin:0;font-size:16px}#bp-pan .cab em{display:block;font-style:normal;color:#94a3b8;font-size:11px}
#bp-pan .x{margin-left:auto;width:30px;height:30px;border:none;border-radius:8px;background:rgba(255,255,255,.07);color:#cbd5e1;font:700 16px system-ui;cursor:pointer}
#bp-pan .fr{margin:10px 0 0;padding:9px 10px;border-radius:10px;font-size:12px}
#bp-pan .fr b{display:block;font-size:9.5px;letter-spacing:.16em;margin-bottom:3px}
#bp-pan .hoy{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3)}#bp-pan .hoy b{color:#fca5a5}
#bp-pan .pro{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3)}#bp-pan .pro b{color:#6ee7b7}
#bp-pan .tabs{display:flex;flex-wrap:wrap;gap:4px;margin:12px 0 8px}
#bp-pan .tabs button{height:28px;padding:0 10px;border:none;border-radius:8px;background:rgba(255,255,255,.06);color:#cbd5e1;font:700 10px system-ui,sans-serif;letter-spacing:.05em;cursor:pointer}
#bp-pan .tabs button.on{background:#7dd3fc;color:#04121c}
#bp-pan .it{display:flex;gap:9px;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;border-radius:8px}
#bp-pan .it:hover,#bp-pan .it.sel{background:rgba(125,211,252,.08)}
#bp-pan .it i{flex:none;width:12px;height:12px;border-radius:3px;margin-top:3px}
#bp-pan .it b{font-weight:650}#bp-pan .it small{display:block;color:#94a3b8;font-size:10.5px}#bp-pan .it p{margin:3px 0 0;font-size:11.5px;color:#cbd5e1}
#bp-pan h5{margin:12px 0 4px;font-size:9.5px;letter-spacing:.16em;color:#94a3b8}
#bp-pan ul{margin:4px 0;padding-left:16px}#bp-pan li{margin:3px 0;font-size:11.5px;color:#cbd5e1}
#bp-pan .nota{margin-top:10px;font-size:10px;color:#64748b}
@media(max-width:760px){#bp-pan{top:auto;height:56vh;right:8px;left:8px;width:auto;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 4px)}.bp-et{font-size:10px}}`;
  document.head.appendChild(css);
  const ETQ = PROGRAMA.map((p, i) => { const d = document.createElement('div'); d.className = 'bp-et'; d.style.setProperty('--c', p.c); d.innerHTML = `<b>${i + 1}</b>${p.n}`; d.style.display = 'none'; d.onclick = () => enfocar(p.k); document.body.appendChild(d); return { d, p }; });
  const res = document.createElement('div'); res.id = 'bp-res'; res.innerHTML = 'E1 · Bavaria Común<small>Toca para ver el plan de la fábrica</small>'; res.style.display = 'none'; res.onclick = () => abrir(); document.body.appendChild(res);

  /* ---------- 7. panel ---------- */
  const pan = document.createElement('div'); pan.id = 'bp-pan'; document.body.appendChild(pan);
  const it = (c, t, s, p, data) => `<div class="it" ${data || ''}><i style="background:${c}"></i><div><b>${t}</b>${s ? `<small>${s}</small>` : ''}${p ? `<p>${p}</p>` : ''}</div></div>`;
  const TABS = {
    programa: () => PROGRAMA.map((p, i) => it(p.c, `${i + 1}. ${p.n}`, p.d, p.din, `data-k="${p.k}"`)).join(''),
    agentes: () => `<h5>AGENTES HUMANOS · figuras de color en el predio</h5>` + AGENTES.map(a => it(a.c, a.n, 'Va a: ' + a.a.map(k => PROGRAMA.find(p => p.k === k).n.toLowerCase()).join(', '))).join('')
      + `<h5>ABIÓTICOS</h5><ul><li>Edificios de la fábrica, suelo, agua lluvia, calor, ruido de la Av. Boyacá, residuos orgánicos, energía y vías.</li></ul>`,
    bioticas: () => `<h5>INTERACCIONES BIÓTICAS QUE LLEGAN · arcos animados</h5>` + BIOTICAS.map(b => it(b.c, b.n, '')).join('')
      + `<h5>BIÓTICOS DEL PREDIO</h5><ul><li>Arbolado (${ARB.length.toLocaleString('es-CO')} árboles detectados en la imagen; hay eucaliptos con riesgo de volcamiento), aves, roedores, hongos y microorganismos del sustrato, lombrices y fauna silvestre.</li></ul>`,
    transporte: () => FLUJOS.filter(f => f.n).map(f => it(f.c, f.n, '')).join('')
      + `<ul><li>Lo que Kennedy no produce se compra en conjunto a Corabastos o a mayoristas regionales, en pedidos consolidados, y no llega a Bavaria en tractomula.</li><li>Pendiente de verificar: cómo se conecta el predio con el transporte público y con la malla vial.</li></ul>`,
    tiempo: () => `<h5>FASES (hipótesis)</h5><ul><li>1. Estudios (suelo y arbolado) y negociación de una cesión de uso con el propietario y la fiducia.</li><li>2. Uso temporal de un edificio.</li><li>3. Consolidación.</li><li>4. Réplica en otros puntos.</li></ul>
      <h5>CÓMO SE SOSTIENE</h5><ul><li>Ingresos propios: cuotas de puestos, venta de hongos y compost y talleres, a un fondo común (referente: Christiania).</li><li>Comisiones con cargos rotativos, copresidencia de género y rendición de cuentas a la asamblea.</li><li>Acuerdo escrito con plazo, para no depender de que el propietario retire el uso.</li><li>Distinguir la entidad legal de la comunidad que usa el lugar (Findhorn).</li><li>Contra el desplazamiento: tope a los arriendos y uso colectivo (Can Batlló).</li><li>Señales de alerta: baja asistencia a la asamblea, puestos vacíos, ingresos que no cubren el mantenimiento.</li></ul>
      <h5>POR QUÉ NO SERÁ OTRO CORABASTOS</h5><ul><li>Otra función: nodo pequeño de acopio, producción y formación, no intermediario mayorista.</li><li>Tope de volumen y cupos rotativos.</li><li>Crece por réplica, no por tamaño: si llega al tope, se abre otro nodo.</li><li>Decisión distribuida: responde a la asamblea, no a una sola administración.</li><li>A medir en el simulador: % del volumen por nodo, viajes de camión por día y % que sigue pasando por Corabastos.</li></ul>`
  };
  let tab = 'programa', sel = null;
  function pintarPanel() {
    pan.innerHTML = `<div class="cab"><span>E1</span><div><h4>Bavaria Común</h4><em>Plan maestro de la antigua fábrica de Bavaria · recuperación autoorganizada · referente: Can Batlló</em></div><button class="x" aria-label="Cerrar">×</button></div>
      <div class="fr hoy"><b>DINÁMICA ACTUAL Y LO QUE QUEREMOS CAMBIAR</b>${TEXTO.hoy}</div>
      <div class="fr pro"><b>DINÁMICA QUE PROPICIA LA ESTRATEGIA</b>${TEXTO.propone}</div>
      <div class="tabs">${[['programa', 'PROGRAMA ARQUITECTÓNICO'], ['agentes', 'AGENTES HUMANOS'], ['bioticas', 'INTERACCIONES BIÓTICAS'], ['transporte', 'TRANSPORTE'], ['tiempo', 'FASES Y SOSTENIBILIDAD']].map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div>${TABS[tab]()}</div><div class="nota">Todo son hipótesis de diseño, no resultados. Ubicación del programa sobre la imagen satelital y las huellas de OSM.</div>`;
    pan.querySelector('.x').onclick = cerrar;
    pan.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; pintarPanel(); });
    pan.querySelectorAll('.it[data-k]').forEach(d => { d.onclick = () => enfocar(d.dataset.k); if (d.dataset.k === sel) d.classList.add('sel'); });
  }

  /* ---------- cámara y apertura ---------- */
  const volar = (cx, cz, dist, alto) => {
    // el panel ocupa la derecha (en escritorio): el punto mirado se corre a la derecha para que la fábrica quede visible a la izquierda
    const t = new THREE.Vector3(cx, Y0, cz), p1 = new THREE.Vector3(cx - dist * 0.55, alto, cz + dist);
    if (innerWidth > 760) { const dir = t.clone().sub(p1).setY(0).normalize(), der = new THREE.Vector3(-dir.z, 0, dir.x); const k = Math.hypot(dist, alto) * 0.24; t.addScaledVector(der, k); p1.addScaledVector(der, k); }
    else { t.z += dist * 0.25; p1.z += dist * 0.25; } // celular: el panel va abajo
    T3.anim = { t: 0, dur: 1.6, p0: T3.camera.position.clone(), p1, c0: T3.orbit.target.clone(), c1: t };
  };
  function abrir() { plan.visible = true; res.style.display = 'none'; pintarPanel(); pan.classList.add('on'); volar(scx, scz, 620, 520); }
  function cerrar() { plan.visible = false; pan.classList.remove('on'); sel = null; ETQ.forEach(e => e.d.style.display = 'none'); }
  function enfocar(k) {
    sel = k; tab = 'programa'; if (!plan.visible) abrir(); pintarPanel();
    const s = PUNTO[k]; if (s) volar(s.c[0], s.c[1], k === 'bosque' ? 420 : 170, k === 'bosque' ? 300 : 130);
    const el = pan.querySelector(`.it[data-k="${k}"]`); if (el) el.scrollIntoView({ block: 'nearest' });
  }
  // tocar el predio resaltado abre el plan
  const cvs = T3.renderer.domElement; let pd = null; const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -Y0), hit = new THREE.Vector3();
  cvs.addEventListener('pointerdown', e => { pd = [e.clientX, e.clientY]; });
  cvs.addEventListener('pointerup', e => {
    if (!pd || Math.hypot(e.clientX - pd[0], e.clientY - pd[1]) > 6 || !resalte.visible || plan.visible) return;
    const r = cvs.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, T3.camera);
    if (ray.ray.intersectPlane(plano, hit) && dentro(sitio, hit.x, hit.z)) abrir();
  });

  /* ---------- bucle ---------- */
  const m4 = new THREE.Object3D(), v = new THREE.Vector3(); let ult = performance.now();
  const bucle = () => {
    const ahora = performance.now(), dt = Math.min(0.1, (ahora - ult) / 1000); ult = ahora;
    if (resalte.visible) { mRes.opacity = 0.16 + 0.1 * Math.sin(ahora / 400); }
    // etiqueta del resaltado y del programa
    const W_ = innerWidth, H_ = innerHeight, cam = T3.camera;
    const poner = (el, x, y, z) => { v.set(x, y, z).project(cam); const fuera = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05; el.style.display = fuera ? 'none' : 'flex'; if (!fuera) { el.style.left = ((v.x + 1) / 2 * W_).toFixed(1) + 'px'; el.style.top = ((1 - v.y) / 2 * H_).toFixed(1) + 'px'; } };
    if (resalte.visible && !plan.visible) poner(res, scx, Y0 + 60, scz); else res.style.display = 'none';
    if (plan.visible) {
      for (const e of ETQ) { const s = PUNTO[e.p.k]; if (s) poner(e.d, s.c[0], s.y + 6, s.c[1]); e.d.classList.toggle('sel', sel === e.p.k); }
      for (const p of PROGRAMA) { const s = PUNTO[p.k]; if (s && s.m && s.m.material) s.m.material.opacity = sel && sel !== p.k ? 0.14 : (p.z ? 0.55 : p.bosque ? 0.85 : 0.38); }
      // vehículos y personas en sus rutas
      for (const M of MOV) { const f = M.f; for (let i = 0; i < M.d.length; i++) { M.d[i] += f.v * dt * 6; const [x, z, a] = enRuta(f.ruta, f.C, M.d[i]); m4.position.set(x, Y0, z); m4.rotation.set(0, a, 0); m4.scale.setScalar(f.tipo === 'persona' ? 1.6 : 1.4); m4.updateMatrix(); M.im.setMatrixAt(i, m4.matrix); } M.im.instanceMatrix.needsUpdate = true; }
      // agentes humanos
      for (const h of HUM) { h.L.forEach((a, i) => { if (a.pausa > 0) a.pausa -= dt; else { const dx = a.obj[0] - a.x, dz = a.obj[1] - a.z, d = Math.hypot(dx, dz); if (d < 1) { a.pausa = 3 + Math.random() * 10; a.obj = destino(h.t.a[Math.floor(Math.random() * h.t.a.length)]); } else { const s = Math.min(d, 1.4 * dt * 6); a.x += dx / d * s; a.z += dz / d * s; a.r = Math.atan2(dx, dz); } } m4.position.set(a.x, Y0, a.z); m4.rotation.set(0, a.r || 0, 0); m4.scale.setScalar(2.2); m4.updateMatrix(); h.im.setMatrixAt(i, m4.matrix); }); h.im.instanceMatrix.needsUpdate = true; }
      // pulsos de las interacciones bióticas
      let n = 0; for (const A of ARCOS) for (let j = 0; j < 2 && n < NPU; j++) { const u = ((ahora / 1000) * 0.18 + j * 0.5 + n * 0.071) % 1, P = A.P[Math.floor(u * (A.P.length - 1))]; pp[n * 3] = P.x; pp[n * 3 + 1] = P.y; pp[n * 3 + 2] = P.z; pc[n * 3] = A.col.r; pc[n * 3 + 1] = A.col.g; pc[n * 3 + 2] = A.col.b; n++; }
      pulsosG.setDrawRange(0, n); pulsosG.attributes.position.needsUpdate = true; pulsosG.attributes.color.needsUpdate = true;
    }
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
  return {
    entrada: { id: 'E1', n: 'Bavaria Común', c: '#38bdf8', n_lotes: 1, area: 712000 },
    ver: (on) => { resalte.visible = on; if (!on) cerrar(); },
    abrir
  };
}
