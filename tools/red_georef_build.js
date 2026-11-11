// Construye data3d/red_georef_base.json: capa base (lng/lat) para la lámina de red georreferenciada.
// Uso: node tools/red_georef_build.js <osm_overpass.json>
const fs = require('fs'), path = require('path');
const D = p => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data3d', p), 'utf8'));
const GEO = { LAT0: 4.63, LNG0: -74.17, EX: -5193.24, EY: -2090.06 };
const MX = 111320 * Math.cos(GEO.LAT0 * Math.PI / 180), MY = 110540;
const ll = ([x, y]) => [GEO.LNG0 + (x + GEO.EX) / MX, GEO.LAT0 + (y + GEO.EY) / MY];
const r6 = v => Math.round(v * 1e6) / 1e6;
const BB = [-74.205, 4.585, -74.100, 4.675]; // [w,s,e,n]
function simp(pts, tol = 0.00004) { // Douglas-Peucker en grados (~4 m)
  if (pts.length < 3) return pts;
  const d = (p, a, b) => { const dx = b[0]-a[0], dy = b[1]-a[1], L = dx*dx+dy*dy || 1e-18; let t = ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dy); };
  let mi = 0, md = 0; for (let i = 1; i < pts.length-1; i++) { const v = d(pts[i], pts[0], pts[pts.length-1]); if (v > md) { md = v; mi = i; } }
  return md > tol ? simp(pts.slice(0, mi+1), tol).slice(0, -1).concat(simp(pts.slice(mi), tol)) : [pts[0], pts[pts.length-1]];
}
const inBB = p => p[0] > BB[0] && p[0] < BB[2] && p[1] > BB[1] && p[1] < BB[3];
const fin = pts => simp(pts).map(p => [r6(p[0]), r6(p[1])]);
const out = { fuente: 'OpenStreetMap (ODbL) y datos del modelo Kennedy 3D', bbox: BB };
const K = D('kennedy.json');
out.limite = fin(K.limite);
out.lugares = K.lugares;
out.agua = D('water_bodies.json').map(w => ({ n: w.nombre, t: w.tipo, p: fin(w.pts.map(ll)) })).filter(w => w.p.some(inBB));
out.parques = D('parques.json').filter(p => /METROPOLITANO|ZONAL/i.test(p.tipo)).map(p => ({ n: p.nombre, t: p.tipo, p: fin(p.pts.map(ll)) })).filter(w => w.p.some(inBB));
out.bavaria = fin(D('bavaria.json').sitio.map(ll));
out.corabastos = fin(D('corabastos.json').poly.map(ll));
const osm = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const VIAS = [['Av. Boyacá', /Boyac/], ['Av. Américas', /Américas/], ['Av. Primero de Mayo', /Primero de Mayo/], ['Av. Ciudad de Cali', /Ciudad de Cali/], ['Av. Agoberto Mejía', /Agoberto/], ['Av. Calle 13', /Centenario/], ['Av. 68', /Avenida 68|Congreso/], ['Autopista Sur', /Autopista Sur/], ['Av. Villavicencio', /Villavicencio/], ['Av. Bosa', /Avenida Bosa/]];
out.vias = []; out.rios = [];
for (const e of osm.elements) {
  const t = e.tags || {}, nm = [t.name, t.alt_name, t.official_name].join(' ');
  const pts = (e.geometry || []).map(g => [g.lon, g.lat]); if (!pts.some(inBB)) continue;
  if (t.waterway) { if (/Fucha|Tunjuel|Bogot/.test(t.name || '')) out.rios.push({ n: t.name, p: fin(pts) }); continue; }
  const v = VIAS.find(([, re]) => re.test(nm)); if (v) out.vias.push({ n: v[0], p: fin(pts) });
}
fs.writeFileSync(path.join(__dirname, '..', 'data3d', 'red_georef_base.json'), JSON.stringify(out));
console.log('agua', out.agua.length, 'parques', out.parques.length, 'vias', out.vias.length, 'rios', out.rios.length);
