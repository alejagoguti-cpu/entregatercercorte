/* ============ ANTIGUA FÁBRICA DE BAVARIA (Av. Boyacá) ============
   Huellas reales de OpenStreetMap (data3d/bavaria.json, de tools/bavaria_build.py) con la forma que tiene hoy:
   - esqueleto: naves de ladrillo en demolición, sin cubierta: pilastras de ladrillo en el borde, retícula interior de
     columnas y vigas de concreto por niveles y restos de placa (se ve el suelo de la foto aérea por dentro)
   - ladrillo: bloques de ladrillo con cubierta plana gris y ventanas por piso
   - oficina: edificio administrativo de varios pisos con franjas de ventanas
   - tanque de agua elevado blanco (fuste y depósito) */
export function construirBavaria({ THREE, T3, lw, D, liviano }) {
  const grupo = new THREE.Group(); grupo.name = 'bavaria';
  const sombras = !liviano;
  let semilla = 1977; const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;

  // ---- ladrillo: textura procedimental (hiladas con junta clara y piezas de tono variable) ----
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = '#c4b29c'; g.fillRect(0, 0, 256, 256);
  const fil = 16, col = 4; // 16 hiladas y 4 ladrillos por fila en 256 px (≈ 1 m x 1 m)
  for (let r = 0; r < fil; r++) for (let c = -1; c < col + 1; c++) {
    const x = c * 64 + (r % 2 ? 32 : 0), y = r * 16, k = 0.82 + rnd() * 0.3;
    g.fillStyle = `rgb(${Math.round(168 * k)},${Math.round(84 * k)},${Math.round(52 * k)})`; g.fillRect(x + 2, y + 2, 60, 12);
  }
  const texL = new THREE.CanvasTexture(cv); texL.wrapS = texL.wrapT = THREE.RepeatWrapping; texL.colorSpace = THREE.SRGBColorSpace;
  texL.anisotropy = T3.renderer.capabilities.getMaxAnisotropy();
  const matLadrillo = new THREE.MeshStandardMaterial({ map: texL, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  const matConcreto = new THREE.MeshStandardMaterial({ color: 0x9b9893, roughness: 0.95, metalness: 0 });
  const matCubierta = new THREE.MeshStandardMaterial({ color: 0x8a8c8a, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide });
  const matVidrio = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.35, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const matBlanco = new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.7, metalness: 0.05 });

  // ---- acumuladores: muros con textura (posición + uv) y ventanas ----
  const ML = { p: [], uv: [], i: [] }, MV = { p: [], i: [] }, MC = { p: [], i: [] };
  const quad = (A, q, uvs) => { const b = A.p.length / 3; for (const v of q) A.p.push(...v); if (uvs) A.uv.push(...uvs); A.i.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  const muros = (W, y0, y1, s0 = 0) => { // W: anillo en el mundo [[x,z]...]
    let s = s0;
    for (let k = 0; k < W.length; k++) {
      const a = W[k], b = W[(k + 1) % W.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      quad(ML, [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], [s, y0, s + L, y0, s + L, y1, s, y1]);
      s += L;
    }
  };
  const cubierta = (W, y, A) => {
    let tri = []; try { tri = THREE.ShapeUtils.triangulateShape(W.map(q => new THREE.Vector2(q[0], q[1])), []); } catch (e) {}
    const b = A.p.length / 3; for (const q of W) A.p.push(q[0], y, q[1]);
    for (const t of tri) A.i.push(b + t[0], b + t[2], b + t[1]);
  };
  const ccw = (W) => { let a = 0; for (let k = 0; k < W.length; k++) { const p = W[k], q = W[(k + 1) % W.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; };
  const ventanas = (W, h, piso, ancho, alto, cinta) => { // en el mundo: normal hacia afuera según el sentido del anillo
    const sg = ccw(W) > 0 ? 1 : -1;
    for (let k = 0; k < W.length; k++) {
      const a = W[k], b = W[(k + 1) % W.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 5) continue;
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = uz * sg * 0.07, nz = -ux * sg * 0.07;
      for (let y = 2.2; y + alto < h - 0.8; y += piso) {
        if (cinta) { const m = 1.2; quad(MV, [[a[0] + ux * m + nx, y, a[1] + uz * m + nz], [b[0] - ux * m + nx, y, b[1] - uz * m + nz], [b[0] - ux * m + nx, y + alto, b[1] - uz * m + nz], [a[0] + ux * m + nx, y + alto, a[1] + uz * m + nz]]); continue; }
        const n = Math.floor(L / 4.2), paso = L / n;
        for (let j = 0; j < n; j++) {
          if (rnd() < 0.12) continue; // algunas tapiadas
          const c = paso * (j + 0.5), x0 = c - ancho / 2, x1 = c + ancho / 2;
          quad(MV, [[a[0] + ux * x0 + nx, y, a[1] + uz * x0 + nz], [a[0] + ux * x1 + nx, y, a[1] + uz * x1 + nz], [a[0] + ux * x1 + nx, y + alto, a[1] + uz * x1 + nz], [a[0] + ux * x0 + nx, y + alto, a[1] + uz * x0 + nz]]);
        }
      }
    }
  };

  // ---- esqueletos: cajas instanciadas (pilastras de ladrillo, columnas y vigas de concreto, restos de placa) ----
  const cajasL = [], cajasC = []; // [x, y, z, sx, sy, sz, rotY]
  const dentro = (W, x, z) => { let c = false; for (let i = 0, j = W.length - 1; i < W.length; j = i++) { const a = W[i], b = W[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const esqueleto = (W, h) => {
    const nivel = h > 12 ? [5.5, 11, h] : [5, h];
    // perímetro: pilastras de ladrillo cada ~6 m, vigas de borde por nivel y un antepecho bajo de ladrillo
    for (let k = 0; k < W.length; k++) {
      const a = W[k], b = W[(k + 1) % W.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), n = Math.max(1, Math.round(L / 6));
      for (let j = 0; j <= n; j++) {
        const t = j / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, hh = rnd() < 0.15 ? h * (0.4 + rnd() * 0.4) : h; // algunas ya demolidas a media altura
        cajasL.push([x, hh / 2 - 1, z, 1.3, hh + 2, 1.3, -ang]);
      }
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      cajasL.push([mx, 0.4, mz, L, 2.8, 0.45, -ang]); // antepecho
      for (const y of nivel) if (rnd() > 0.1) cajasC.push([mx, y - 0.4, mz, L, 0.8, 0.5, -ang]);
    }
    // retícula interior sobre el eje largo de la nave
    let L0 = 0, ux = 1, uz = 0;
    for (let k = 0; k < W.length; k++) { const a = W[k], b = W[(k + 1) % W.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > L0) { L0 = l; ux = (b[0] - a[0]) / l; uz = (b[1] - a[1]) / l; } }
    const vx = -uz, vz = ux, ang = Math.atan2(uz, ux);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const q of W) { const u = q[0] * ux + q[1] * uz, v = q[0] * vx + q[1] * vz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const P = 9, pt = (u, v) => [u * ux + v * vx, u * uz + v * vz];
    const ok = (u, v) => { const p = pt(u, v); return dentro(W, p[0], p[1]); };
    for (let u = u0 + P; u < u1 - 2; u += P) for (let v = v0 + P; v < v1 - 2; v += P) {
      if (!ok(u, v)) continue;
      const [x, z] = pt(u, v), alto = rnd() < 0.2 ? nivel[0] : h;
      cajasC.push([x, alto / 2, z, 0.75, alto, 0.75, -ang]);
      for (const y of nivel) {
        if (y > alto + 0.1) continue;
        if (ok(u + P, v) && rnd() > 0.12) { const [mx, mz] = pt(u + P / 2, v); cajasC.push([mx, y - 0.35, mz, P, 0.7, 0.45, -ang]); }
        if (ok(u, v + P) && rnd() > 0.12) { const [mx, mz] = pt(u, v + P / 2); cajasC.push([mx, y - 0.35, mz, 0.45, 0.7, P, -ang]); }
        if (y < h - 0.5 && rnd() < 0.22 && ok(u + P, v + P)) { const [mx, mz] = pt(u + P / 2, v + P / 2); cajasC.push([mx, y - 0.05, mz, P, 0.25, P, -ang]); } // restos de placa
      }
    }
  };

  for (const e of D.edif) {
    const W = e.p.map(p => lw(p[0], p[1]));
    if (e.s === 'esqueleto') { esqueleto(W, e.h); continue; }
    muros(W, -1, e.h);
    if (e.s === 'oficina') { ventanas(W, e.h, 3.4, 0, 1.9, true); cubierta(W, e.h, MC); }
    else { ventanas(W, e.h, 4.2, 2.4, 1.7, false); cubierta(W, e.h, MC); }
  }

  const malla = (A, mat, uv) => {
    if (!A.i.length) return;
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3));
    if (uv) gg.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2));
    gg.setIndex(A.i); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, mat); m.castShadow = sombras; m.receiveShadow = sombras; grupo.add(m);
  };
  malla(ML, matLadrillo, true); malla(MV, matVidrio); malla(MC, matCubierta);

  const instancias = (L, mat, tinte) => {
    if (!L.length) return;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, L.length), d = new THREE.Object3D(), c = new THREE.Color();
    L.forEach((b, k) => { d.position.set(b[0], b[1], b[2]); d.rotation.set(0, b[6], 0); d.scale.set(b[3], b[4], b[5]); d.updateMatrix(); im.setMatrixAt(k, d.matrix); if (tinte) im.setColorAt(k, c.setHex(tinte).multiplyScalar(0.85 + rnd() * 0.3)); });
    im.castShadow = sombras; im.receiveShadow = sombras; grupo.add(im);
  };
  instancias(cajasL, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }), 0xa45434); // pilastras de ladrillo
  instancias(cajasC, matConcreto, 0xd8d4cc);

  // ---- tanque de agua elevado (blanco, fuste cilíndrico y depósito arriba) ----
  for (const t of D.tanques || []) {
    const [x, z] = lw(t[0], t[1]), tg = new THREE.Group(); tg.position.set(x, 0, z);
    const fuste = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 34, 20), matBlanco); fuste.position.y = 17;
    const cono = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 1.6, 4, 24), matBlanco); cono.position.y = 36;
    const dep = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 5, 24), matBlanco); dep.position.y = 40.5;
    const tapa = new THREE.Mesh(new THREE.ConeGeometry(6.4, 1.8, 24), matBlanco); tapa.position.y = 43.9;
    for (const m of [fuste, cono, dep, tapa]) { m.castShadow = sombras; m.receiveShadow = sombras; tg.add(m); }
    grupo.add(tg);
  }
  T3.scene.add(grupo);
  // ---- arbolado del predio (data3d/bavaria_arboles.json: masas oscuras de follaje de la imagen satelital) ----
  fetch('data3d/bavaria_arboles.json?v=1').then(r => r.json()).then(({ arboles }) => {
    const libre = (D.libres || []).map(z => z.map(p => lw(p[0], p[1]))); // huerto, compostaje y patio de carga: sin árboles
    const L = arboles.filter((t, i) => (!liviano || i % 3 === 0) && !libre.some(z => dentro(z, ...lw(t[0], t[1]))));
    const tronco = new THREE.CylinderGeometry(0.22, 0.34, 1, 6); tronco.translate(0, 0.5, 0);
    const copa = new THREE.IcosahedronGeometry(1, 1); copa.scale(1, 1.55, 1); // copa alargada (eucaliptos y urapanes)
    const mT = new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 1 }), mC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
    const iT = new THREE.InstancedMesh(tronco, mT, L.length), iC = new THREE.InstancedMesh(copa, mC, L.length), d = new THREE.Object3D(), c = new THREE.Color();
    L.forEach((t, k) => {
      const [x, z] = lw(t[0], t[1]), h = t[2], r = t[3];
      d.position.set(x, 0, z); d.rotation.set(0, rnd() * 6.28, 0); d.scale.set(1, h * 0.45, 1); d.updateMatrix(); iT.setMatrixAt(k, d.matrix);
      d.position.set(x, h * 0.62, z); d.scale.set(r, h * 0.27, r); d.updateMatrix(); iC.setMatrixAt(k, d.matrix);
      iC.setColorAt(k, c.setHSL(0.27 + rnd() * 0.07, 0.38 + rnd() * 0.2, 0.13 + rnd() * 0.09));
    });
    for (const m of [iT, iC]) { m.castShadow = !liviano; m.receiveShadow = !liviano; grupo.add(m); }
    grupo.userData.arboles = L.length;
  }).catch(e => console.warn('árboles de Bavaria:', e));
  return grupo;
}
