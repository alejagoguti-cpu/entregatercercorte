/* ============ BAVARIA COMÚN · recorrido animado (bavaria_comun.html) ============
   01 sintaxis (canvas con calles y personas) · 02 red de actores (grafo vivo) · 03 sub-red (SVG con flujos)
   04 asambleas (rotación de vocerías) · 05 modelo dinámico (tanques, tuberías y gráficas) */
import { COMPONENTES, FLUJOS_COMP, ASAMBLEAS, rotacion, metricas } from './bavaria_comun.js?v=2';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s), NS = 'http://www.w3.org/2000/svg';
const [SX, ACT] = await Promise.all(['data3d/sintaxis_bavaria.json', 'data3d/red_georef_actores.json'].map(u => fetch(u).then(r => r.json())));
const fmt = (v, d = 0) => v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
const lerp = (a, b, t) => a + (b - a) * t;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const svgEl = (t, a = {}, p, tx) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (tx != null) e.textContent = tx; if (p) p.appendChild(e); return e; };

/* ---------- utilidades: canvas nítido, visibilidad, pasos con scroll ---------- */
function lienzo(cv) {
  const ctx = cv.getContext('2d'); const o = { cv, ctx, w: 0, h: 0, dpr: 1 };
  const fit = () => { const r = cv.getBoundingClientRect(); o.dpr = Math.min(2, devicePixelRatio || 1); o.w = r.width; o.h = r.height; cv.width = Math.max(1, r.width * o.dpr); cv.height = Math.max(1, r.height * o.dpr); ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0); o.onfit && o.onfit(); };
  new ResizeObserver(fit).observe(cv); fit(); return o;
}
function visible(el, cb) { new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: '120px' }).observe(el); }
function pasos(sec, cb) {
  const st = [...sec.querySelectorAll('.step')];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { st.forEach(s => s.classList.toggle('on', s === e.target)); cb(st.indexOf(e.target)); } }), { rootMargin: '-42% 0px -42% 0px' });
  st.forEach(s => io.observe(s)); st[0].classList.add('on'); cb(0);
}
const tween = (S, T, dt, k = 2.6) => { for (const key in T) S[key] += (T[key] - S[key]) * Math.min(1, dt * k); };

/* barra de progreso y capítulo activo */
const caps = [...document.querySelectorAll('#caps a')];
addEventListener('scroll', () => {
  const h = document.documentElement; $('#prog').style.width = (h.scrollTop / (h.scrollHeight - innerHeight) * 100) + '%';
  let on = null; for (const a of caps) { const s = $(a.getAttribute('href')); if (s.getBoundingClientRect().top < innerHeight * .5) on = a; }
  caps.forEach(a => a.classList.toggle('on', a === on));
}, { passive: true });

/* =====================================================================================
   01 · SINTAXIS: calles coloreadas, personas que caminan por elección, muro que se abre
   ===================================================================================== */
const RAMPA = ['#2b3cbf', '#2f8fd6', '#36c2b4', '#8fd14f', '#f2d23c', '#f28c28', '#e0332b'].map(hex);
const rampa = t => { t = Math.max(0, Math.min(.9999, t)) * (RAMPA.length - 1); const i = Math.floor(t); return mixC(RAMPA[i], RAMPA[i + 1], t - i); };
const DIVN = [64, 140, 230], DIVP = [232, 76, 61], DIV0 = [48, 54, 60];
const C0 = SX.centro;
const SEG = SX.seg.map(s => {
  const P = s.p; let L = 0; const cum = [0];
  for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(L); }
  const m = P[Math.floor(P.length / 2)], ang = Math.atan2(P[0][1] - C0[1], P[0][0] - C0[0]) * 180 / Math.PI;
  const lado = ang >= 45 && ang < 135 ? 'N' : ang >= -45 && ang < 45 ? 'E' : ang >= -135 && ang < -45 ? 'S' : 'O';
  return { ...s, L: Math.max(L, .5), cum, rc: Math.hypot(m[0] - C0[0], m[1] - C0[1]), lado };
});
// rangos (percentiles) para colorear
const rankear = (key, f) => { const v = SEG.map(f).filter(x => x != null).sort((a, b) => a - b); SEG.forEach(s => { const x = f(s); if (x == null) { s[key] = null; return; } let lo = 0, hi = v.length; while (lo < hi) { const m = (lo + hi) >> 1; v[m] < x ? lo = m + 1 : hi = m; } s[key] = lo / v.length; }); };
rankear('ra', s => s.a && s.a[1]); rankear('rb', s => s.b[1]); rankear('rch', s => s.b[2]);
const dmax = Math.max(...SEG.filter(s => s.a).map(s => Math.abs(s.b[1] - s.a[1])));
SEG.forEach(s => {
  s.cA = s.ra == null ? null : rampa(s.ra); s.cB = rampa(s.rb);
  const d = s.a ? (s.b[1] - s.a[1]) / (dmax * .35) : 0; s.cD = s.n ? [255, 255, 255] : mixC(DIV0, d > 0 ? DIVP : DIVN, Math.min(1, Math.abs(d)));
  s.cCh = rampa(s.rch);
  s.w = s.h === 'trunk' || s.h === 'primary' ? 2.3 : s.h === 'secondary' || s.h === 'tertiary' ? 1.6 : s.h === 'footway' ? .8 : 1.15;
});
const PAS = SEG.filter(s => s.n).sort((a, b) => a.rc - b.rc); PAS.forEach((s, i) => s.ord = i / PAS.length);
const maxRc = Math.max(...SEG.map(s => s.rc));
// grafo para las personas
const key = p => Math.round(p[0] / 3) + ',' + Math.round(p[1] / 3);
const ADJ = new Map(); SEG.forEach((s, i) => { for (const e of [0, 1]) { const k = key(e ? s.p[s.p.length - 1] : s.p[0]); if (!ADJ.has(k)) ADJ.set(k, []); ADJ.get(k).push([i, e]); } });
const ENT = SX.entradas, USO = { 6: ['Mercado', '#c2652a'], 15: ['Compost', '#e9a23b'], 8: ['Cocina', '#d98b6a'], 7: ['Asamblea', '#e58aa8'], 12: ['Bancales', '#94c973'], 9: ['Bosque', '#4f8a3c'] };

