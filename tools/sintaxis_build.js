// Construye data3d/sintaxis_bavaria.json para sintaxis.html.
// Fuente: data3d/bavaria_pres.json del proyecto Bavaria Común (anasoficasca-code/simulador), análisis angular de segmentos:
//   a = antes, b = después (con los pasajes nuevos); cada uno [NAIN Rn, NAIN 800 m, NACH]. n = 1: pasaje nuevo.
// Uso: node tools/sintaxis_build.js <ruta a bavaria_pres.json>
const fs = require('fs'), path = require('path');
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const B = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data3d', 'red_georef_base.json'), 'utf8'));
const GEO = { LAT0: 4.63, LNG0: -74.17, EX: -5193.24, EY: -2090.06 };
const MX = 111320 * Math.cos(GEO.LAT0 * Math.PI / 180), MY = 110540;
const toLL = ([x, y]) => [GEO.LNG0 + (x + GEO.EX) / MX, GEO.LAT0 + (y + GEO.EY) / MY];
const toXY = ([lng, lat]) => [(lng - GEO.LNG0) * MX - GEO.EX, (lat - GEO.LAT0) * MY - GEO.EY];
const site = P.sitio;
const dSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const pip = (p, L) => { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const a = L[i], b = L[j]; if ((a[1] > p[1]) != (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const distSite = p => { if (pip(p, site)) return 0; let m = 1e9; for (let i = 0; i < site.length; i++) m = Math.min(m, dSeg(p, site[i], site[(i + 1) % site.length])); return m; };
const mid = s => { const p = s.p; return [(p[0][0] + p[p.length - 1][0]) / 2, (p[0][1] + p[p.length - 1][1]) / 2]; };
// avenidas con nombre (OSM) en el mismo marco
const VIAS = B.vias.map(v => ({ n: v.n, p: v.p.map(toXY) }));
const nombreVia = (p, tol = 30) => { let best = null, bd = tol; for (const v of VIAS) for (let i = 0; i < v.p.length - 1; i++) { const d = dSeg(p, v.p[i], v.p[i + 1]); if (d < bd) { bd = d; best = v.n; } } return best; };
const r1 = v => Math.round(v * 10) / 10, r3 = v => v == null ? null : Math.round(v * 1000) / 1000;
const seg = P.seg.map(s => {
  const m = mid(s), d = distSite(m);
  return { p: s.p.map(q => [r1(q[0]), r1(q[1])]), h: s.h, n: s.n, a: s.a && s.a.map(r3), b: s.b.map(r3), d: Math.round(d), v: (s.h === 'trunk' || s.h === 'primary' || s.h === 'secondary') ? nombreVia(m) : null };
});
// entradas: segmentos cercanos (después) y vía más cercana
const entradas = P.entradas.map((e, i) => {
  const cerca = seg.map(s => ({ s, d: Math.min(...s.p.slice(0, -1).map((q, k) => dSeg(e, q, s.p[k + 1]))) })).filter(x => x.d < 70).sort((x, y) => x.d - y.d);
  const top = cerca.slice(0, 6), mx = k => Math.max(...top.map(x => x.s.b[k]));
  const mayor = cerca.find(x => ['trunk', 'primary', 'secondary'].includes(x.s.h) && x.d < 90);
  const resid = cerca.filter(x => x.s.h === 'residential').length;
  return { i: i + 1, x: e[0], y: e[1], rn: r3(mx(0)), r8: r3(mx(1)), ch: r3(mx(2)), via: mayor ? (mayor.s.v || mayor.s.h) : null, vh: mayor ? mayor.s.h : null, resid };
});
const out = { fuente: 'Bavaria Común (Casas, Gómez, Trujillo 2026): análisis angular de segmentos sobre OpenStreetMap; avenidas: OSM (ODbL)', sitio: site, edif: P.edif.map(e => e.p.map(q => [r1(q[0]), r1(q[1])])), centro: P.centro, angulo: P.angulo, resumen: P.resumen, pasajes_m: P.pasajes_m, entradas, seg };
fs.writeFileSync(path.join(__dirname, '..', 'data3d', 'sintaxis_bavaria.json'), JSON.stringify(out));
console.log('segmentos', seg.length, 'pasajes', seg.filter(s => s.n).length, 'con nombre', seg.filter(s => s.v).length);
console.table(entradas.map(e => ({ i: e.i, rn: e.rn, r8: e.r8, ch: e.ch, via: e.via, resid: e.resid })));
