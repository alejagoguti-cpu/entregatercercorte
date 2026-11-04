/* ============ SIMULADOR TIPO GOD'S EYE sobre la Maqueta 3D de Kennedy ============
   Interfaz y sensores inspirados en God's Eye View (github.com/bilawalsidhu/gods-eye-view, licencia MIT, (c) 2026 Bilawal Sidhu):
   - HUD táctico en las esquinas (REC, hora UTC, coordenadas del punto mirado, GSD, altitud, rumbo, ángulo fuera del nadir)
   - sensores en post-proceso: NORMAL, CRT, NVG (visión nocturna) y FLIR (térmico, blanco caliente o ironbow)
   - detección: recuadros con ID sobre los carros de la simulación de tráfico y los peatones cercanos
   - clic sobre un carro (o en la lista de contactos) para seguirlo: la cámara lo acompaña y deja estela
   - panel de tráfico: hora simulada, pausa, velocidad x1-x10, línea de tiempo, vehículos activos, velocidad media y detenidos
   Recibe del index: T3, TRAF, PEAT, PAJARO, la conversión mundo -> lat/lng y los sectores (POIS). */

const CSS = `
:root{--g-bg:rgba(12,12,20,.72);--g-bd:rgba(255,255,255,.09);--g-bd2:rgba(0,212,255,.38);--g-ac:#00d4ff;--g-acd:rgba(0,212,255,.14);
  --g-tx:#e8eaed;--g-tx2:rgba(232,234,237,.58);--g-tx3:rgba(232,234,237,.34);--g-amb:#ffb020;--g-ok:#9cff57;--g-red:#ff3b3b;
  --g-mono:'JetBrains Mono','SF Mono','Fira Code',ui-monospace,monospace}
#gev,#gevUI,#gevDet,#gevTog{display:none}
body.sim #gev,body.sim #gevDet{display:block}
body.sim #gevUI{display:flex}
body.sim #cvMarca{display:none!important}
body.sim #cvMini{top:30px}
#gevDet{position:fixed;inset:0;width:100%;height:100%;z-index:6;pointer-events:none}
#gev{position:fixed;inset:0;z-index:7;pointer-events:none;font:11px/1.45 var(--g-mono);color:var(--g-tx);letter-spacing:.06em;text-shadow:0 0 6px rgba(0,212,255,.28),0 1px 2px rgba(0,0,0,.8)}
#gev .g-top{position:absolute;left:0;right:0;top:0;height:20px;display:flex;justify-content:space-between;align-items:center;padding:0 14px;font-size:10px;letter-spacing:.16em;color:var(--g-tx2);background:linear-gradient(rgba(5,6,10,.7),rgba(5,6,10,0));text-transform:uppercase}
#gev .g-c{position:absolute;display:flex;gap:8px}
#gev .g-c i{font-style:normal;color:var(--g-ac);font-size:22px;line-height:.8;opacity:.8}
#gev .g-tl{left:16px;top:28px}
#gev .g-tr{right:16px;top:28px;text-align:right}
#gev .g-bl{left:16px;bottom:96px;align-items:flex-end}
#gev .g-brc{right:16px;bottom:96px;text-align:right;align-items:flex-end}
#gev .g-cls{color:var(--g-amb);font-weight:700;letter-spacing:.14em}
#gev .g-sys{color:var(--g-tx2)}
#gev .g-mode{margin-top:4px;font-size:20px;font-weight:700;letter-spacing:.22em;color:var(--g-ac)}
#gev .g-sumL{margin-top:6px;font-size:9.5px;color:var(--g-tx3);letter-spacing:.2em}
#gev .g-sum{max-width:300px;color:var(--g-tx2)}
#gev .g-rec b{color:var(--g-red)}
#gev .g-edge{position:absolute;top:50%;transform:translateY(-50%);font-size:10px;color:var(--g-tx3);letter-spacing:.14em}
#gev .g-el{left:16px;top:68%}#gev .g-er{display:none}
body.sim #hud-c button{font-family:var(--g-mono);font-size:11px;letter-spacing:.2em;color:var(--g-tx);background:var(--g-bg);box-shadow:inset 0 0 0 1px var(--g-bd2)}
body.sim #hud-c button:hover{background:rgba(0,40,56,.85);color:#fff}
body.sim #hud-c #b-todo.on{color:var(--g-ac);background:var(--g-bg);box-shadow:inset 0 0 0 1px var(--g-ac)}
body.sim #hud-c #b-pajaro{color:#031018;background:var(--g-ac);box-shadow:none}
#gev .g-ret{position:absolute;left:50%;top:50%;width:84px;height:84px;transform:translate(-50%,-50%)}
#gev .g-ret::before,#gev .g-ret::after{content:'';position:absolute;background:var(--g-ac);opacity:.55}
#gev .g-ret::before{left:50%;top:0;bottom:0;width:1px;-webkit-mask:linear-gradient(#000 0 34%,transparent 34% 66%,#000 66%);mask:linear-gradient(#000 0 34%,transparent 34% 66%,#000 66%)}
#gev .g-ret::after{top:50%;left:0;right:0;height:1px;-webkit-mask:linear-gradient(90deg,#000 0 34%,transparent 34% 66%,#000 66%);mask:linear-gradient(90deg,#000 0 34%,transparent 34% 66%,#000 66%)}
#gev .g-ret span{position:absolute;width:12px;height:12px;border:1px solid var(--g-ac);opacity:.7}
#gev .g-ret span:nth-child(1){left:0;top:0;border-width:1px 0 0 1px}#gev .g-ret span:nth-child(2){right:0;top:0;border-width:1px 1px 0 0}
#gev .g-ret span:nth-child(3){left:0;bottom:0;border-width:0 0 1px 1px}#gev .g-ret span:nth-child(4){right:0;bottom:0;border-width:0 1px 1px 0}
#gevUI{position:fixed;inset:0;z-index:11;pointer-events:none;justify-content:space-between;align-items:flex-start;padding:0 16px;font:11px/1.4 var(--g-mono);color:var(--g-tx);letter-spacing:.04em}
.g-col{pointer-events:none;display:flex;flex-direction:column;gap:8px;width:244px;max-height:calc(100vh - 230px);overflow:auto;scrollbar-width:none}
.g-col::-webkit-scrollbar{display:none}
.g-left{margin-top:178px}.g-right{margin-top:78px}
.g-pan{pointer-events:auto;background:var(--g-bg);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--g-bd);border-radius:10px;padding:10px 11px}
.g-pan h3{display:flex;justify-content:space-between;align-items:center;margin:0 0 8px;font-size:9.5px;font-weight:700;letter-spacing:.22em;color:var(--g-tx2)}
.g-pan h3 em{font-style:normal;color:var(--g-ac);letter-spacing:.08em}
#gevUI button{font:inherit;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--g-tx2);background:rgba(255,255,255,.035);border:1px solid var(--g-bd);border-radius:6px;padding:6px 7px;cursor:pointer;clip-path:none;box-shadow:none;transition:background .15s,color .15s,border-color .15s;white-space:nowrap}
#gevUI button:hover{color:var(--g-tx);border-color:var(--g-bd2);background:var(--g-acd)}
#gevUI button.on{color:#031018;background:var(--g-ac);border-color:var(--g-ac)}
.g-seg{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.g-row{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:5px}
.g-kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:10.5px}
.g-kv span{color:var(--g-tx3);letter-spacing:.12em}
.g-kv b{font-weight:500;text-align:right;font-variant-numeric:tabular-nums;color:var(--g-tx)}
.g-clock{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px}
.g-clock b{font-size:20px;font-weight:600;letter-spacing:.06em;font-variant-numeric:tabular-nums}
.g-clock small{color:var(--g-tx3);font-size:9.5px;letter-spacing:.16em}
.g-vel{display:grid;grid-template-columns:auto repeat(4,1fr);gap:4px;margin-bottom:6px}
#g-time{width:100%;margin:2px 0 8px;accent-color:var(--g-ac);cursor:pointer;height:16px}
#g-spark{display:block;width:100%;height:34px;margin-top:7px;border-top:1px solid var(--g-bd)}
.g-list{display:flex;flex-direction:column;gap:3px}
#gevUI .g-it{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;text-align:left;text-transform:none;letter-spacing:.04em;font-weight:500;font-size:10.5px;color:var(--g-tx);padding:5px 7px}
.g-it i{width:6px;height:6px;border-radius:1px;background:var(--g-ac);box-shadow:0 0 6px var(--g-ac)}
.g-it small{color:var(--g-tx3);font-size:10px}
.g-empty{color:var(--g-tx3);font-size:10.5px}
#g-trk{border-color:rgba(255,176,32,.55)}
#g-trk h3 em{color:var(--g-amb)}
#gevUI #g-rel{width:100%;margin-top:8px}
#g-pal{display:none}
#gevUI.flir #g-pal{display:block}
#gevTog{position:fixed;right:12px;top:26px;z-index:12;font:700 10px var(--g-mono);letter-spacing:.16em;color:var(--g-tx);background:var(--g-bg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid var(--g-bd2);border-radius:8px;padding:8px 11px;clip-path:none}
#gevTog.on{background:var(--g-ac);color:#031018}
@media(max-width:1100px){#gev .g-edge{display:none}}
@media(max-width:820px){
  #gev .g-top span:first-child,#gev .g-top span:last-child{display:none}#gev .g-top{justify-content:center}
  #gev .g-tl{left:12px;top:24px}#gev .g-tr{right:12px;top:24px}
  #gev .g-sys,#gev .g-sumL,#gev .g-sum,#gev .g-orb,#gev .g-c i{display:none}
  #gev .g-mode{font-size:15px;margin-top:2px}
  #gev .g-cls{display:none}
  #gev .g-tr{font-size:10px}
  #gev .g-bl,#gev .g-brc{bottom:max(80px,calc(env(safe-area-inset-bottom) + 70px));font-size:9.5px}
  #gev .g-bl{left:12px}#gev .g-brc{right:12px}
  #gev .g-ret{width:60px;height:60px}
  body.sim #gevTog{display:block}
  #gevTog{top:66px}
  body.sim #gevUI{display:none}
  body.sim.gev-open #gevUI{display:block;position:fixed;inset:auto 8px max(76px,calc(env(safe-area-inset-bottom) + 66px)) 8px;max-height:56vh;overflow:auto;padding:0;-webkit-overflow-scrolling:touch}
  body.sim.gev-open #gev .g-bl,body.sim.gev-open #gev .g-brc{display:none}
  .g-col{width:auto;max-height:none;overflow:visible;margin:0!important;gap:6px}
  .g-right{margin-top:6px!important}
  #gevUI button{padding:9px 6px}
}`;