function crearMapa(cv, opts) {
  const L = lienzo(cv), ctx = L.ctx;
  const S = { reveal: 0, after: 0, wall: 1, diff: 0, side: 0, pas: 0, pasFoc: 0, ent: 0, mono: opts.mono ? 1 : 0, parts: 1 };
  const T = { ...S, reveal: 1 };
  let vista = null, vis = false;
  const pad = opts.pad || 750;
  const xs = SX.sitio.map(p => p[0]), ys = SX.sitio.map(p => p[1]);
  const bb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  L.onfit = () => {
    const cx = (bb[0] + bb[2]) / 2 + (opts.dx || 0), cy = (bb[1] + bb[3]) / 2;
    const sc = Math.min(L.w / (bb[2] - bb[0]), L.h / (bb[3] - bb[1])) * (opts.zoom || 1);
    vista = { sc, ox: L.w / 2 - cx * sc + (opts.shiftX ? opts.shiftX(L.w) : 0), oy: L.h / 2 + cy * sc };
  };
  L.onfit();
  const X = x => vista.ox + x * vista.sc, Y = y => vista.oy - y * vista.sc;
  // personas
  const NP = opts.np || (innerWidth < 700 ? 380 : 750);
  const W8 = s => Math.pow(Math.max(.05, (S.after > .5 || opts.mono ? s.b[2] : (s.a ? s.a[2] : 0))), 5);
  const permitido = s => opts.mono || S.after > .5 || !s.n;
  const elegir = (lista) => { let tot = 0; for (const x of lista) tot += x.w; let r = Math.random() * tot; for (const x of lista) { r -= x.w; if (r <= 0) return x; } return lista[lista.length - 1]; };
  const base = SEG.map((s, i) => ({ i, w: s.n ? 0 : Math.pow(s.b[2], 5) }));
  const AG = Array.from({ length: NP }, () => { const s = elegir(base).i; return { s, dir: Math.random() < .5 ? 0 : 1, t: Math.random() * SEG[s].L, v: 55 + Math.random() * 60 }; });
  const posEn = (s, d) => { const c = s.cum; let i = 1; while (i < c.length - 1 && c[i] < d) i++; const f = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1), a = s.p[i - 1], b = s.p[i]; return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; };
  function moverAg(a, dt) {
    a.t += a.v * dt * (opts.vel || 1);
    const s = SEG[a.s];
    if (a.t >= s.L) {
      const nodo = key(a.dir ? s.p[0] : s.p[s.p.length - 1]);
      const cand = (ADJ.get(nodo) || []).filter(([j]) => j !== a.s && permitido(SEG[j])).map(([j, e]) => ({ j, e, w: W8(SEG[j]) }));
      if (!cand.length) { a.dir = 1 - a.dir; a.t = 0; return; }
      const c = elegir(cand); a.s = c.j; a.dir = c.e; a.t = 0;
    }
  }
  function dibujar(dt) {
    const w = L.w, h = L.h; ctx.clearRect(0, 0, w, h);
    const pulso = .5 + .5 * Math.sin(performance.now() / 380);
    // calles
    ctx.lineCap = 'round';
    for (const s of SEG) {
      const rv = s.rc / maxRc; if (rv > S.reveal) continue;
      let c, al = Math.min(1, (S.reveal - rv) * 8);
      if (s.n) { // pasaje nuevo
        if (s.ord > S.pas) continue;
        c = mixC([255, 255, 255], s.cCh, S.pasFoc); c = mixC(c, s.cD, S.diff * (1 - S.pasFoc));
      } else {
        if (S.mono) { c = [70, 80, 76]; al *= .9; }
        else { c = mixC(s.cA || s.cB, s.cB, S.after); c = mixC(c, s.cD, S.diff); }
        if (S.pasFoc > 0) al *= 1 - .78 * S.pasFoc;
      }
      let lw = s.w * (s.n ? 1.6 : 1);
      if (S.side > .01 && s.lado === 'E' && s.d <= 600 && !s.n) { c = mixC(c, [120, 225, 255], .55 * S.side); lw += 1.6 * S.side * pulso; }
      ctx.strokeStyle = rgba(c, al); ctx.lineWidth = lw * Math.max(.6, vista.sc * 1.6);
      ctx.beginPath(); const p = s.p; ctx.moveTo(X(p[0][0]), Y(p[0][1])); for (let k = 1; k < p.length; k++) ctx.lineTo(X(p[k][0]), Y(p[k][1])); ctx.stroke();
    }
    // predio y muro
    ctx.beginPath(); SX.sitio.forEach((q, i) => i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))); ctx.closePath();
    ctx.fillStyle = `rgba(148,201,115,${.05 + .05 * S.after})`; ctx.fill();
    if (S.wall > .02) {
      const gap = 2 + 26 * (1 - S.wall);
      ctx.setLineDash([Math.max(1, 30 * S.wall), gap]); ctx.strokeStyle = `rgba(233,162,59,${.25 + .7 * S.wall})`; ctx.lineWidth = 1 + 3 * S.wall;
      ctx.shadowColor = '#e9a23b'; ctx.shadowBlur = 14 * S.wall; ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
    }
    // personas
    if (S.parts > .02) {
      ctx.globalCompositeOperation = 'lighter';
      for (const a of AG) {
        moverAg(a, dt);
        const s = SEG[a.s], d = a.dir ? s.L - a.t : a.t, d2 = a.dir ? Math.min(s.L, d + 14) : Math.max(0, d - 14);
        const [x, y] = posEn(s, d), [x2, y2] = posEn(s, d2);
        const g = ctx.createLinearGradient(X(x2), Y(y2), X(x), Y(y)); g.addColorStop(0, 'rgba(255,236,200,0)'); g.addColorStop(1, `rgba(255,236,200,${.85 * S.parts})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(X(x2), Y(y2)); ctx.lineTo(X(x), Y(y)); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // entradas
    if (S.ent > .01) ENT.forEach((e, i) => {
      const k = Math.max(0, Math.min(1, S.ent * 1.6 - i * .04)); if (!k) return;
      const u = USO[e.i], x = X(e.x), y = Y(e.y), c = u ? u[1] : '#8e9a93';
      ctx.beginPath(); ctx.arc(x, y, (u ? 9 : 5) * k + (u ? 3 * pulso * k : 0), 0, 7); ctx.fillStyle = '#060807'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
      if (u) {
        ctx.font = '600 12px "Space Grotesk",sans-serif'; const tw = ctx.measureText(u[0]).width;
        const lx = x + (e.x > C0[0] ? 18 : -18 - tw - 16), ly = y - 10;
        ctx.globalAlpha = k; ctx.fillStyle = 'rgba(6,8,7,.85)'; ctx.strokeStyle = c; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, tw + 16, 21, 10) : ctx.rect(lx, ly, tw + 16, 21); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c; ctx.fillText(u[0], lx + 8, ly + 15); ctx.globalAlpha = 1;
      }
    });
  }
  let ult = performance.now();
  (function bucle(now) {
    requestAnimationFrame(bucle);
    const dt = Math.min(.05, (now - ult) / 1000); ult = now;
    if (!vis || !vista) return;
    tween(S, T, RM ? 60 : dt, opts.k || 1.8);
    dibujar(RM ? 0 : dt);
  })(ult);
  visible(cv, v => vis = v);
  return { S, T };
}

// portada
crearMapa($('#cvHero'), { mono: true, pad: 1300, np: innerWidth < 700 ? 500 : 1300, vel: 1.2, zoom: 1.25, shiftX: w => w > 900 ? w * .18 : 0 });
// mapa del capítulo 1
const MAPA = crearMapa($('#cvMapa'), { pad: 650, shiftX: w => 0 });
const LEY = [
  ['Integración a 800 m · antes', 'segregado', 'integrado', 'rampa'],
  ['Integración a 800 m · antes · personas por elección', 'segregado', 'integrado', 'rampa'],
  ['Integración a 800 m · después', 'segregado', 'integrado', 'rampa'],
  ['Diferencia después − antes', 'pierde', 'gana', 'div'],
  ['Elección de los pasajes nuevos', 'poco paso', 'mucho paso', 'rampa'],
  ['Uso recomendado por entrada', 'segregado', 'integrado', 'rampa'],
];
pasos($('#sintaxis'), i => {
  const T = MAPA.T;
  Object.assign(T, [
    { after: 0, wall: 1, diff: 0, side: 0, pas: 0, pasFoc: 0, ent: 0, parts: 0 },
    { after: 0, wall: 1, diff: 0, side: 0, pas: 0, pasFoc: 0, ent: 0, parts: 1 },
    { after: 1, wall: 0, diff: 0, side: 0, pas: 1, pasFoc: 0, ent: 0, parts: 1 },
    { after: 1, wall: 0, diff: 1, side: 1, pas: 1, pasFoc: 0, ent: 0, parts: .5 },
    { after: 1, wall: 0, diff: 0, side: 0, pas: 1, pasFoc: 1, ent: 0, parts: .7 },
    { after: 1, wall: 0, diff: 0, side: 0, pas: 1, pasFoc: 0, ent: 1, parts: .8 },
  ][i]);
  const [t, a, b, tipo] = LEY[i];
  $('#leyMapa').innerHTML = `${t}<i style="background:${tipo === 'div' ? 'linear-gradient(90deg,rgb(64,140,230),rgb(48,54,60),rgb(232,76,61))' : 'linear-gradient(90deg,#2b3cbf,#2f8fd6,#36c2b4,#8fd14f,#f2d23c,#f28c28,#e0332b)'}"></i><div class="lr"><span>${a}</span><span>${b}</span></div>`;
});

/* =====================================================================================
   02 · RED DE ACTORES: grafo de fuerzas vivo, pulsos por dimensión
   ===================================================================================== */
{
  const COM = ACT.comunidades, DIM = ACT.dimensiones, A = ACT.actores, byId = Object.fromEntries(A.map((a, i) => [a.id, Object.assign(a, { i })]));
  const REL = [];
  A.forEach(a => { if (!a.hub) REL.push({ a: a.id, b: 'H-' + a.com, d: a.dim }); });
  ACT.relaciones.forEach(r => REL.push({ a: r[0], b: r[1], d: r[2] }));
  const ORD = Object.keys(COM);
  const cv = $('#cvRed'), L = lienzo(cv), ctx = L.ctx;
  const N = A.map((a, i) => {
    const g = ORD.indexOf(a.com), an = g / 5 * Math.PI * 2 - Math.PI / 2;
    const dist = a.hub ? 1 : (1 + (Math.random() - .5) * .35);
    return {
      a,
      x: Math.cos(an) * (a.hub ? 250 : 210) * dist,
      y: Math.sin(an) * (a.hub ? 140 : 115) * dist,
      vx: 0,
      vy: 0,
      r: a.hub ? 16 : 6,
      col: hex(COM[a.com].c),
      al: 1
    };
  });
  const S = { dim: 0, cut: 0, show: 0 }, T = { dim: 0, cut: 0, show: 1 };
  let dimSel = 0, hover = null;
  const PU = REL.map((r, k) => ({ r, u: Math.random(), v: .18 + Math.random() * .2 }));
  const fuerzaE = cut => { const rs = REL.filter(r => r.d === 2); return rs.filter(r => !cut || (r.a !== 'H-PRO' && r.b !== 'H-PRO')).length / rs.length; };
  $('#datoCorab').textContent = Math.round(fuerzaE(true) * 100) + ' %';
  function sim(dt) {
    const k = Math.min(1, dt * 60);
    // 1. Repulsión entre nodos con diferenciación para hubs y anti-colisión
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const p = N[i], q = N[j], dx = q.x - p.x, dy = q.y - p.y, d2 = Math.max(dx * dx + dy * dy, 25), d = Math.sqrt(d2);
      let rep = 1600;
      if (p.a.hub && q.a.hub) rep = 35000;
      else if (p.a.hub || q.a.hub) rep = 5000;
      const f = rep / d2;
      p.vx -= dx / d * f; p.vy -= dy / d * f; q.vx += dx / d * f; q.vy += dy / d * f;

      const minD = p.r + q.r + (p.a.hub && q.a.hub ? 90 : (p.a.hub || q.a.hub) ? 26 : 12);
      if (d < minD) {
        const push = (minD - d) * .3;
        p.vx -= dx / d * push; p.vy -= dy / d * push; q.vx += dx / d * push; q.vy += dy / d * push;
      }
    }
    // 2. Fuerzas elásticas
    for (const r of REL) {
      const p = N[byId[r.a].i], q = N[byId[r.b].i]; if (S.cut > .5 && (r.a === 'H-PRO' || r.b === 'H-PRO')) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      let ideal = 60, strength = .025;
      if (p.a.hub && q.a.hub) { ideal = 240; strength = .003; }
      else if (p.a.hub || q.a.hub) { ideal = 70; strength = .022; }
      else { ideal = 80; strength = .015; }
      const f = (d - ideal) * strength;
      p.vx += dx / d * f; p.vy += dy / d * f; q.vx -= dx / d * f; q.vy -= dy / d * f;
    }
    // 3. Anclaje a sectores comunitarios en elipse espaciosa
    for (const n of N) {
      const g = ORD.indexOf(n.a.com), an = g / 5 * Math.PI * 2 - Math.PI / 2;
      const tx = Math.cos(an) * (n.a.hub ? 250 : 210);
      const ty = Math.sin(an) * (n.a.hub ? 140 : 115);
      const pull = n.a.hub ? .018 : .006;
      n.vx += (tx - n.x) * pull; n.vy += (ty - n.y) * pull;
      n.vx *= .78; n.vy *= .78; n.x += n.vx * k; n.y += n.vy * k;
      const ellip = (n.x / 330) ** 2 + (n.y / 185) ** 2;
      if (ellip > 1) {
        const s = 1 / Math.sqrt(ellip);
        n.x *= s; n.y *= s;
      }
    }
  }
  function dibujar(dt) {
    const w = L.w, h = L.h;
    const sc = Math.min(w / 760, h / 460) * 0.88;
    const ox = w / 2, oy = h / 2 + 10;
    const X = x => ox + x * sc, Y = y => oy + y * sc;
    ctx.clearRect(0, 0, w, h);
    // anillos elípticos de fondo
    ctx.strokeStyle = 'rgba(233,237,230,.05)'; ctx.lineWidth = 1;
    for (const r of [110, 190, 270]) {
      ctx.beginPath();
      ctx.ellipse(ox, oy, r * sc * 1.25, r * sc * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const cortado = r => r.a === 'H-PRO' || r.b === 'H-PRO';
    for (const r of REL) {
      const p = N[byId[r.a].i], q = N[byId[r.b].i];
      let al = S.show * (dimSel === 0 ? .32 : r.d === dimSel ? .85 : .05);
      if (cortado(r)) al *= 1 - S.cut * .92;
      if (hover && (r.a === hover || r.b === hover)) al = .95;
      const c = hex(DIM[r.d].c);
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = q.x - p.x, dy = q.y - p.y, bend = .12;
      ctx.strokeStyle = rgba(c, al); ctx.lineWidth = (dimSel && r.d === dimSel ? 1.6 : 1) * Math.max(.8, sc);
      ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y)); ctx.quadraticCurveTo(X(mx - dy * bend), Y(my + dx * bend), X(q.x), Y(q.y)); ctx.stroke();
    }
    // pulsos
    ctx.globalCompositeOperation = 'lighter';
    for (const P of PU) {
      const r = P.r; if (dimSel && r.d !== dimSel) continue; if (cortado(r) && S.cut > .3) continue;
      P.u = (P.u + P.v * dt) % 1; const p = N[byId[r.a].i], q = N[byId[r.b].i], u = P.u;
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = q.x - p.x, dy = q.y - p.y, cx = mx - dy * .12, cy = my + dx * .12;
      const x = (1 - u) * (1 - u) * p.x + 2 * (1 - u) * u * cx + u * u * q.x, y = (1 - u) * (1 - u) * p.y + 2 * (1 - u) * u * cy + u * u * q.y;
      ctx.fillStyle = rgba(hex(DIM[r.d].c), .95 * S.show); ctx.beginPath(); ctx.arc(X(x), Y(y), 2.2 * Math.max(.8, sc), 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // nodos
    for (const n of N) {
      let al = S.show; if (n.a.id === 'H-PRO') al *= 1 - S.cut * .75;
      const r = n.r * Math.max(.8, sc) * (n.a.id === 'H-PRO' ? 1 - .45 * S.cut : 1);
      const g = ctx.createRadialGradient(X(n.x), Y(n.y), 0, X(n.x), Y(n.y), r * 2.6); g.addColorStop(0, rgba(n.col, .45 * al)); g.addColorStop(1, rgba(n.col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), r * 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = rgba(mixC(n.col, [255, 255, 255], .15), al); ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), r, 0, 7); ctx.fill();

      // Etiquetas de hubs orientadas estratégicamente hacia afuera del layout
      if (n.a.hub || hover === n.a.id) {
        ctx.font = (n.a.hub ? '600 12.5px' : '500 11.5px') + ' "Space Grotesk",sans-serif';
        const txt = n.a.id === 'H-PRO' && S.cut > .5 ? 'Corabastos (apagado)' : n.a.n;

        let tx, ty;
        if (n.a.id === 'H-COM') {
          // Arriba al centro
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          tx = X(n.x); ty = Y(n.y) - (r + 10) * Math.max(.8, sc);
        } else if (n.a.id === 'H-PRO') {
          // A la derecha
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          tx = X(n.x) + (r + 10) * Math.max(.8, sc); ty = Y(n.y);
        } else if (n.a.id === 'H-FOR') {
          // Abajo a la derecha
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          tx = X(n.x) + (r + 8) * Math.max(.8, sc); ty = Y(n.y) + (r + 6) * Math.max(.8, sc);
        } else if (n.a.id === 'H-INS') {
          // Abajo a la izquierda
          ctx.textAlign = 'right'; ctx.textBaseline = 'top';
          tx = X(n.x) - (r + 8) * Math.max(.8, sc); ty = Y(n.y) + (r + 6) * Math.max(.8, sc);
        } else if (n.a.id === 'H-ENT') {
          // A la izquierda
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          tx = X(n.x) - (r + 10) * Math.max(.8, sc); ty = Y(n.y);
        } else {
          // Otros nodos en hover
          ctx.textAlign = n.x >= 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
          tx = X(n.x) + (n.x >= 0 ? 1 : -1) * (r + 8) * Math.max(.8, sc); ty = Y(n.y);
        }

        ctx.strokeStyle = '#060807';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(txt, tx, ty);
        ctx.fillStyle = 'rgba(233,237,230,' + al + ')';
        ctx.fillText(txt, tx, ty);
      }
    }
    // Tooltip flotante para nodo seleccionado / hover
    if (hover) {
      const hNode = N.find(n => n.a.id === hover);
      if (hNode && !hNode.a.hub) {
        const hx = X(hNode.x), hy = Y(hNode.y);
        const name = hNode.a.n, com = COM[hNode.a.com].n, dim = DIM[hNode.a.dim].n, desc = hNode.a.d || '';
        ctx.save();
        ctx.font = '600 12px "Space Grotesk",sans-serif';
        const wName = ctx.measureText(name).width;
        ctx.font = '400 10.5px "Space Grotesk",sans-serif';
        const wDesc = Math.min(260, ctx.measureText(desc).width);
        const boxW = Math.max(wName, wDesc, 140) + 20;
        const boxH = desc ? 56 : 38;
        let bx = hx + 14; if (bx + boxW > w - 10) bx = hx - boxW - 14;
        let by = hy - boxH / 2; if (by < 10) by = 10; if (by + boxH > h - 10) by = h - boxH - 10;
        ctx.fillStyle = 'rgba(12, 16, 15, 0.94)';
        ctx.strokeStyle = 'rgba(233, 237, 230, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, 8); else ctx.rect(bx, by, boxW, boxH);
        ctx.fill(); ctx.stroke();
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.font = '600 12px "Space Grotesk",sans-serif'; ctx.fillStyle = '#e9ede6'; ctx.fillText(name, bx + 10, by + 8);
        ctx.font = '500 10px "JetBrains Mono",monospace'; ctx.fillStyle = hex(COM[hNode.a.com].c); ctx.fillText(com + ' · ' + dim, bx + 10, by + 24);
        if (desc) {
          ctx.font = '400 10px "Space Grotesk",sans-serif'; ctx.fillStyle = '#8e9a93';
          const shortDesc = desc.length > 40 ? desc.slice(0, 39) + '…' : desc;
          ctx.fillText(shortDesc, bx + 10, by + 38);
        }
        ctx.restore();
      }
    }
  }
  let vis = false, ult = performance.now();
  (function bucle(now) { requestAnimationFrame(bucle); const dt = Math.min(.05, (now - ult) / 1000); ult = now; if (!vis) return; tween(S, T, RM ? 60 : dt); sim(RM ? .016 : dt); dibujar(RM ? 0 : dt); })(ult);
  visible(cv, v => vis = v);
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    const sc = Math.min(L.w / 760, L.h / 460) * 0.88;
    const x = (e.clientX - r.left - L.w / 2) / sc, y = (e.clientY - r.top - (L.h / 2 + 10)) / sc;
    let best = null, bd = 400; for (const n of N) { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n.a.id; } } hover = best;
  });
  cv.addEventListener('pointerleave', () => hover = null);
  pasos($('#red'), i => {
    dimSel = [0, 1, 2, 3, 0][i]; T.cut = i === 4 ? 1 : 0;
    $('#leyRed').innerHTML = i === 0 ? Object.values(COM).map(c => '<span class="chip"><i style="background:' + c.c + '"></i>' + c.n + '</span>').join('') : i === 4 ? 'Corabastos apagado: sus vínculos se rompen' : '<span class="chip"><i style="background:' + DIM[dimSel].c + '"></i>' + dimSel + ' · ' + DIM[dimSel].n + ': ' + DIM[dimSel].d + '</span>';
  });
}

/* =====================================================================================
   03 · SUB-RED: componentes en anillo, flujos con puntos que corren, detalle con línea de pasos
   ===================================================================================== */
{
  const svg = $('#svgSub'), cx = 320, cy = 300, R = 228;
  const byId = Object.fromEntries(ACT.actores.map(a => [a.id, a])), COM = ACT.comunidades;
  const pos = {}; COMPONENTES.forEach((c, i) => { const a = -Math.PI / 2 + i / COMPONENTES.length * Math.PI * 2; pos[c.id] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R * .92]; });
  const defs = svgEl('defs', {}, svg);
  const glow = svgEl('filter', { id: 'gl', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs); svgEl('feGaussianBlur', { stdDeviation: 4, result: 'b' }, glow); const fm = svgEl('feMerge', {}, glow); svgEl('feMergeNode', { in: 'b' }, fm); svgEl('feMergeNode', { in: 'SourceGraphic' }, fm);
  svgEl('circle', { cx, cy, r: 92, fill: 'none', stroke: 'rgba(233,237,230,.08)' }, svg);
  svgEl('circle', { cx, cy, r: 160, fill: 'none', stroke: 'rgba(233,237,230,.05)', 'stroke-dasharray': '2 6' }, svg);
  const centro = svgEl('g', {}, svg);
  svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#e9ede6', 'font-family': 'Unbounded,sans-serif', 'font-size': 20, 'font-weight': 500 }, centro, 'Bavaria');
  svgEl('text', { x: cx, y: cy + 20, 'text-anchor': 'middle', fill: '#e9a23b', 'font-family': 'Unbounded,sans-serif', 'font-size': 20, 'font-weight': 500 }, centro, 'Común');
  const gF = svgEl('g', {}, svg), gN = svgEl('g', {}, svg);
  const FL = FLUJOS_COMP.map(([a, b, t], k) => {
    const [x1, y1] = pos[a], [x2, y2] = pos[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const qx = lerp(mx, cx, .55) + (y2 - y1) * .08, qy = lerp(my, cy, .55) - (x2 - x1) * .08;
    const col = COMPONENTES.find(c => c.id === a).c, id = 'fl' + k;
    const g = svgEl('g', { class: 'flujo' }, gF);
    svgEl('path', { id, d: `M${x1} ${y1}Q${qx} ${qy} ${x2} ${y2}`, fill: 'none', stroke: col, 'stroke-opacity': .35, 'stroke-width': 1.2 }, g);
    for (let j = 0; j < 3; j++) { const c = svgEl('circle', { r: 3, fill: col, filter: 'url(#gl)' }, g); const am = svgEl('animateMotion', { dur: (3.2 + (k % 4) * .5) + 's', begin: (-j * 1.1 - k * .3) + 's', repeatCount: 'indefinite', keyPoints: '0;1', keyTimes: '0;1', calcMode: 'linear' }, c); svgEl('mpath', { href: '#' + id }, am); }
    const lt = svgEl('text', { 'font-family': 'JetBrains Mono,monospace', 'font-size': 10, fill: col, 'text-anchor': 'middle', opacity: 0 }, g, t);
    lt.setAttribute('x', (x1 + 2 * qx + x2) / 4); lt.setAttribute('y', (y1 + 2 * qy + y2) / 4 - 5);
    return { a, b, g, lt };
  });
  const NOD = COMPONENTES.map(c => {
    const [x, y] = pos[c.id], g = svgEl('g', { class: 'comp', tabindex: 0, role: 'button', 'aria-label': c.n }, gN);
    const halo = svgEl('circle', { cx: x, cy: y, r: 44, fill: c.c, opacity: 0, filter: 'url(#gl)' }, g);
    svgEl('circle', { class: 'bg', cx: x, cy: y, r: 36, fill: '#0c100f', stroke: c.c, 'stroke-width': 1.5 }, g);
    svgEl('text', { x, y: y + 6, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono,monospace', 'font-size': 18, 'font-weight': 600, fill: c.c }, g, c.num);
    const lab = svgEl('text', { x, y: y + (y > cy + 20 ? 56 : -46), 'text-anchor': 'middle', fill: '#e9ede6', 'font-family': 'Space Grotesk,sans-serif', 'font-size': 13, 'font-weight': 600 }, g, c.n);
    g.addEventListener('click', () => { auto = false; elegir(c.id); }); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); auto = false; elegir(c.id); } });
    return { c, g, halo };
  });
  $('#pillsComp').innerHTML = COMPONENTES.map(c => `<button class="pill" data-c="${c.id}">${c.n}</button>`).join('') + `<button class="pill" id="pAuto">Recorrido automático</button>`;
  document.querySelectorAll('#pillsComp [data-c]').forEach(b => b.onclick = () => { auto = false; elegir(b.dataset.c); });
  let sel = null, auto = true, tAuto = 0;
  $('#pAuto').onclick = () => { auto = !auto; tAuto = 0; $('#pAuto').classList.toggle('on', auto); };
  function elegir(id) {
    sel = id; const c = COMPONENTES.find(x => x.id === id);
    NOD.forEach(n => { const on = n.c.id === id; n.halo.setAttribute('opacity', on ? .35 : 0); n.g.querySelector('.bg').setAttribute('r', on ? 42 : 36); n.g.querySelector('.bg').setAttribute('stroke-width', on ? 3 : 1.5); });
    FL.forEach(f => { const on = f.a === id || f.b === id; f.g.classList.toggle('fuera', !on); f.lt.setAttribute('opacity', on ? 1 : 0); });
    document.querySelectorAll('#pillsComp [data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === id));
    $('#pAuto').classList.toggle('on', auto);
    $('#det').innerHTML = `<div class="barra" id="barra"></div><p class="eyebrow" style="margin:0;color:${c.c}">Componente ${c.num} · ${c.id.toUpperCase()}</p><h3>${c.n}</h3><p class="que">${c.que}</p><p class="meta">${c.dato}</p>
      <ol class="linea">${c.pasos.map(([t, como, ids], i) => `<li style="animation-delay:${.08 + i * .09}s"><span class="num" style="background:${c.c}">${i + 1}</span><b>${t}</b><p>${como}</p><div class="who">${ids.map(x => { const a = byId[x]; return `<span><i style="background:${COM[a.com].c}"></i>${a.n}</span>`; }).join('')}</div></li>`).join('')}</ol>`;
  }
  elegir('cmp');
  let vis = false, ult = performance.now();
  visible(svg, v => vis = v);
  (function bucle(now) {
    requestAnimationFrame(bucle); const dt = (now - ult) / 1000; ult = now;
    if (!vis || !auto || RM) return; tAuto += dt; const b = $('#barra'); if (b) b.style.width = Math.min(100, tAuto / 7 * 100) + '%';
    if (tAuto > 7) { tAuto = 0; const i = COMPONENTES.findIndex(c => c.id === sel); elegir(COMPONENTES[(i + 1) % COMPONENTES.length].id); }
  })(ult);
}

/* =====================================================================================
   04 · ASAMBLEAS: personas que viajan al consejo cada periodo
   ===================================================================================== */
{
  const svg = $('#svgAsa'), C = [400, 390], RA = 285, RC = 92, GC = { M: '#e58aa8', H: '#5fb3d9', NB: '#a98bd6' };
  let metodo = 'sorteo', meses = 6, play = true, k = 0, manual = false, ROT = null, nodos = {};
  const PARTIC = 460;
  const angA = i => -Math.PI / 2 + i / (ASAMBLEAS.length + 1) * Math.PI * 2;
  const gBase = svgEl('g', {}, svg), gP = svgEl('g', {}, svg);
  function base() {
    gBase.innerHTML = '';
    svgEl('circle', { cx: C[0], cy: C[1], r: RC + 34, fill: 'none', stroke: 'rgba(233,162,59,.18)' }, gBase);
    svgEl('circle', { cx: C[0], cy: C[1], r: 50, fill: '#0c100f', stroke: '#e9a23b', 'stroke-width': 1.4 }, gBase);
    svgEl('text', { x: C[0], y: C[1] - 3, 'text-anchor': 'middle', fill: '#e9a23b', 'font-family': 'Unbounded,sans-serif', 'font-size': 13 }, gBase, 'Consejo');
    svgEl('text', { x: C[0], y: C[1] + 14, 'text-anchor': 'middle', fill: '#8e9a93', 'font-family': 'JetBrains Mono,monospace', 'font-size': 9.5 }, gBase, 'federal');
    ASAMBLEAS.forEach((as, i) => {
      const a = angA(i), x = C[0] + Math.cos(a) * RA, y = C[1] + Math.sin(a) * RA, sx = C[0] + Math.cos(a) * RC, sy = C[1] + Math.sin(a) * RC;
      svgEl('line', { x1: sx, y1: sy, x2: x, y2: y, stroke: 'rgba(233,237,230,.07)', 'stroke-dasharray': '2 5' }, gBase);
      svgEl('circle', { cx: sx, cy: sy, r: 15, fill: 'none', stroke: 'rgba(233,237,230,.25)', 'stroke-dasharray': '3 3' }, gBase);
      const ly = y + (Math.sin(a) > .3 ? 74 : -66);
      svgEl('text', { x, y: ly, 'text-anchor': 'middle', fill: '#e9ede6', 'font-family': 'Space Grotesk,sans-serif', 'font-size': 14, 'font-weight': 600 }, gBase, as.n.replace('Asamblea ', '').replace('Mesa de ', 'Mesa ').replace('Mesa del ', 'Mesa '));
      svgEl('text', { x, y: ly + 16, 'text-anchor': 'middle', fill: '#8e9a93', 'font-family': 'JetBrains Mono,monospace', 'font-size': 10 }, gBase, as.t);
    });
    const a = angA(ASAMBLEAS.length), sx = C[0] + Math.cos(a) * RC, sy = C[1] + Math.sin(a) * RC, x = C[0] + Math.cos(a) * RA, y = C[1] + Math.sin(a) * RA;
    svgEl('line', { x1: sx, y1: sy, x2: x, y2: y, stroke: 'rgba(148,201,115,.15)', 'stroke-dasharray': '2 5' }, gBase);
    svgEl('circle', { cx: sx, cy: sy, r: 15, fill: '#0c100f', stroke: '#94c973', 'stroke-width': 1.6 }, gBase);
    svgEl('text', { x: sx, y: sy + 4, 'text-anchor': 'middle', fill: '#94c973', 'font-family': 'JetBrains Mono,monospace', 'font-size': 10.5, 'font-weight': 600 }, gBase, 'SB');
    svgEl('text', { x, y: y + 5, 'text-anchor': 'middle', fill: '#94c973', 'font-family': 'Space Grotesk,sans-serif', 'font-size': 13, 'font-weight': 600 }, gBase, 'Colectivo Bavaria');
    svgEl('text', { x, y: y + 21, 'text-anchor': 'middle', fill: '#8e9a93', 'font-family': 'JetBrains Mono,monospace', 'font-size': 10 }, gBase, 'asiento fijo · guardián del bosque');
  }
  function reiniciar() {
    ROT = rotacion({ metodo, meses, partic: () => PARTIC }); k = 0; gP.innerHTML = ''; nodos = {};
    ROT.filas.forEach(({ as, fila }, i) => {
      const a = angA(i), x0 = C[0] + Math.cos(a) * RA, y0 = C[1] + Math.sin(a) * RA, n = fila[0].bolsa;
      const ids = [...new Set(fila.map(c => c.id))]; const gen = {}; fila.forEach(c => gen[c.id] = c.g);
      for (let j = 0; j < n; j++) {
        const id = as.id + '-' + String(j + 1).padStart(2, '0'), r = 5.2 * Math.sqrt(j + .5) * 1.5, th = j * 2.39996;
        const hx = x0 + Math.cos(th) * r, hy = y0 + Math.sin(th) * r;
        const g = gen[id] || (j % 2 ? 'H' : 'M');
        const c = svgEl('circle', { class: 'persona', cx: 0, cy: 0, r: 4.6, fill: GC[g], opacity: .55 }, gP);
        c.style.transform = `translate(${hx}px,${hy}px)`;
        nodos[id] = { c, hx, hy, sx: C[0] + Math.cos(a) * RC, sy: C[1] + Math.sin(a) * RC, ya: false };
      }
    });
    paso(true);
  }
  function paso(primero) {
    const per = ROT.per;
    ROT.filas.forEach(({ fila }) => {
      const c = fila[k], prev = k > 0 ? fila[k - 1] : null;
      if (prev && prev.id !== c.id) { const n = nodos[prev.id]; if (n) { n.ya = true; n.c.style.transform = `translate(${n.hx}px,${n.hy}px)`; n.c.setAttribute('r', 4.6); n.c.setAttribute('opacity', .95); n.c.setAttribute('stroke', '#ffffff'); n.c.setAttribute('stroke-width', 1.6); } }
      const n = nodos[c.id]; if (n) { n.c.style.transform = `translate(${n.sx}px,${n.sy}px)`; n.c.setAttribute('r', 11); n.c.setAttribute('opacity', 1); n.c.setAttribute('stroke', 'none'); }
    });
    const M = metricas(ROT, k);
    $('#cVoc').textContent = M.distintos; $('#cPer').textContent = `periodo ${k + 1} de ${per} · año ${(k * meses / 12).toFixed(1)} · ${Math.round(M.mujeres * 100)} % mujeres`;
  }
  base(); reiniciar();
  let vis = false, t = 0, ult = performance.now();
  visible(svg, v => vis = v);
  (function bucle(now) {
    requestAnimationFrame(bucle); const dt = (now - ult) / 1000; ult = now;
    if (!vis || !play) return; t += dt; if (t > (RM ? 3 : 1.7)) { t = 0; k++; if (k >= ROT.per) { reiniciar(); return; } paso(); }
  })(ult);
  const setMet = m => { metodo = m; document.querySelectorAll('#segMet button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); reiniciar(); };
  document.querySelectorAll('#segMet button').forEach(b => b.onclick = () => { manual = true; setMet(b.dataset.m); });
  document.querySelectorAll('#segMes button').forEach(b => b.onclick = () => { meses = +b.dataset.x; document.querySelectorAll('#segMes button').forEach(x => x.classList.toggle('on', x === b)); reiniciar(); });
  $('#asaPlay').onclick = () => { play = !play; $('#asaPlay').textContent = play ? 'Pausa' : 'Seguir'; };
  pasos($('#asambleas'), i => { if (manual) return; const m = i === 4 ? 'unico' : 'sorteo'; if (m !== metodo) setMet(m); });
}

/* =====================================================================================
   05 · MODELO DINÁMICO (Euler, dt = 1 día, 10 años)
   ===================================================================================== */
{
  const A = ACT.actores, COM = ACT.comunidades, byId = Object.fromEntries(A.map(a => [a.id, a]));
  const REL = []; A.forEach(a => { if (!a.hub) REL.push([a.id, 'H-' + a.com, a.dim]); }); ACT.relaciones.forEach(r => REL.push(r));
  const qs = new URLSearchParams(location.search);
  const off = new Set((qs.get('off') || '').split(',').filter(x => byId[x]));
  const comOff = new Set((qs.get('com') || '').split(',').filter(k => COM[k]));
  const on = id => !off.has(id) && !comOff.has(byId[id].com);
  function fuerzas() {
    const f = {}; for (const d of ['1', '2', '3']) { const rs = REL.filter(r => String(r[2]) === d); f[d] = rs.filter(r => on(r[0]) && on(r[1])).length / rs.length; }
    const m = ids => ids.filter(on).length / ids.length;
    return { S: f['1'], E: f['2'], G: f['3'], corab: on('H-PRO') ? 1 : 0, recic: m(['P04', 'I02', 'P05']), gob: m(['H-INS', 'H-COM', 'I09', 'C06']), siem: m(['H-ENT', 'I06', 'I01', 'C06', 'E07']), form: m(['H-FOR', 'F05', 'F07', 'F08']) };
  }
  const PAR = [['pot', 'Participación potencial', '% adultos', 1, 15, .5, 5], ['conv', 'Tasa de convocatoria', '/año', .1, 2, .05, .8], ['sep', 'Meta de separación', '%', 0, 80, 5, 60], ['cor', 'Aporte de Corabastos', 't/día', 0, 20, .5, 5], ['cap', 'Capacidad de compostaje', 't/día', 2, 30, 1, 12], ['rend', 'Rendimiento de bancales', 'kg/m²/año', 3, 8, .25, 5.5], ['techos', 'Techos productivos', '%', 0, 100, 5, 60], ['meses', 'Duración de la vocería', 'meses', 3, 24, 1, 6], ['pres', 'Presión sobre el bosque', '0–1', 0, 1, .05, .15]];
  const BASE = { ...Object.fromEntries(PAR.map(p => [p[0], p[6]])), desg: 2.5, tcomp: 60, m2p: 45, metodo: 'sorteo' };
  const ESC = { actual: { metodo: 'unico', meses: 24, pot: 2, conv: .3, desg: 1.5, sep: 15, cor: 0, tcomp: 90, cap: 3, rend: 4, techos: 0, m2p: 30, pres: .9 }, propuesta: {}, sinred: {} };
  const OFF_ACTUAL = ['H-ENT', 'C06', 'P04', 'P05', 'I02', 'I06', 'F05', 'F06', 'F07', 'F08', 'P01', 'P06', 'P07', 'P08', 'I09', 'C05', 'E07'];
  let par = { ...BASE };
  const POB = 40320, ADUL = POB * .7, AB = 27043, AT = 26098, T0 = 3250, DIAS = 3650;
  function simular(p, F) {
    const Ppot = ADUL * p.pot / 100, Amax = AB + AT * p.techos / 100;
    let P = ADUL * .002, R = 0, C = 0, Ar = 1500, T = T0, DJ = 0;
    const o = { P: [], R: [], C: [], A: [], T: [], DJ: [], aut: [], voc: [], fl: [] };
    for (let d = 0; d <= DIAS; d++) {
      const per = Math.floor(d / (p.meses * 30.42)) + 1, exVoc = p.metodo === 'unico' ? 6 : Math.min(6 * per, Math.max(6, P * .25)), lid = Math.min(1, exVoc / 60);
      const demanda = Ar * 3 / 365 / 1000, usoB = Math.min(C / 20, demanda), uso = usoB + Math.max(0, C - 80) / 30, suf = demanda > 0 ? usoB / demanda : 1;
      const cosecha = Ar * p.rend / 365 * (.55 + .45 * suf), aut = cosecha / (POB * .2);
      const calidad = Math.min(1, T / T0) * (.5 + .5 * F.G), efCos = 1 + 1.5 * Math.min(1, aut / .3), efAmb = .6 + .4 * calidad, capTrab = P * p.m2p;
      const fracSep = p.sep / 100 * Math.min(1, P / Math.max(1, Ppot)) * (.35 + .65 * F.recic) * (.5 + .5 * F.E);
      const inc = Math.max(0, Ppot - P) * p.conv / 365 * (.15 + .85 * F.S) * efCos * efAmb;
      const aba = P / (p.desg * 365) * (1.5 - .6 * F.gob - .3 * F.form) * (1.25 - .5 * lid);
      const sepT = POB * .8 / 1000 * .51 * fracSep, corT = p.cor * F.corab * (.4 + .6 * F.E);
      const comp = Math.min(R / p.tcomp, p.cap * (.3 + .7 * F.recic));
      const hab = Math.max(0, Math.min(Amax, capTrab) - Ar) / 180 * (.4 + .6 * suf), det = Ar / (3 * 365) + Math.max(0, Ar - capTrab) / 365;
      const siem = 1.2 * F.siem * (.5 + .5 * suf) * (.3 + .7 * Math.min(1, P / Math.max(1, Ppot))), mort = T * (.02 / 365) + T * p.pres * (.5 / 365) * (1 - .6 * F.G);
      if (d % 5 === 0) { o.P.push(P); o.R.push(R); o.C.push(C); o.A.push(Ar); o.T.push(T); o.DJ.push(DJ); o.aut.push(aut * 100); o.voc.push(exVoc); o.fl.push({ inc, aba, sep: sepT, cor: corT, comp, uso, hab, det, siem, mort }); }
      P += inc - aba; R += sepT + corT - comp; C += comp * .4 - uso; Ar += hab - det; T += siem - mort; DJ += sepT + corT;
    }
    return o;
  }
  const RUNA = simular({ ...BASE, ...ESC.actual }, (() => { const s = new Set(off); OFF_ACTUAL.forEach(x => off.add(x)); const f = fuerzas(); off.clear(); s.forEach(x => off.add(x)); return f; })());
  let RUN = null, idx = 730;

  /* ----- diagrama: tanques, tuberías, válvulas ----- */
  const svg = $('#svgMod');
  const defs = svgEl('defs', {}, svg);
  const TK = { P: { x: 500, y: 92, n: 'Participación', u: 'personas', c: '#e58aa8' }, R: { x: 215, y: 255, n: 'Residuos en pila', u: 't', c: '#b98a57' }, C: { x: 500, y: 255, n: 'Compost', u: 't', c: '#e9a23b' }, A: { x: 215, y: 415, n: 'Área cultivada', u: 'm²', c: '#94c973' }, T: { x: 785, y: 415, n: 'Árboles del bosque', u: 'árboles', c: '#4f8a3c' } };
  const TW = 150, TH = 86;
  // vínculos causales (fondo)
  const LK = [['P', 'A', '+', 'manos para cultivar', -60], ['A', 'P', '+', 'cosecha visible', -60], ['P', 'R', '+', 'separación', 50], ['C', 'A', '+', 'abono', 40], ['T', 'P', '+', 'bosque que atrae', 80], ['P', 'T', '+', 'siembra', -40]];
  const gL = svgEl('g', {}, svg);
  svgEl('marker', { id: 'mk', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, defs).appendChild(svgEl('path', { d: 'M0 0L10 5L0 10z', fill: 'rgba(233,237,230,.45)' }));
  LK.forEach(([a, b, s, t, k], i) => {
    const p = TK[a], q = TK[b], mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = q.x - p.x, dy = q.y - p.y, L_ = Math.hypot(dx, dy);
    const cx = mx - dy / L_ * k * 1.6, cy = my + dx / L_ * k * 1.6;
    const sh = (o, tx) => { const vx = tx.x - o.x, vy = tx.y - o.y, l = Math.hypot(vx, vy), f = Math.min(TW / 2 / Math.abs(vx || 1e-6), TH / 2 / Math.abs(vy || 1e-6)) + 8 / l; return [o.x + vx * f, o.y + vy * f]; };
    const [x1, y1] = sh(p, { x: cx, y: cy }), [x2, y2] = sh(q, { x: cx, y: cy });
    svgEl('path', { d: `M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`, fill: 'none', stroke: 'rgba(233,237,230,.2)', 'stroke-width': 1.1, 'stroke-dasharray': '3 5', 'marker-end': 'url(#mk)', class: 'lkf' }, gL);
    const tx = (x1 + 2 * cx + x2) / 4, ty = (y1 + 2 * cy + y2) / 4;
    const bg = svgEl('g', {}, gL); svgEl('circle', { cx: tx, cy: ty, r: 7, fill: '#0c100f', stroke: 'rgba(148,201,115,.6)' }, bg); svgEl('text', { x: tx, y: ty + 3.5, 'text-anchor': 'middle', fill: '#94c973', 'font-family': 'JetBrains Mono,monospace', 'font-size': 10, 'font-weight': 600 }, bg, s); svgEl('title', {}, bg, `${TK[a].n} → ${TK[b].n}: ${t}`);
  });
  // tuberías: [desde, hasta, clave de flujo, etiqueta]  (punto = nube)
  const PIPES = [
    [[300, 92], 'P', 'inc', 'incorporación'], ['P', [710, 92], 'aba', 'abandono'],
    [[40, 255], 'R', 'sep', 'separación'], [[110, 150], 'R', 'cor', 'Corabastos', [-58, -6]], ['R', 'C', 'comp', 'compostaje'], ['C', [720, 255], 'uso', 'uso y excedente'],
    [[40, 415], 'A', 'hab', 'habilitación'], ['A', [410, 415], 'det', 'abandono bancales'],
    [[590, 415], 'T', 'siem', 'siembra'], ['T', [975, 415], 'mort', 'mortalidad y tala'],
  ];
  const borde = (t, hacia) => { const p = TK[t]; const dx = hacia[0] - p.x, dy = hacia[1] - p.y; return Math.abs(dx) > Math.abs(dy) ? [p.x + Math.sign(dx) * TW / 2, p.y] : [p.x, p.y + Math.sign(dy) * TH / 2]; };
  const gP = svgEl('g', {}, svg), gT = svgEl('g', {}, svg);
  const PIPE = PIPES.map(([a, b, f, n, off]) => {
    const pa = typeof a === 'string' ? null : a, pb = typeof b === 'string' ? null : b;
    const A_ = pa || borde(a, pb || [TK[b].x, TK[b].y]), B_ = pb || borde(b, pa || [TK[a].x, TK[a].y]);
    svgEl('line', { x1: A_[0], y1: A_[1], x2: B_[0], y2: B_[1], stroke: '#2a3330', 'stroke-width': 10, 'stroke-linecap': 'round' }, gP);
    svgEl('line', { x1: A_[0], y1: A_[1], x2: B_[0], y2: B_[1], stroke: '#0c100f', 'stroke-width': 6, 'stroke-linecap': 'round' }, gP);
    for (const [q, s] of [[pa, A_], [pb, B_]]) if (q) { svgEl('circle', { cx: s[0], cy: s[1], r: 9, fill: 'none', stroke: '#3b4642', 'stroke-dasharray': '2 3' }, gP); }
    const col = TK[typeof b === 'string' ? b : a].c;
    const dots = Array.from({ length: 6 }, (_, j) => svgEl('circle', { r: 2.6, fill: col, opacity: 0 }, gP));
    const mx = (A_[0] + B_[0]) / 2, my = (A_[1] + B_[1]) / 2, vert = Math.abs(A_[0] - B_[0]) < 1;
    const vg = svgEl('g', { transform: `translate(${mx} ${my})` }, gP);
    svgEl('circle', { r: 10, fill: '#0c100f', stroke: '#c9d1cb', 'stroke-width': 1.3 }, vg);
    const aspa = svgEl('path', { d: 'M-6 0H6M0 -6V6', stroke: '#c9d1cb', 'stroke-width': 1.5 }, vg);
    const lx = off ? mx + off[0] : mx + (vert ? 16 : 0), ly = off ? my + off[1] : my + (vert ? 4 : 26);
    const lab = svgEl('text', { x: lx, y: ly, 'text-anchor': vert ? 'start' : 'middle', fill: '#c9d1cb', 'font-family': 'Space Grotesk,sans-serif', 'font-size': 11 }, gP, n);
    const val = svgEl('text', { x: lx, y: ly + 13, 'text-anchor': vert ? 'start' : 'middle', fill: '#8e9a93', 'font-family': 'JetBrains Mono,monospace', 'font-size': 10 }, gP, '');
    return { A_, B_, f, dots, aspa, val, rot: 0, fase: Math.random() };
  });
  const TANK = Object.entries(TK).map(([k, t]) => {
    const g = svgEl('g', {}, gT), x = t.x - TW / 2, y = t.y - TH / 2;
    const cp = svgEl('clipPath', { id: 'cp' + k }, defs); svgEl('rect', { x, y, width: TW, height: TH, rx: 10 }, cp);
    svgEl('rect', { x, y, width: TW, height: TH, rx: 10, fill: '#0a0d0c' }, g);
    const ola = svgEl('path', { fill: t.c, opacity: .32, 'clip-path': `url(#cp${k})` }, g);
    const ola2 = svgEl('path', { fill: t.c, opacity: .5, 'clip-path': `url(#cp${k})` }, g);
    svgEl('rect', { x, y, width: TW, height: TH, rx: 10, fill: 'none', stroke: t.c, 'stroke-width': 1.4 }, g);
    svgEl('text', { x: t.x, y: y - 9, 'text-anchor': 'middle', fill: '#e9ede6', 'font-family': 'Space Grotesk,sans-serif', 'font-size': 13, 'font-weight': 600 }, g, t.n);
    const v = svgEl('text', { x: t.x, y: t.y + 6, 'text-anchor': 'middle', fill: '#ffffff', 'font-family': 'Unbounded,sans-serif', 'font-size': 18, 'font-weight': 500 }, g, '');
    svgEl('text', { x: t.x, y: t.y + 24, 'text-anchor': 'middle', fill: '#c9d1cb', 'font-family': 'JetBrains Mono,monospace', 'font-size': 10 }, g, t.u);
    return { k, t, ola, ola2, v, lvl: 0, x, y };
  });
  // bucles
  const BU = [['R1', 'Cosecha visible', 'Más gente cultiva más bancales; la cosecha se ve en el barrio y convoca a más gente.', '#e9a23b'], ['R2', 'Ciclo de nutrientes', 'Los residuos del barrio y de Corabastos vuelven como abono y hacen crecer los bancales.', '#e9a23b'], ['R3', 'Bosque y confianza', 'Cuidar el bosque lo vuelve un lugar que atrae; quien llega siembra más.', '#e9a23b'], ['R4', 'Liderazgo distribuido', 'Si la vocería rota, más gente lleva la voz de su asamblea, se siente dueña y se queda.', '#e9a23b'], ['B1', 'Saturación', 'Mientras más gente participa, menos queda por convocar.', '#5fb3d9'], ['B2', 'Límite de suelo y de manos', 'Los bancales crecen hasta el suelo disponible o hasta lo que la gente alcanza a cuidar.', '#5fb3d9'], ['B3', 'Desgaste', 'Toda participación se desgasta; la gobernanza y la formación la alargan.', '#5fb3d9'], ['B4', 'Presión sobre el bosque', 'La tala depende del decreto: el 364 tala casi todo, el 448 conserva.', '#5fb3d9']];
  $('#bucles').innerHTML = BU.map(([id, n, d, c]) => `<div class="bu"><b style="color:${c}">${id} · ${n}</b><p>${d}</p></div>`).join('');

  /* ----- panel ----- */
  $('#sls').innerHTML = PAR.map(([k, n, u, mi, ma, st]) => `<div class="sl"><label for="sl-${k}">${n}<b id="sv-${k}"></b></label><input type="range" id="sl-${k}" min="${mi}" max="${ma}" step="${st}"></div>`).join('');
  PAR.forEach(([k, , u]) => { const i = $('#sl-' + k); i.oninput = () => { par[k] = +i.value; marcar(null); correr(); }; });
  $('#pillsCom').innerHTML = Object.entries(COM).map(([k, c]) => `<button class="pill" data-k="${k}" style="--c:${c.c}"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c.c};margin-right:6px"></span>${c.n}</button>`).join('');
  document.querySelectorAll('#pillsCom [data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; comOff.has(k) ? comOff.delete(k) : comOff.add(k); marcar(null); correr(); });
  document.querySelectorAll('#segVoc button').forEach(b => b.onclick = () => { par.metodo = b.dataset.m; marcar(null); correr(); });
  const marcar = e => document.querySelectorAll('#segEsc button').forEach(b => b.classList.toggle('on', b.dataset.e === e));
  document.querySelectorAll('#segEsc button').forEach(b => b.onclick = () => {
    const e = b.dataset.e; par = { ...BASE, ...ESC[e] }; off.clear(); comOff.clear();
    if (e === 'actual') OFF_ACTUAL.forEach(x => off.add(x)); if (e === 'sinred') Object.keys(COM).forEach(k => comOff.add(k));
    marcar(e); correr(true);
  });

  /* ----- gráficas ----- */
  const GR = [['P', 'Participación', 'personas activas', '#e58aa8'], ['aut', 'Autoabastecimiento', '% de la meta de 200 g/persona/día', '#94c973'], ['DJ', 'Desviado de Doña Juana', 't acumuladas', '#5fb3d9'], ['A', 'Área cultivada', 'm²', '#94c973'], ['T', 'Árboles del bosque', 'árboles', '#4f8a3c'], ['voc', 'Personas que han sido vocería', 'personas', '#e58aa8']];
  $('#graficas').innerHTML = GR.map(([k, n, u]) => `<div class="gr"><h5>${n}</h5><p id="gp-${k}">${u}</p><svg id="g-${k}" viewBox="0 0 300 130" role="img" aria-label="${n}"></svg></div>`).join('');
  function graf([k, n, u, col], anim) {
    const s = $('#g-' + k); s.innerHTML = '';
    const a = RUN[k], b = RUNA[k], max = Math.max(1e-6, ...a, ...b) * 1.1, X = i => 30 + i / (a.length - 1) * 262, Y = v => 110 - v / max * 98;
    const ab = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : Math.round(v);
    for (let j = 0; j <= 2; j++) { const v = max / 1.1 * j / 2; svgEl('line', { x1: 30, x2: 292, y1: Y(v), y2: Y(v), stroke: 'rgba(233,237,230,.07)' }, s); svgEl('text', { x: 26, y: Y(v) + 3, 'text-anchor': 'end', 'font-size': 8.5, fill: '#5b6661', 'font-family': 'JetBrains Mono,monospace' }, s, ab(v)); }
    for (const yr of [0, 5, 10]) svgEl('text', { x: X(yr / 10 * (a.length - 1)), y: 125, 'text-anchor': 'middle', 'font-size': 8.5, fill: '#5b6661', 'font-family': 'JetBrains Mono,monospace' }, s, 'año ' + yr);
    const d = arr => arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    svgEl('path', { d: d(b), fill: 'none', stroke: '#5b6661', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, s);
    svgEl('path', { d: d(a) + `L${X(a.length - 1)} 110L30 110Z`, fill: col, opacity: .08 }, s);
    const l = svgEl('path', { d: d(a), fill: 'none', stroke: col, 'stroke-width': 2, class: 'l' }, s);
    if (anim && !RM) { const len = l.getTotalLength(); l.style.strokeDasharray = len; l.style.strokeDashoffset = len; requestAnimationFrame(() => requestAnimationFrame(() => l.style.strokeDashoffset = 0)); }
    const cx = X(idx), cyv = Y(a[idx]);
    svgEl('line', { x1: cx, x2: cx, y1: 10, y2: 110, stroke: '#e9a23b', 'stroke-width': .8, opacity: .6, class: 'cur' }, s);
    svgEl('circle', { cx, cy: cyv, r: 3.5, fill: col, class: 'curp' }, s);
  }
  const fv = (v, k) => k === 'aut' ? v.toFixed(1) + ' %' : fmt(v);
  function cursor() {
    GR.forEach(([k, n, u]) => { const s = $('#g-' + k); const a = RUN[k], b = RUNA[k], max = Math.max(1e-6, ...a, ...b) * 1.1, X = i => 30 + i / (a.length - 1) * 262; const c = s.querySelector('.cur'), p = s.querySelector('.curp'); if (c) { c.setAttribute('x1', X(idx)); c.setAttribute('x2', X(idx)); p.setAttribute('cx', X(idx)); p.setAttribute('cy', 110 - a[idx] / max * 98); } $('#gp-' + k).innerHTML = `${u} · <b style="color:#e9ede6">${fv(a[idx], k)}</b> <span style="color:#5b6661">vs ${fv(b[idx], k)} actual</span>`; });
    $('#modTt').textContent = 'año ' + (idx * 5 / 365).toFixed(1);
    const K = [['P', 'personas participando', v => fmt(v)], ['aut', 'autoabastecimiento', v => v.toFixed(1) + ' %'], ['DJ', 't fuera de Doña Juana', v => fmt(v)], ['voc', 'han sido vocería', v => fmt(v)], ['T', 'árboles', v => fmt(v)]];
    $('#kpis').innerHTML = K.map(([k, n, f]) => `<div><b>${f(RUN[k][idx])}</b><span>${n}</span><em>actual: ${f(RUNA[k][idx])}</em></div>`).join('');
  }
  function correr(anim) {
    RUN = simular(par, fuerzas()); RUN.max = {}; for (const k of ['P', 'R', 'C', 'A', 'T']) RUN.max[k] = Math.max(...RUN[k], ...RUNA[k], k === 'T' ? T0 : 1) * 1.08;
    RUN.fmax = {}; for (const p of PIPE) RUN.fmax[p.f] = Math.max(1e-9, ...RUN.fl.map(x => x[p.f]));
    PAR.forEach(([k]) => { $('#sl-' + k).value = par[k]; $('#sv-' + k).textContent = k === 'meses' ? par[k] + ' m' : fmt(par[k], par[k] % 1 ? 2 : 0); });
    document.querySelectorAll('#segVoc button').forEach(b => b.classList.toggle('on', b.dataset.m === par.metodo));
    document.querySelectorAll('#pillsCom [data-k]').forEach(b => b.classList.toggle('on', !comOff.has(b.dataset.k)));
    GR.forEach(g => graf(g, anim)); cursor();
  }
  correr(false);
  const tr = $('#modT'); tr.oninput = () => { jug = false; $('#modPlay').textContent = 'Simular'; idx = +tr.value; cursor(); };
  let jug = false; $('#modPlay').onclick = () => { if (jug) { jug = false; $('#modPlay').textContent = 'Simular'; return; } if (idx >= 730) idx = 0; jug = true; $('#modPlay').textContent = 'Pausa'; };
  let vis = false, ult = performance.now(), acc = 0, primera = true;
  visible(svg, v => { vis = v; if (v && primera) { primera = false; idx = 0; jug = true; $('#modPlay').textContent = 'Pausa'; GR.forEach(g => graf(g, true)); } });
  (function bucle(now) {
    requestAnimationFrame(bucle); const dt = Math.min(.05, (now - ult) / 1000); ult = now; if (!vis) return;
    if (jug) { acc += dt * 90; const st = Math.floor(acc); if (st) { acc -= st; idx = Math.min(730, idx + st); tr.value = idx; cursor(); if (idx >= 730) { jug = false; $('#modPlay').textContent = 'Simular'; } } }
    const tt = now / 1000;
    for (const T of TANK) {
      const v = RUN[T.k][idx], f = Math.max(0, Math.min(1, v / RUN.max[T.k]));
      T.lvl += (f - T.lvl) * Math.min(1, dt * 4);
      const top = T.y + TH - T.lvl * TH, ola = (fase, amp, fr) => { let d = `M${T.x} ${T.y + TH + 2}`; for (let i = 0; i <= 20; i++) { const x = T.x + i / 20 * TW; d += `L${x.toFixed(1)} ${(top + Math.sin(i / 20 * Math.PI * fr + tt * 2 + fase) * amp).toFixed(1)}`; } return d + `L${T.x + TW} ${T.y + TH + 2}Z`; };
      T.ola.setAttribute('d', ola(0, RM ? 0 : 3, 3)); T.ola2.setAttribute('d', ola(2, RM ? 0 : 2, 2.2));
      T.v.textContent = fmt(v);
    }
    const fl = RUN.fl[idx];
    for (const p of PIPE) {
      const r = fl[p.f] / RUN.fmax[p.f], vel = RM ? 0 : .12 + .9 * r;
      p.fase = (p.fase + dt * vel) % 1; p.rot += dt * vel * 6; p.aspa.setAttribute('transform', `rotate(${p.rot * 57.3})`);
      p.dots.forEach((d, j) => { const u = (p.fase + j / p.dots.length) % 1; d.setAttribute('cx', lerp(p.A_[0], p.B_[0], u)); d.setAttribute('cy', lerp(p.A_[1], p.B_[1], u)); d.setAttribute('opacity', (r > .02 ? .35 + .65 * r : 0) * Math.sin(u * Math.PI)); });
      const v = fl[p.f]; p.val.textContent = (v >= 100 ? fmt(v) : v >= 1 ? v.toFixed(1) : v.toFixed(2)) + (p.f === 'hab' || p.f === 'det' ? ' m²/día' : p.f === 'inc' || p.f === 'aba' ? ' pers/día' : p.f === 'siem' || p.f === 'mort' ? ' árb/día' : ' t/día');
    }
  })(ult);
  $('#ecu').textContent = `Participación = INTEG(incorporación − abandono, 0,002 × Adultos)
Residuos en pila = INTEG(separación + aporte Corabastos − compostaje, 0)
Compost = INTEG(0,4 × compostaje − uso y excedente, 0)
Área cultivada = INTEG(habilitación − abandono de bancales, 1.500 m²)
Árboles = INTEG(siembra − mortalidad y tala, 3.250)

incorporación = MAX(0, Potencial − Participación) × Convocatoria/365 × (0,15 + 0,85 × Red social) × efecto cosecha × (0,6 + 0,4 × calidad ambiental)
abandono = Participación / (2,5 × 365) × (1,5 − 0,6 × Gobernanza − 0,3 × Formación) × (1,25 − 0,5 × liderazgo distribuido)
liderazgo distribuido = MIN(1, personas que han sido vocería / 60)
personas que han sido vocería = SI(líder único, 6, MIN(6 × periodos, MAX(6, 0,25 × Participación)))
separación = 40.320 × 0,8 kg × 0,51 × Meta × MIN(1, Participación/Potencial) × (0,35 + 0,65 × Reciclaje) × (0,5 + 0,5 × Red económica)
aporte Corabastos = Aporte × Corabastos activo × (0,4 + 0,6 × Red económica)
compostaje = MIN(Residuos / 60 días, Capacidad × (0,3 + 0,7 × Reciclaje))
uso y excedente = MIN(Compost/20, Área × 3 kg/m²/año) + MAX(0, Compost − 80)/30
habilitación = MAX(0, MIN(Área máxima, Participación × 45 m²) − Área) / 180 × (0,4 + 0,6 × suficiencia de compost)
cosecha = Área × Rendimiento / 365 × (0,55 + 0,45 × suficiencia) · autoabastecimiento = cosecha / (40.320 × 0,2 kg)
siembra = 1,2 × Siembra(red) × (0,5 + 0,5 × suficiencia) × (0,3 + 0,7 × MIN(1, Participación/Potencial))
mortalidad y tala = Árboles × (0,02 + 0,5 × Presión × (1 − 0,6 × Red ecológica)) / 365

Red social, económica, ecológica = vínculos directos activos de esa dimensión / vínculos totales (data3d/red_georef_actores.json)
Paso: 1 día · Horizonte: 3.650 días · Integración: Euler. Los coeficientes de comportamiento son supuestos para discutir.`;
}
