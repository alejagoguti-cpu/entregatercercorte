/* ============ CORABASTOS: bodegas de la central mayorista ============
   Rectángulos reales de cada nave (data3d/corabastos.json, de tools/corabastos_build.py: huellas OSM + color de la
   cubierta tomado de la imagen satelital). Forma de las bodegas como son:
   - cubierta de cerchas transversales: una cumbrera cada ~7,5 m atravesando el ancho de la nave (las franjas que se ven
     desde arriba), en lámina del color real de cada bodega
   - muros claros con zócalo amarillo y portones enrollables oscuros en los lados largos (muelles de carga)
   - marquesina sobre los muelles en los lados largos libres, con sus columnas */
export function construirCorabastos({ THREE, T3, lw, D, liviano }) {
  const P = [], C = [], I = [];
  const c = new THREE.Color();
  const col = (hex, k = 1) => { c.set(hex); return [c.r * k, c.g * k, c.b * k]; };
  const MURO = col('#e2cdb4'), ZOCALO = col('#d9a92e'), PORTON = col('#4a4f55'), MARQ = col('#9a9d9f'), COLUMNA = col('#c9c6c0');
  const tri = (a, b, d, k) => { const s = P.length / 3; for (const v of [a, b, d]) { P.push(...v); C.push(...k); } I.push(s, s + 1, s + 2); };
  const quad = (a, b, d, e, k) => { const s = P.length / 3; for (const v of [a, b, d, e]) { P.push(...v); C.push(...k); } I.push(s, s + 1, s + 2, s, s + 2, s + 3); };
  const caja = (pt, u0, u1, v0, v1, y0, y1, k) => { // caja alineada a la nave
    const A = pt(u0, v0), B = pt(u1, v0), Cc = pt(u1, v1), Dd = pt(u0, v1);
    const L = [[A, B], [B, Cc], [Cc, Dd], [Dd, A]];
    for (const [p, q] of L) quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], k);
    quad([A[0], y1, A[1]], [B[0], y1, B[1]], [Cc[0], y1, Cc[1]], [Dd[0], y1, Dd[1]], k);
    quad([A[0], y0, A[1]], [Dd[0], y0, Dd[1]], [Cc[0], y0, Cc[1]], [B[0], y0, B[1]], k);
  };
  for (const n of D.naves) {
    // eje largo u y ancho v, en el marco del mundo (lw invierte y)
    const [cx, cz] = lw(n.c[0], n.c[1]), e = lw(n.c[0] + Math.cos(n.a), n.c[1] + Math.sin(n.a));
    const ux = e[0] - cx, uz = e[1] - cz, vx = -uz, vz = ux;
    const pt = (u, v) => [cx + u * ux + v * vx, cz + u * uz + v * vz];
    const L2 = n.L / 2, W2 = n.W / 2, h = n.W > 30 ? 10.5 : 8.5, rise = Math.min(2.2, n.W * 0.07);
    // color real de la cubierta: la imagen satelital sale oscura, se levanta un poco (las blancas quedan igual)
    c.set(n.col); const lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b, TECHO = [c.r, c.g, c.b].map(x => Math.min(1, x * (lum < 0.4 ? 1.9 : 1.05)));
    const TECHO2 = TECHO.map(x => x * 0.82);
    // muros (con zócalo amarillo) y portones en los lados largos
    for (const s of [-1, 1]) {
      const a = pt(-L2, s * W2), b = pt(L2, s * W2), a2 = pt(s * L2, -W2), b2 = pt(s * L2, W2);
      quad([a[0], -1, a[1]], [b[0], -1, b[1]], [b[0], h, b[1]], [a[0], h, a[1]], MURO);
      quad([a2[0], -1, a2[1]], [b2[0], -1, b2[1]], [b2[0], h, b2[1]], [a2[0], h, a2[1]], MURO);
      const o = s * (W2 + 0.06), o2 = s * (L2 + 0.06);
      { const p = pt(-L2, o), q = pt(L2, o); quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], 1.1, q[1]], [p[0], 1.1, p[1]], ZOCALO); }
      { const p = pt(o2, -W2), q = pt(o2, W2); quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], 1.1, q[1]], [p[0], 1.1, p[1]], ZOCALO); }
      const nb = Math.max(2, Math.round(n.L / 7.5)), bw = n.L / nb;
      for (let k = 0; k < nb; k++) {
        const uc = -L2 + bw * (k + 0.5), p = pt(uc - 2.1, o * 1.0005), q = pt(uc + 2.1, o * 1.0005);
        quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], 4.6, q[1]], [p[0], 4.6, p[1]], PORTON);
      }
      // portón grande en los testeros
      { const p = pt(o2 * 1.0005, -3.5), q = pt(o2 * 1.0005, 3.5); quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], 5.2, q[1]], [p[0], 5.2, p[1]], PORTON); }
    }
    // cubierta: una cumbrera transversal por crujía (atraviesa el ancho), con su piñón en los muros largos
    const nb = Math.max(2, Math.round(n.L / 7.5)), bw = n.L / nb, ov = 0.4;
    for (let k = 0; k < nb; k++) {
      const u0 = -L2 + bw * k, u1 = u0 + bw, um = (u0 + u1) / 2;
      const A0 = pt(u0, -W2 - ov), A1 = pt(u0, W2 + ov), M0 = pt(um, -W2 - ov), M1 = pt(um, W2 + ov), B0 = pt(u1, -W2 - ov), B1 = pt(u1, W2 + ov);
      quad([A0[0], h, A0[1]], [A1[0], h, A1[1]], [M1[0], h + rise, M1[1]], [M0[0], h + rise, M0[1]], k % 2 ? TECHO : TECHO2);
      quad([M0[0], h + rise, M0[1]], [M1[0], h + rise, M1[1]], [B1[0], h, B1[1]], [B0[0], h, B0[1]], k % 2 ? TECHO2 : TECHO);
      for (const s of [-1, 1]) { const a = pt(u0, s * W2), m = pt(um, s * W2), b = pt(u1, s * W2); tri([a[0], h, a[1]], [b[0], h, b[1]], [m[0], h + rise, m[1]], MURO); }
    }
    for (const s of [-1, 1]) { const a = pt(s * L2, -W2), b = pt(s * L2, W2); quad([a[0], h, a[1]], [b[0], h, b[1]], [b[0], h + 0.6, b[1]], [a[0], h + 0.6, a[1]], MURO); } // remate de los testeros
    // marquesinas de los muelles (solo en los lados largos sin otra nave pegada) con columnas cada crujía
    n.al.forEach((libre, i) => {
      if (!libre) return; const s = i === 0 ? 1 : -1, d = 4.5, y = 5.4;
      caja(pt, -L2, L2, s > 0 ? W2 : -W2 - d, s > 0 ? W2 + d : -W2, y, y + 0.25, MARQ);
      if (!liviano) for (let k = 0; k <= nb; k++) { const u = Math.max(-L2 + 0.2, Math.min(L2 - 0.2, -L2 + bw * k)), v = s * (W2 + d - 0.3); caja(pt, u - 0.15, u + 0.15, v - 0.15, v + 0.15, 0, y, COLUMNA); }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I); g.computeVertexNormals();
  const mat = liviano ? new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true })
    : new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.82, metalness: 0.08 });
  const m = new THREE.Mesh(g, mat); m.name = 'corabastos'; m.castShadow = !liviano; m.receiveShadow = !liviano;
  T3.scene.add(m);
  return m;
}
// ¿la huella (marco del modelo) cae en una nave de Corabastos? (para quitar su caja genérica)
export function enNave(D, x, y) {
  return D.naves.some(n => { const dx = x - n.c[0], dy = y - n.c[1], u = dx * Math.cos(n.a) + dy * Math.sin(n.a), v = -dx * Math.sin(n.a) + dy * Math.cos(n.a); return Math.abs(u) < n.L / 2 + 1 && Math.abs(v) < n.W / 2 + 1; });
}