const HTML = `
<div id="gev" aria-hidden="true">
  <div class="g-top"><span>Simulación // fuentes abiertas // Kennedy-BOG</span><span id="g-mis">KEN-0428 · EO/IR-1</span><span>REN3D · God's Eye</span></div>
  <div class="g-c g-tl"><i>┌</i><div><div class="g-cls">SIMULACIÓN · SIN CLASIFICAR</div><div class="g-sys">KH-REN3D  SENSOR EO/IR-1</div><div class="g-mode" id="g-mode">NORMAL</div><div class="g-sumL">RESUMEN</div><div class="g-sum" id="g-sum">Esperando telemetría…</div></div></div>
  <div class="g-c g-tr"><div><div class="g-rec"><b id="g-dot">●</b> REC <span id="g-ts">--</span></div><div class="g-orb" id="g-orb">ORB 4721  PASS DESC-12</div></div><i>┐</i></div>
  <div class="g-c g-bl"><i>└</i><div><div id="g-grid">SECTOR --</div><div id="g-ll">--°--'--"N  --°--'--"W</div></div></div>
  <div class="g-c g-brc"><div><div id="g-gsd">GSD --m</div><div id="g-alt">ALT --m  RUMBO --°</div></div><i>┘</i></div>
  <div class="g-edge g-el"><div id="g-coll">COLL --:--:--Z</div><div id="g-ona">ONA --°</div></div>
  <div class="g-edge g-er"><div>BANDA: PAN</div><div>BITS: 11</div><div>NIVEL: 1A</div></div>
  <div class="g-ret"><span></span><span></span><span></span><span></span></div>
</div>
<canvas id="gevDet"></canvas>
<button id="gevTog" type="button" aria-expanded="false">PANEL</button>
<div id="gevUI">
  <section class="g-col g-left">
    <div class="g-pan"><h3>VISTA</h3>
      <div class="g-seg" id="g-vista" style="grid-template-columns:repeat(3,1fr)"><button data-vista="umbra">Umbra</button><button data-vista="google">Google 3D</button><button data-vista="maqueta">Maqueta</button></div>
    </div>
    <div class="g-pan"><h3>SENSOR <em id="g-keys">1-4</em></h3>
      <div class="g-seg" id="g-sens"><button data-m="0" class="on">Normal</button><button data-m="1">CRT</button><button data-m="2">NVG</button><button data-m="3">FLIR</button></div>
      <div class="g-row"><button id="g-pal" style="grid-column:1/3">Paleta: blanco caliente</button></div>
      <div class="g-row"><button id="g-det">Detección</button><button id="g-lbl" class="on">Etiquetas</button></div>
      <div class="g-row"><button id="g-cen">Cenital</button><button id="g-obl">Oblicua</button></div>
    </div>
  </section>
  <section class="g-col g-right">
    <div class="g-pan" id="g-trk" hidden><h3>SEGUIMIENTO <em id="g-tid">--</em></h3>
      <div class="g-kv"><span>VEL</span><b id="g-tv">--</b><span>RUMBO</span><b id="g-th">--</b><span>POS</span><b id="g-tp">--</b><span>T+</span><b id="g-tt">--</b><span>RECORRIDO</span><b id="g-td">--</b></div>
      <button id="g-rel" type="button">Soltar (Esc)</button>
    </div>
    <div class="g-pan"><h3>TRÁFICO SIM <em id="g-st">--</em></h3>
      <div class="g-clock"><b id="g-hora">--:--:--</b><small>HORA SIMULADA</small></div>
      <div class="g-vel" id="g-vel"><button id="g-play" aria-label="Pausar simulación">❚❚</button><button data-v="1" class="on">x1</button><button data-v="2">x2</button><button data-v="5">x5</button><button data-v="10">x10</button></div>
      <input id="g-time" type="range" min="0" max="1499" step="1" value="1000" aria-label="Tiempo de la simulación de tráfico">
      <div class="g-kv"><span>ACTIVOS</span><b id="g-na">--</b><span>VEL MEDIA</span><b id="g-vm">--</b><span>DETENIDOS</span><b id="g-dt">--</b><span>EN VISTA</span><b id="g-nv">--</b><span>PEATONES</span><b id="g-np">--</b></div>
      <canvas id="g-spark" width="440" height="68"></canvas>
    </div>
    <div class="g-pan"><h3>CONTACTOS <em>500 m</em></h3><div class="g-list" id="g-con"><div class="g-empty">Sin contactos</div></div></div>
  </section>
</div>`;

