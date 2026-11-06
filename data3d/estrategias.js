/* ============ ESTRATEGIAS DE LA PROPUESTA (modo Kennedy) ============
   data3d/estrategias.json (tools/estrategias_build.py, del shapefile Propuesta shp/lote.shp, campo PROPUESTA P1-P5).
   E1 Huertas en humedal y ronda de río · E2 Huertas en lotes baldíos · E3 Huertas en cubiertas de vivienda en altura
   E4 Distrito biotecnológico · E5 Huertas en viviendas.
   Cada estrategia se pinta con su color: E3 y E5 sobre el TECHO de cada edificio del lote (a su altura), los demás lotes a ras
   del suelo; con borde y, en los sitios de E1, E2 y E4, una etiqueta. Cada una se prende y apaga desde el panel. */
export async function iniciarEstrategias({ THREE, T3, lw, Y0 = 2.0 }) {
  const D = await (await fetch('data3d/estrategias.json?v=2')).json();
  const esc = D.escala || 0.5, grupo = new THREE.Group(); grupo.name = 'estrategias'; T3.scene.add(grupo);
  const CAPA = {};
  for (const e of D.estrategias) {
    const P = [], I = [], L = []; let vc = 0;
    const anillo = (flat, y) => {
      const n = flat.length / 2, W = []; for (let k = 0; k < n; k++) W.push(lw(flat[k * 2] * esc, flat[k * 2 + 1] * esc));
      let tri = []; try { tri = THREE.ShapeUtils.triangulateShape(W.map(q => new THREE.Vector2(q[0], q[1])), []); } catch (er) { return; }
      const b = vc; for (const q of W) { P.push(q[0], y, q[1]); vc++; } for (const t of tri) I.push(b + t[0], b + t[1], b + t[2]);
      for (let k = 0; k < n; k++) { const a = W[k], c = W[(k + 1) % n]; L.push(a[0], y + 0.05, a[1], c[0], y + 0.05, c[1]); }
    };
    for (const l of e.lotes) anillo(l, Y0 + 0.35);                                  // lotes sin edificio: a ras del suelo
    for (const t of e.techos || []) anillo(t.slice(0, -1), t[t.length - 1] / 10 + 0.3); // techos de los edificios del lote
    const col = new THREE.Color(e.c), techo = (e.techos || []).length > 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
    const relleno = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: techo ? 0.55 : 0.42, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    relleno.renderOrder = 4; relleno.frustumCulled = false;
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
    const borde = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(techo ? 0.75 : 1), transparent: true, opacity: 0.95, depthWrite: false }));
    borde.renderOrder = 5; borde.frustumCulled = false;
    const gr = new THREE.Group(); gr.add(relleno, borde); gr.visible = false; grupo.add(gr); // al iniciar, todas apagadas
    CAPA[e.id] = { gr, e };
  }

  // etiquetas de los sitios (E1, E2, E4: pocos lotes grandes; E3 y E5 son miles, van solo en la leyenda)
  const css = document.createElement('style'); css.textContent = `
.es-et{position:fixed;z-index:8;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;padding:4px 9px;border-radius:9px;background:rgba(8,16,26,.86);border:1.5px solid var(--c);color:#e2f3ff;font:700 11px system-ui,-apple-system,"Segoe UI",sans-serif;white-space:nowrap;transition:transform .15s}
.es-et:hover{transform:translate(-50%,-105%) scale(1.05);background:rgba(15,23,42,.95)}
.es-et b{color:var(--c);margin-right:5px}.es-et::after{content:'';position:absolute;left:50%;top:100%;width:1.5px;height:12px;background:var(--c)}
@media(max-width:760px){.es-et{font-size:10px;padding:3px 7px}}`;
  document.head.appendChild(css);
  const ET = [];
  for (const e of D.estrategias) {
    if ((e.techos || []).length || e.lotes.length > 30) continue;
    const vistos = [];
    for (const l of e.lotes) {
      const n = l.length / 2; let x = 0, y = 0, a = 0;
      for (let k = 0; k < n; k++) { const p = [l[k * 2] * esc, l[k * 2 + 1] * esc], q = [l[((k + 1) % n) * 2] * esc, l[((k + 1) % n) * 2 + 1] * esc]; a += p[0] * q[1] - q[0] * p[1]; x += p[0]; y += p[1]; }
      if (Math.abs(a) / 2 < 5000) continue; x /= n; y /= n;
      if (vistos.some(v => Math.hypot(v[0] - x, v[1] - y) < 700)) continue; vistos.push([x, y]);
      const d = document.createElement('div'); d.className = 'es-et'; d.style.setProperty('--c', e.c); d.innerHTML = `<b>${e.id}</b>${e.n}`;
      d.onclick = () => { if (window.MOSTRAR_RED_ACTORES) window.MOSTRAR_RED_ACTORES(e.id); };
      document.body.appendChild(d);
      const w = lw(x, y); ET.push({ d, id: e.id, p: new THREE.Vector3(w[0], Y0 + 14, w[1]) });
    }
  }
  const v = new THREE.Vector3();
  const bucle = () => {
    const cam = T3.camera, W = innerWidth, H = innerHeight;
    for (const t of ET) {
      if (!CAPA[t.id].gr.visible) { t.d.style.display = 'none'; continue; }
      v.copy(t.p).project(cam); const fuera = v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1;
      t.d.style.display = fuera ? 'none' : 'block'; if (!fuera) { t.d.style.left = ((v.x + 1) / 2 * W).toFixed(1) + 'px'; t.d.style.top = ((1 - v.y) / 2 * H).toFixed(1) + 'px'; }
    }
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
  return {
    lista: D.estrategias.map(e => ({ id: e.id, n: e.n, c: e.c, n_lotes: e.n_lotes, area: e.area, centro: e.centro })),
    ver: (id, on) => { if (CAPA[id]) CAPA[id].gr.visible = on; },
    sitios: (ids) => D.estrategias.filter(e => ids.includes(e.id)).flatMap(e => e.lotes.map(l => { const W = []; for (let k = 0; k < l.length; k += 2) W.push(lw(l[k] * esc, l[k + 1] * esc)); return { id: e.id, n: e.n, poly: W }; }))
  };
}