const FRAG = /* glsl */ `
uniform sampler2D tD; uniform vec2 uRes; uniform float uTime; uniform int uMode; uniform float uPal;
uniform vec4 uHot[48]; uniform int uNHot;
varying vec2 vUv;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
vec3 src(vec2 uv){ vec3 c = toneMapping(texture2D(tD, uv).rgb); return clamp(linearToOutputTexel(vec4(c, 1.0)).rgb, 0.0, 1.0); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 ironbow(float t){ // negro -> morado -> magenta -> rojo -> naranja -> amarillo -> blanco
  float s = clamp(t, 0.0, 1.0) * 6.0;
  if (s < 1.0) return mix(vec3(0.0), vec3(0.13, 0.0, 0.30), s);
  if (s < 2.0) return mix(vec3(0.13, 0.0, 0.30), vec3(0.49, 0.0, 0.45), s - 1.0);
  if (s < 3.0) return mix(vec3(0.49, 0.0, 0.45), vec3(0.86, 0.10, 0.18), s - 2.0);
  if (s < 4.0) return mix(vec3(0.86, 0.10, 0.18), vec3(1.0, 0.55, 0.0), s - 3.0);
  if (s < 5.0) return mix(vec3(1.0, 0.55, 0.0), vec3(1.0, 0.91, 0.32), s - 4.0);
  return mix(vec3(1.0, 0.91, 0.32), vec3(1.0), s - 5.0);
}
float calor(vec2 uv){ // motores y cuerpos: manchas calientes en la posición de cada carro y peatón detectado
  float h = 0.0;
  for (int i = 0; i < 48; i++) { if (i >= uNHot) break; vec4 q = uHot[i]; vec2 d = (uv - q.xy) / q.zw; h = max(h, exp(-dot(d, d) * 2.4)); }
  return h;
}
void main(){
  vec2 uv = vUv, px = 1.0 / uRes; vec3 c;
  if (uMode == 1) { // CRT: curvatura, aberración, líneas de barrido y máscara de fósforo
    vec2 cc = uv * 2.0 - 1.0; cc *= 1.0 + dot(cc, cc) * 0.035; vec2 u = cc * 0.5 + 0.5;
    if (u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float ab = 0.0012 + 0.0016 * dot(cc, cc);
    c = vec3(src(u + vec2(ab, 0.0)).r, src(u).g, src(u - vec2(ab, 0.0)).b);
    c = mix(vec3(lum(c)), c, 0.8) * vec3(0.94, 1.04, 0.98);
    float sl = 0.78 + 0.22 * sin(gl_FragCoord.y * 3.14159 * 0.5);
    float m = mod(gl_FragCoord.x, 3.0);
    vec3 mk = m < 1.0 ? vec3(1.0, 0.84, 0.84) : (m < 2.0 ? vec3(0.84, 1.0, 0.84) : vec3(0.84, 0.84, 1.0));
    c *= sl * mk * 1.16;
    c *= 1.0 - 0.05 * smoothstep(0.0, 0.02, abs(fract(u.y * 0.5 - uTime * 0.08) - 0.5) - 0.48); // banda que rueda
    c += (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.05;
    c *= smoothstep(1.3, 0.55, length(cc));
  } else if (uMode == 2) { // NVG: intensificador de imagen, fósforo verde P43, centelleo y tubo circular
    vec2 u = (floor(uv * uRes / 2.0) * 2.0 + 1.0) / uRes;
    float l = lum(src(u)), b = 0.0;
    for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; b += lum(src(u + vec2(cos(a), sin(a)) * px * 7.0)); }
    b /= 8.0;
    l = pow(clamp(l * 1.5 + 0.06, 0.0, 2.0), 0.72) + max(b - 0.5, 0.0) * 1.3;
    l += (hash(gl_FragCoord.xy + fract(uTime * 13.0) * 400.0) - 0.5) * 0.16;
    if (hash(floor(gl_FragCoord.xy / 2.0) + floor(uTime * 30.0)) > 0.9986) l += 0.7;
    c = vec3(0.30, 1.0, 0.42) * l * 0.92;
    c = mix(c, vec3(0.86, 1.0, 0.86), smoothstep(0.9, 1.4, l) * 0.6);
    vec2 a = (uv - 0.5) * uRes / min(uRes.x, uRes.y);
    c *= smoothstep(0.92, 0.42, length(a));
  } else { // FLIR blanco caliente (o ironbow): cielo, agua y vegetación fríos; asfalto, techos y motores calientes
    vec2 u = (floor(uv * uRes / 1.5) * 1.5 + 0.75) / uRes;
    vec3 s = src(u);
    float frio = smoothstep(0.02, 0.22, s.b - s.r) * 0.85 + smoothstep(0.0, 0.14, s.g - s.r) * 0.3;
    float t = lum(s) * (1.0 - frio) * 0.85;
    float e = abs(lum(src(u + vec2(px.x * 1.5, 0.0))) - lum(src(u - vec2(px.x * 1.5, 0.0)))) + abs(lum(src(u + vec2(0.0, px.y * 1.5))) - lum(src(u - vec2(0.0, px.y * 1.5))));
    t += e * 0.6 + 0.06;
    t = mix(t, 1.05, calor(uv));
    t += (vnoise(uv * uRes * 0.35 + uTime * 3.0) - 0.5) * 0.05 + (hash(gl_FragCoord.xy + fract(uTime) * 57.0) - 0.5) * 0.04;
    t = clamp((t - 0.1) * 1.3, 0.0, 1.0);
    c = uPal > 0.5 ? ironbow(t) : vec3(t);
    c *= smoothstep(1.35, 0.6, length(uv * 2.0 - 1.0));
  }
  gl_FragColor = vec4(c, 1.0);
}`;

const MODOS = ['NORMAL', 'CRT', 'NVG', 'FLIR'];
const HORA0 = 16 * 3600 + 40 * 60 - 1000; // el tráfico arranca en t = 1000 s a las 16:40

export function crearSimulador(ctx) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const fnt = document.createElement('link'); fnt.rel = 'stylesheet'; fnt.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap'; document.head.appendChild(fnt);
  document.body.insertAdjacentHTML('beforeend', HTML);
  const $ = (id) => document.getElementById(id);
  const ui = $('gevUI'), det = $('gevDet'), g2 = det.getContext('2d');
  const S = { modo: 0, pal: 0, det: false, lbl: true, track: null, proy: [], hist: [], spark: [], tSpark: 0, tLista: 0, tHud: 0, rec: 0, quad: null };
  const pad = (n, k = 2) => String(Math.floor(n)).padStart(k, '0');
  const hms = (s) => { s = ((Math.floor(s) % 86400) + 86400) % 86400; return pad(s / 3600) + ':' + pad(s / 60 % 60) + ':' + pad(s % 60); };
  const dms = (v, p, n) => { const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = ((a - d) * 60 - m) * 60; return d + '°' + pad(m) + "'" + s.toFixed(1).padStart(4, '0') + '"' + (v >= 0 ? p : n); };
  const tag = (id) => 'VH-' + pad(id % 10000, 4);

  /* ---------- sensores (post-proceso) ---------- */
  function crearQuad(T3) {
    const THREE = T3.THREE, r = T3.renderer, sz = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(sz.x, sz.y, { type: THREE.HalfFloatType, samples: ctx.movil ? 0 : 4 });
    const hot = []; for (let i = 0; i < 48; i++) hot.push(new THREE.Vector4());
    const U = { tD: { value: rt.texture }, uRes: { value: sz.clone() }, uTime: { value: 0 }, uMode: { value: 0 }, uPal: { value: 0 }, uHot: { value: hot }, uNHot: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ uniforms: U, depthTest: false, depthWrite: false, fragmentShader: FRAG,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }' });
    const esc = new THREE.Scene(), m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); m.frustumCulled = false; esc.add(m);
    S.quad = { rt, U, esc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sz };
  }
  function ajustarQuad() {
    const T3 = ctx.T3(); if (!S.quad || !T3) return;
    T3.renderer.getDrawingBufferSize(S.quad.sz); S.quad.rt.setSize(S.quad.sz.x, S.quad.sz.y); S.quad.U.uRes.value.copy(S.quad.sz);
  }
  function render(cam) { // true si el sensor dibujó el cuadro; en NORMAL dibuja el index como siempre
    const T3 = ctx.T3(); if (!S.modo || !T3) return false;
    if (!S.quad) crearQuad(T3);
    const r = T3.renderer, q = S.quad;
    q.U.uTime.value = performance.now() / 1000; q.U.uMode.value = S.modo; q.U.uPal.value = S.pal;
    r.setRenderTarget(q.rt); r.render(T3.scene, cam);
    r.setRenderTarget(null); r.render(q.esc, q.cam);
    return true;
  }
  function setModo(m) {
    S.modo = m; ui.classList.toggle('flir', m === 3);
    document.querySelectorAll('#g-sens button').forEach(b => b.classList.toggle('on', +b.dataset.m === m));
    $('g-mode').textContent = MODOS[m] + (m === 3 ? (S.pal ? ' · IRONBOW' : ' · WHOT') : '');
    $('grade').style.display = m ? 'none' : '';
  }
  document.querySelectorAll('#g-sens button').forEach(b => b.onclick = () => setModo(+b.dataset.m));
  { // vista: Umbra (edificios y árboles propios sobre la foto), Google 3D (solo la malla, como God's Eye) o la maqueta propia
    const q = new URLSearchParams(location.search), actual = q.get('maqueta') === '1' ? 'maqueta' : q.get('vista') === 'google' ? 'google' : 'umbra';
    document.querySelectorAll('#g-vista button').forEach(b => {
      b.classList.toggle('on', b.dataset.vista === actual);
      b.onclick = () => { if (b.dataset.vista === actual) return; const u = new URL(location.href); u.searchParams.delete('maqueta'); u.searchParams.delete('vista');
        if (b.dataset.vista === 'maqueta') u.searchParams.set('maqueta', '1'); if (b.dataset.vista === 'google') u.searchParams.set('vista', 'google'); location.href = u.toString(); };
    });
  }
  $('g-pal').onclick = (e) => { S.pal = S.pal ? 0 : 1; e.currentTarget.textContent = 'Paleta: ' + (S.pal ? 'ironbow' : 'blanco caliente'); setModo(S.modo); };
  $('g-det').onclick = (e) => { S.det = !S.det; e.currentTarget.classList.toggle('on', S.det); };
  $('g-lbl').onclick = (e) => { S.lbl = !S.lbl; e.currentTarget.classList.toggle('on', S.lbl); };

  /* ---------- cámara: cenital / oblicua (manteniendo el punto mirado) ---------- */
  function inclinar(cenital) {
    const T3 = ctx.T3(); if (!T3) return;
    const c = T3.camera.position, t = T3.orbit.target, d = Math.max(60, c.distanceTo(t));
    const p1 = t.clone();
    if (cenital) p1.y += d; else { const h = new T3.THREE.Vector3(c.x - t.x, 0, c.z - t.z); if (h.lengthSq() < 1) h.set(0, 0, 1); h.normalize(); p1.addScaledVector(h, d * Math.cos(0.61)); p1.y += d * Math.sin(0.61); }
    if (cenital) p1.z += 0.01; // las órbitas no admiten mirar justo hacia abajo
    T3.anim = { t: 0, dur: 1.4, p0: c.clone(), p1, c0: t.clone(), c1: t.clone() };
  }
  $('g-cen').onclick = () => inclinar(true);
  $('g-obl').onclick = () => inclinar(false);

  /* ---------- tráfico: reproducción, velocidad, línea de tiempo ---------- */
  const play = $('g-play'), tl = $('g-time');
  const pintarPlay = () => { const tr = ctx.traf(), on = !!(tr && tr.playing); play.textContent = on ? '❚❚' : '▶'; play.classList.toggle('on', !on); play.setAttribute('aria-label', on ? 'Pausar simulación' : 'Reproducir simulación'); };
  play.onclick = () => { const tr = ctx.traf(); if (!tr) { ctx.say('Cargando las trayectorias de los carros…'); return; } tr.playing = !tr.playing; pintarPlay(); };
  document.querySelectorAll('#g-vel [data-v]').forEach(b => b.onclick = () => {
    const tr = ctx.traf(); if (!tr) return;
    tr.vel = +b.dataset.v; tr.playing = true; pintarPlay();
    document.querySelectorAll('#g-vel [data-v]').forEach(x => x.classList.toggle('on', x === b));
  });
  tl.oninput = () => { const tr = ctx.traf(); if (!tr) return; tr.t = +tl.value; S.spark.length = 0; if (S.track) S.track.ultimo = null; };

  /* ---------- seguimiento ---------- */
  function seguir(id) {
    const tr = ctx.traf(), T3 = ctx.T3(); if (!tr || !tr.vis || !T3) return;
    const V = tr.vis; let i = -1; for (let k = 0; k < V.n; k++) if (V.id[k] === id) { i = k; break; }
    if (i < 0) return;
    S.track = { id, t0: performance.now(), dist: 0, ultimo: [V.x[i], V.z[i]] }; S.hist = [];
    const c = T3.camera.position, t = T3.orbit.target, d = Math.min(Math.max(c.distanceTo(t), 90), 260);
    const h = new T3.THREE.Vector3(c.x - t.x, 0, c.z - t.z); if (h.lengthSq() < 1) h.set(0, 0, 1); h.normalize();
    const c1 = new T3.THREE.Vector3(V.x[i], 1, V.z[i]), p1 = c1.clone().addScaledVector(h, d * 0.7); p1.y = d * 0.72;
    T3.anim = { t: 0, dur: 1.2, p0: c.clone(), p1, c0: t.clone(), c1 };
    $('g-trk').hidden = false; $('g-tid').textContent = tag(id);
    ctx.say('Siguiendo ' + tag(id));
  }
  function soltar(msg) { if (!S.track) return; S.track = null; S.hist = []; $('g-trk').hidden = true; if (msg) ctx.say(msg); }
  $('g-rel').onclick = () => soltar('Seguimiento terminado');
  $('g-con').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) seguir(+b.dataset.id); };
  addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('sim') || /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
    if (e.key >= '1' && e.key <= '4') setModo(+e.key - 1);
    if (e.key === 'Escape') soltar('Seguimiento terminado');
  });
  const tog = $('gevTog');
  tog.onclick = () => { const on = document.body.classList.toggle('gev-open'); tog.classList.toggle('on', on); tog.setAttribute('aria-expanded', on); };

  // clic (sin arrastrar) sobre un recuadro: se sigue ese carro
  let pd = null;
  function enlazarClic(cv) {
    cv.addEventListener('pointerdown', (e) => { pd = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    cv.addEventListener('pointerup', (e) => {
      if (!pd || Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 6 || performance.now() - pd.t > 450) return;
      let best = null, bd = (ctx.movil ? 34 : 24) ** 2;
      for (const p of S.proy) { if (p.peat) continue; const d = (p.sx - e.clientX) ** 2 + (p.sy - e.clientY) ** 2; if (d < bd) { bd = d; best = p; } }
      if (best) seguir(best.id);
    });
  }

  /* ---------- cada cuadro ---------- */
  const v3 = { x: 0, y: 0, z: 0 };
  let tmp = null;
  function proyectar(cam, x, y, z, W, H) {
    tmp.set(x, y, z).project(cam);
    if (tmp.z > 1 || tmp.z < -1 || tmp.x < -1.08 || tmp.x > 1.08 || tmp.y < -1.08 || tmp.y > 1.08) return null;
    v3.x = (tmp.x + 1) * W / 2; v3.y = (1 - tmp.y) * H / 2; return v3;
  }
  function update(dt) {
    const T3 = ctx.T3(), pj = ctx.pajaro();
    const visible = !!T3 && T3.ready && !(pj && pj.activo) && document.getElementById('loader').classList.contains('hidden');
    document.body.classList.toggle('sim', visible);
    if (!visible) return;
    if (!tmp) { tmp = new T3.THREE.Vector3(); enlazarClic(T3.renderer.domElement); addEventListener('resize', ajustarQuad); }
    const tr = ctx.traf(), V = tr && tr.vis, cam = T3.camera;

    // seguimiento: la cámara acompaña al carro (sin pelear con las animaciones de vuelo)
    let ti = -1;
    if (S.track) {
      if (V) for (let k = 0; k < V.n; k++) if (V.id[k] === S.track.id) { ti = k; break; }
      if (ti < 0) soltar('Contacto ' + tag(S.track.id) + ' perdido: salió de la simulación');
      else {
        const x = V.x[ti], z = V.z[ti], u = S.track.ultimo;
        if (u) { const dd = Math.hypot(x - u[0], z - u[1]); if (dd < 60) S.track.dist += dd; }
        S.track.ultimo = [x, z];
        if (!T3.anim) {
          const t = T3.orbit.target, k = Math.min(1, dt * 4), dx = (x - t.x) * k, dz = (z - t.z) * k;
          t.x += dx; t.z += dz; cam.position.x += dx; cam.position.z += dz;
        }
        const hl = S.hist[S.hist.length - 1];
        if (!hl || Math.hypot(hl[0] - x, hl[1] - z) > 3) { S.hist.push([x, z]); if (S.hist.length > 80) S.hist.shift(); }
      }
    }
    cam.updateMatrixWorld();

    // detección: recuadros sobre carros y peatones visibles
    const dpr = Math.min(devicePixelRatio || 1, 1.5), W = innerWidth, H = innerHeight;
    if (det.width !== Math.round(W * dpr) || det.height !== Math.round(H * dpr)) { det.width = Math.round(W * dpr); det.height = Math.round(H * dpr); }
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, H);
    const foco = H / (2 * Math.tan(cam.fov * Math.PI / 360)), cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    const MAXD = ctx.movil ? 800 : 1600, MAXB = ctx.movil ? 140 : 420, proy = S.proy; proy.length = 0;
    let enVista = 0;
    if (V) for (let i = 0; i < V.n; i++) {
      const dx = V.x[i] - cx, dz = V.z[i] - cz, d2 = dx * dx + dz * dz + cy * cy;
      if (d2 > MAXD * MAXD) continue;
      const p = proyectar(cam, V.x[i], 1.4, V.z[i], W, H); if (!p) continue;
      enVista++;
      proy.push({ id: V.id[i], sx: p.x, sy: p.y, r: Math.max(5, 3.4 * foco / Math.sqrt(d2)), d2, v: V.v[i], i });
    }
    const PE = ctx.peat();
    if (PE && PE.vx) for (let i = 0; i < PE.vn; i++) {
      const dx = PE.vx[i] - cx, dz = PE.vz[i] - cz, d2 = dx * dx + dz * dz + cy * cy;
      if (d2 > 400 * 400) continue;
      const p = proyectar(cam, PE.vx[i], 0.9, PE.vz[i], W, H); if (!p) continue;
      proy.push({ peat: true, sx: p.x, sy: p.y, r: Math.max(3, 1.1 * foco / Math.sqrt(d2)), d2 });
    }
    proy.sort((a, b) => a.d2 - b.d2);
    if (S.det) {
      const ac = S.modo === 2 ? '#c8ffd0' : '#00d4ff', pc = S.modo === 2 ? '#c8ffd0' : '#9cff57';
      g2.lineWidth = 1.2; g2.font = '600 10px "JetBrains Mono",ui-monospace,monospace'; g2.textBaseline = 'bottom';
      let nl = 0; const NL = ctx.movil ? 5 : 10;
      for (let k = 0; k < proy.length && k < MAXB; k++) {
        const p = proy[k]; if (!p.peat && S.track && p.id === S.track.id) continue;
        const r = p.r, l = Math.max(3, r * 0.42);
        g2.strokeStyle = p.peat ? pc : ac; g2.globalAlpha = p.peat ? 0.8 : 0.9;
        g2.beginPath(); // esquinas del recuadro
        g2.moveTo(p.sx - r, p.sy - r + l); g2.lineTo(p.sx - r, p.sy - r); g2.lineTo(p.sx - r + l, p.sy - r);
        g2.moveTo(p.sx + r - l, p.sy - r); g2.lineTo(p.sx + r, p.sy - r); g2.lineTo(p.sx + r, p.sy - r + l);
        g2.moveTo(p.sx - r, p.sy + r - l); g2.lineTo(p.sx - r, p.sy + r); g2.lineTo(p.sx - r + l, p.sy + r);
        g2.moveTo(p.sx + r - l, p.sy + r); g2.lineTo(p.sx + r, p.sy + r); g2.lineTo(p.sx + r, p.sy + r - l);
        g2.stroke();
        if (S.lbl && !p.peat && nl < NL) { nl++; g2.fillStyle = ac; g2.globalAlpha = 0.95; g2.fillText(tag(p.id) + '  ' + Math.round(p.v * 3.6) + ' km/h', p.sx - r, p.sy - r - 3); }
      }
      g2.globalAlpha = 1;
    }
    if (S.track && ti >= 0) { // estela y retícula del carro seguido
      g2.strokeStyle = '#ffb020'; g2.lineWidth = 2;
      let prev = null;
      for (let k = 0; k < S.hist.length; k++) {
        const p = proyectar(cam, S.hist[k][0], 1.2, S.hist[k][1], W, H);
        if (p && prev) { g2.globalAlpha = 0.15 + 0.75 * k / S.hist.length; g2.beginPath(); g2.moveTo(prev[0], prev[1]); g2.lineTo(p.x, p.y); g2.stroke(); }
        prev = p ? [p.x, p.y] : null;
      }
      g2.globalAlpha = 1;
      const d2 = (V.x[ti] - cx) ** 2 + (V.z[ti] - cz) ** 2 + cy * cy, p = proyectar(cam, V.x[ti], 1.4, V.z[ti], W, H);
      if (p) {
        const r = Math.max(10, 4.2 * foco / Math.sqrt(d2));
        g2.lineWidth = 1.6; g2.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
        g2.beginPath(); g2.moveTo(p.x - r - 8, p.y); g2.lineTo(p.x - r, p.y); g2.moveTo(p.x + r, p.y); g2.lineTo(p.x + r + 8, p.y); g2.moveTo(p.x, p.y - r - 8); g2.lineTo(p.x, p.y - r); g2.moveTo(p.x, p.y + r); g2.lineTo(p.x, p.y + r + 8); g2.stroke();
        g2.fillStyle = '#ffb020'; g2.font = '700 11px "JetBrains Mono",ui-monospace,monospace'; g2.textBaseline = 'bottom';
        g2.fillText('◆ ' + tag(S.track.id) + '  ' + Math.round(V.v[ti] * 3.6) + ' km/h', p.x - r, p.y - r - 4);
      }
    }
    // FLIR: el calor de motores y cuerpos va al shader
    if (S.modo === 3 && S.quad) {
      const hot = S.quad.U.uHot.value; let n = 0;
      for (let k = 0; k < proy.length && n < 48; k++) { const p = proy[k], r = p.peat ? p.r * 0.8 : p.r * 1.05; hot[n++].set(p.sx / W, 1 - p.sy / H, r / W, r / H); }
      S.quad.U.uNHot.value = n;
    }

    // HUD de texto (4 veces por segundo)
    if ((S.tHud -= dt) <= 0) {
      S.tHud = 0.25;
      const now = new Date(), iso = now.toISOString();
      $('g-ts').textContent = iso.slice(0, 10) + ' ' + iso.slice(11, 19) + 'Z'; $('g-coll').textContent = 'COLL ' + iso.slice(11, 19) + 'Z';
      $('g-dot').style.visibility = (S.rec = 1 - S.rec) ? 'visible' : 'hidden';
      const t = T3.orbit.target, ll = ctx.mundoALL(t.x, t.z), dist = cam.position.distanceTo(t);
      $('g-ll').textContent = dms(ll[1], 'N', 'S') + '  ' + dms(ll[0], 'E', 'W');
      const gsd = dist * 2 * Math.tan(cam.fov * Math.PI / 360) / H;
      $('g-gsd').textContent = 'GSD ' + (gsd < 1 ? gsd.toFixed(2) : gsd.toFixed(1)) + 'm  NIIRS ' + Math.max(1, Math.min(9, 5.6 - Math.log2(gsd / 0.3))).toFixed(1);
      const rb = (Math.atan2(t.x - cam.position.x, -(t.z - cam.position.z)) * 180 / Math.PI + 360) % 360;
      $('g-alt').textContent = 'ALT ' + Math.round(cam.position.y + 2550) + 'm  RUMBO ' + pad(rb, 3) + '°';
      const ona = Math.acos(Math.min(1, Math.max(-1, (cam.position.y - t.y) / Math.max(dist, 1e-3)))) * 180 / Math.PI;
      $('g-ona').textContent = 'ONA ' + ona.toFixed(0) + '°';
      let sec = null, sd = 1e12; for (const s of ctx.sectores) { const d = (s.x - t.x) ** 2 + (s.z - t.z) ** 2; if (d < sd) { sd = d; sec = s; } }
      $('g-grid').textContent = 'SECTOR ' + (sec && sd < 1500 * 1500 ? sec.n.toUpperCase() : 'KENNEDY') + '  ' + (Math.round((t.x + 6000) / 100) + '-' + Math.round((t.z + 6000) / 100));
      let sumV = 0, par = 0;
      if (V) { for (let i = 0; i < V.n; i++) { sumV += V.v[i]; if (V.v[i] < 0.6) par++; } }
      const vm = V && V.n ? sumV / V.n * 3.6 : 0;
      $('g-na').textContent = V ? V.n.toLocaleString('es-CO') : '--';
      $('g-vm').textContent = V && V.n ? vm.toFixed(1) + ' km/h' : '--';
      $('g-dt').textContent = V && V.n ? Math.round(par / V.n * 100) + ' %' : '--';
      $('g-nv').textContent = V ? enVista.toLocaleString('es-CO') : '--';
      $('g-np').textContent = PE && PE.vn != null ? PE.vn.toLocaleString('es-CO') : '--';
      $('g-sum').textContent = (sec && sd < 1500 * 1500 ? sec.n : 'Kennedy') + ' · ' + (V ? V.n.toLocaleString('es-CO') + ' vehículos, ' + Math.round(vm) + ' km/h de media' : 'tráfico cargando') + (S.track ? ' · siguiendo ' + tag(S.track.id) : '');
      if (tr) {
        $('g-hora').textContent = hms(HORA0 + tr.t);
        tl.max = Math.floor(tr.dur); if (document.activeElement !== tl) tl.value = Math.floor(tr.t);
        $('g-st').textContent = tr.playing ? 'EN VIVO x' + (tr.vel || 1) : 'PAUSA';
        pintarPlay();
        if (V && V.n && tr.playing) { S.spark.push(vm); if (S.spark.length > 120) S.spark.shift(); }
        dibujarSpark();
      } else $('g-st').textContent = 'CARGANDO';
      if (S.track && ti >= 0) {
        const h = (Math.atan2(V.dx[ti], -V.dz[ti]) * 180 / Math.PI + 360) % 360, tll = ctx.mundoALL(V.x[ti], V.z[ti]), s = (performance.now() - S.track.t0) / 1000;
        $('g-tv').textContent = Math.round(V.v[ti] * 3.6) + ' km/h'; $('g-th').textContent = pad(h, 3) + '°';
        $('g-tp').textContent = tll[1].toFixed(5) + ', ' + tll[0].toFixed(5);
        $('g-tt').textContent = pad(s / 60) + ':' + pad(s % 60); $('g-td').textContent = Math.round(S.track.dist) + ' m';
      }
    }
    // contactos más cercanos al punto mirado (2 veces por segundo)
    if ((S.tLista -= dt) <= 0 && V) {
      S.tLista = 0.5;
      const t = T3.orbit.target, L = [];
      for (let i = 0; i < V.n; i++) { const d = Math.hypot(V.x[i] - t.x, V.z[i] - t.z); if (d < 500) L.push([d, i]); }
      L.sort((a, b) => a[0] - b[0]);
      const N = ctx.movil ? 5 : 8;
      $('g-con').innerHTML = L.length ? L.slice(0, N).map(([d, i]) => `<button class="g-it" data-id="${V.id[i]}"><i${V.v[i] < 0.6 ? ' style="background:#ffb020;box-shadow:0 0 6px #ffb020"' : ''}></i><span>${tag(V.id[i])} · ${Math.round(V.v[i] * 3.6)} km/h</span><small>${Math.round(d)} m</small></button>`).join('')
        : '<div class="g-empty">Sin vehículos a menos de 500 m del centro</div>';
    }
  }
  function dibujarSpark() {
    const c = $('g-spark'), g = c.getContext('2d'), w = c.width, h = c.height, a = S.spark;
    g.clearRect(0, 0, w, h); if (a.length < 2) return;
    let lo = Infinity, hi = -Infinity; for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
    g.beginPath();
    a.forEach((v, i) => { const x = i / 119 * w, y = h - 6 - (v - lo) / (hi - lo) * (h - 14); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = '#00d4ff'; g.lineWidth = 2; g.stroke();
    g.lineTo((a.length - 1) / 119 * w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = 'rgba(0,212,255,.12)'; g.fill();
    g.fillStyle = 'rgba(232,234,237,.45)'; g.font = '18px "JetBrains Mono",monospace'; g.fillText('VEL MEDIA', 4, 18);
  }
  // saltar de agente (panel CÁMARA de propuesta.js): el n-ésimo carro más cercano al punto mirado
  function seguirCercano(n) {
    const tr = ctx.traf(), T3 = ctx.T3(); if (!tr || !tr.vis || !T3 || !tr.vis.n) return false;
    const V = tr.vis, t = T3.orbit.target, L = [];
    for (let i = 0; i < V.n; i++) L.push([Math.hypot(V.x[i] - t.x, V.z[i] - t.z), V.id[i]]);
    L.sort((a, b) => a[0] - b[0]); seguir(L[(n || 0) % Math.min(25, L.length)][1]); return true;
  }
  return { update, render, setModo, seguirCercano, soltar: () => soltar(), siguiendo: () => !!S.track };
}
