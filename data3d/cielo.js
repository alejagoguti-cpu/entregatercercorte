/* ============ CIELO Y LUZ DE 24 HORAS (modo Kennedy) ============
   Sigue el reloj de la simulación (T3.reloj.t, minutos del día; data3d/giro_sim.js).
   Sol: posición real sobre Bogotá (latitud 4,63° N) con la declinación de noviembre (≈ −16°): elevación y azimut por la fórmula
   astronómica (ángulo horario). Sale ≈ 5:40, mediodía solar ≈ 11:45, se pone ≈ 17:50.
   Todo se gradúa por la elevación del sol con fotogramas clave (noche cerrada, crepúsculo astronómico, hora azul, salida o puesta,
   hora dorada, día): colores del cielo, franja cálida del horizonte del lado del sol, nubes (cobertura que cambia y que crece en
   las tardes, como en Bogotá; iluminadas, rosadas al atardecer, oscuras de noche), estrellas, luna, sol y luz de cielo, niebla,
   exposición, agua y brillo de la foto 3D de Google. La tarde es un poco más rosada que la mañana. */
const LAT = 4.63 * Math.PI / 180, DEC = -16 * Math.PI / 180, NOON = 11.75;

// fotogramas clave por elevación del sol (grados)
const K = [
  { e: -90, top: 0x01030a, mid: 0x040915, bot: 0x0a1222, fog: 0x070c18, dens: 1.0, hemi: 0x2b3d66, suelo: 0x0b0d12, hi: 0.16, sol: 0x9fb4dc, si: 0.22, exp: 0.82, malla: 0.13, nubL: 0x1a2134, nubD: 0x0b0f1a, est: 1, glow: 0, hor: 0x1b1f33, hora: 0.25, tinte: [0.78, 0.86, 1.1] },
  { e: -14, top: 0x01030a, mid: 0x040915, bot: 0x0a1222, fog: 0x070c18, dens: 1.0, hemi: 0x2b3d66, suelo: 0x0b0d12, hi: 0.16, sol: 0x9fb4dc, si: 0.22, exp: 0.82, malla: 0.13, nubL: 0x1a2134, nubD: 0x0b0f1a, est: 1, glow: 0, hor: 0x1b1f33, hora: 0.25, tinte: [0.78, 0.86, 1.1] },
  { e: -9, top: 0x07102a, mid: 0x15244a, bot: 0x343a5e, fog: 0x1d2440, dens: 1.15, hemi: 0x45568a, suelo: 0x12141a, hi: 0.26, sol: 0xa9b7e0, si: 0.2, exp: 0.86, malla: 0.22, nubL: 0x323856, nubD: 0x161a2a, est: 0.55, glow: 0, hor: 0x5a4a6a, hora: 0.5, tinte: [0.82, 0.86, 1.08] },
  { e: -4, top: 0x1a3368, mid: 0x4f62a0, bot: 0xc28a86, fog: 0x7c7690, dens: 1.25, hemi: 0x7486bd, suelo: 0x2a2626, hi: 0.5, sol: 0xc99ab0, si: 0.25, exp: 0.92, malla: 0.42, nubL: 0xb07c8e, nubD: 0x3a3550, est: 0.12, glow: 0.35, hor: 0xe08a6a, hora: 0.85, tinte: [0.95, 0.88, 1.0] },
  { e: 0, top: 0x33609e, mid: 0xd29a86, bot: 0xffaa62, fog: 0xd6a184, dens: 1.2, hemi: 0xb3a2bd, suelo: 0x5a4636, hi: 0.8, sol: 0xff8f45, si: 0.9, exp: 0.98, malla: 0.66, nubL: 0xffa06e, nubD: 0x6e5468, est: 0, glow: 1, hor: 0xff9248, hora: 1, tinte: [1.08, 0.9, 0.78] },
  { e: 5, top: 0x447bbd, mid: 0x9fbcd6, bot: 0xf2c896, fog: 0xe3cdb4, dens: 1.05, hemi: 0xc1cfe8, suelo: 0x7a6650, hi: 1.12, sol: 0xffc27a, si: 1.8, exp: 1.02, malla: 0.86, nubL: 0xffdcb4, nubD: 0x9a8a94, est: 0, glow: 1, hor: 0xffc58a, hora: 0.55, tinte: [1.06, 0.97, 0.86] },
  { e: 18, top: 0x2f72c2, mid: 0x7cb2e2, bot: 0xc0d2e0, fog: 0xc7d3de, dens: 1.0, hemi: 0xcfe2ff, suelo: 0x9a8f72, hi: 1.4, sol: 0xfff0d6, si: 2.6, exp: 1.05, malla: 1, nubL: 0xffffff, nubD: 0xa9b3c2, est: 0, glow: 1, hor: 0xfff1dc, hora: 0.15, tinte: [1.04, 1.0, 0.93] },
  { e: 90, top: 0x2a6cc0, mid: 0x74afe3, bot: 0xbccfdd, fog: 0xc7d3de, dens: 1.0, hemi: 0xcfe2ff, suelo: 0x9a8f72, hi: 1.45, sol: 0xfff4e2, si: 2.7, exp: 1.05, malla: 1, nubL: 0xffffff, nubD: 0xb2bccb, est: 0, glow: 1, hor: 0xfff1dc, hora: 0.1, tinte: [1.04, 1.0, 0.93] }
];

export function iniciarCielo({ THREE, T3, luzMalla }) {
  const U = T3.skyU; if (!U) return null;
  const sky = T3.scene.children.find(o => o.material && o.material.uniforms === U);
  Object.assign(U, {
    uSunCol: { value: new THREE.Color(0xfff0d6) }, uCloudL: { value: new THREE.Color(0xffffff) }, uCloudD: { value: new THREE.Color(0xa9b3c2) },
    uStars: { value: 0 }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uMoon: { value: 0 }, uHor: { value: new THREE.Color(0xfff1dc) }, uHorA: { value: 0 }
  });
  if (sky) sky.material = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vP;
      uniform vec3 top, mid, bot, uSunDir, uSunCol, uCloudL, uCloudD, uMoonDir, uHor; uniform float uTime, uCloud, uGlow, uStars, uMoon, uHorA;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vP); float h = d.y; vec3 S = normalize(uSunDir);
        vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.8, h)) : mix(bot, mid, smoothstep(-0.06, 0.1, h));
        float sa = max(dot(d, S), 0.0);
        // franja cálida del horizonte, más intensa del lado del sol (amanecer y atardecer)
        vec2 dh = normalize(d.xz + 1e-5), sh = normalize(S.xz + 1e-5);
        float lado = 0.35 + 0.65 * pow(max(dot(dh, sh) * 0.5 + 0.5, 0.0), 2.5);
        c = mix(c, uHor, uHorA * lado * exp(-max(h, 0.0) * 7.0) * smoothstep(-0.12, 0.02, h));
        // estrellas (de noche, donde no hay nubes)
        float est = 0.0;
        if (uStars > 0.01 && h > 0.0) { vec3 q = d * 260.0, ce = floor(q); float r = hash3(ce); if (r > 0.9965) { vec3 f = fract(q) - 0.5; float b = smoothstep(0.32, 0.0, length(f)) * (0.55 + 0.45 * sin(uTime * (2.0 + r * 6.0) + r * 80.0)); est = b * (r - 0.9965) / 0.0035; } }
        // nubes: dos capas que se mueven; cobertura uCloud; cara al sol iluminada, base en sombra
        float cov = 0.0; vec3 nub = uCloudL;
        if (h > 0.0) {
          vec2 uv = d.xz / (h + 0.22) * 0.7;
          vec2 w = uTime * vec2(0.010, 0.004);
          float n = fbm(uv + w), n2 = fbm(uv * 2.3 - w * 1.6 + 4.0);
          float m = n * 0.72 + n2 * 0.28, um = 1.0 - uCloud;
          cov = smoothstep(um - 0.08, um + 0.2, m) * smoothstep(0.0, 0.16, h);
          float luz = clamp(0.55 + (fbm(uv + w - S.xz * 0.06) - n) * 3.5 + h * 0.4, 0.0, 1.0);
          nub = mix(uCloudD, uCloudL, luz);
          nub += uSunCol * pow(sa, 7.0) * 0.6 * uGlow * (1.0 - cov * 0.5); // borde plateado cerca del sol
        }
        c += vec3(0.85, 0.9, 1.0) * est * uStars * (1.0 - cov);
        // luna
        float ma = max(dot(d, normalize(uMoonDir)), 0.0);
        c += vec3(0.86, 0.9, 0.98) * (smoothstep(0.99955, 0.99972, ma) * 1.1 + pow(ma, 60.0) * 0.08) * uMoon * (1.0 - cov * 0.85);
        // sol: disco y halo (detrás de las nubes)
        c += uSunCol * (smoothstep(0.99935, 0.99965, sa) * 2.2 + pow(sa, 14.0) * 0.22 + pow(sa, 4.0) * 0.08) * uGlow * (1.0 - cov * 0.9) * smoothstep(-0.03, 0.01, h);
        c = mix(c, nub, cov);
        c = mix(c, c * vec3(0.93, 0.97, 1.04), smoothstep(0.3, 0.9, h) * 0.4);
        gl_FragColor = vec4(c, 1.0);
      }`
  });

  /* ---------- posición del sol y de la luna ---------- */
  const dirAstro = (horaAng, dec) => { // -> vector del mundo (x = este, y = arriba, -z = norte)
    const se = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(horaAng), el = Math.asin(se);
    const az = Math.atan2(Math.sin(horaAng), Math.cos(horaAng) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT)) + Math.PI; // desde el norte, horario
    return [new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)), el * 180 / Math.PI];
  };
  const C = (hex) => new THREE.Color(hex);
  const KC = K.map(k => ({ ...k, top: C(k.top), mid: C(k.mid), bot: C(k.bot), fog: C(k.fog), hemi: C(k.hemi), suelo: C(k.suelo), sol: C(k.sol), nubL: C(k.nubL), nubD: C(k.nubD), hor: C(k.hor) }));
  const tmp = {}; for (const n of ['top', 'mid', 'bot', 'fog', 'hemi', 'suelo', 'sol', 'nubL', 'nubD', 'hor']) tmp[n] = new THREE.Color();
  const ROSA = new THREE.Color(1.0, 0.86, 0.92);
  function mezcla(e, tarde) {
    let i = 0; while (i < KC.length - 2 && e > KC[i + 1].e) i++;
    const a = KC[i], b = KC[i + 1], f = Math.max(0, Math.min(1, (e - a.e) / (b.e - a.e))), s = f * f * (3 - 2 * f);
    const r = {}; for (const n in tmp) r[n] = tmp[n].copy(a[n]).lerp(b[n], s);
    for (const n of ['dens', 'hi', 'si', 'exp', 'malla', 'est', 'glow', 'hora']) r[n] = a[n] + (b[n] - a[n]) * s;
    r.tinte = a.tinte.map((v, j) => v + (b.tinte[j] - v) * s);
    // la tarde es más rosada y violeta que la mañana (más partículas en el aire)
    const ro = tarde * Math.max(0, 1 - Math.abs(e + 1) / 9);
    if (ro > 0) { r.bot.lerp(r.bot.clone().multiply(ROSA), ro * 0.6); r.hor.lerp(new THREE.Color(0xff7a7a), ro * 0.35); r.nubL.lerp(new THREE.Color(0xff8fa0), ro * 0.4); r.mid.lerp(new THREE.Color(0xb98aa8), ro * 0.25); }
    return r;
  }

  /* ---------- clima: cobertura de nubes que cambia por días y crece en las tardes ---------- */
  const ruido = (x) => { const i = Math.floor(x), f = x - i, h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }, u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u; };
  const nubes = (dia, hora) => { const base = 0.12 + 0.3 * ruido(dia * 0.9 + 3.1) + 0.1 * ruido(dia * 3.7 + hora / 5); const tarde = Math.exp(-Math.pow((hora - 15.5) / 3.2, 2)) * 0.18; return Math.max(0.08, Math.min(0.62, base + tarde)); };

  const baseDens = T3.scene.fog ? T3.scene.fog.density : 0.000075;
  let ultMalla = -1, tMalla = 0;
  function aplicar(dt) {
    const R = T3.reloj, min = R ? R.t : (new Date().getHours() * 60 + new Date().getMinutes()), dia = R ? R.dia || 1 : 1, hora = (min % 1440) / 60;
    const ha = (hora - NOON) * 15 * Math.PI / 180;
    const [sd, el] = dirAstro(ha, DEC), [md, mel] = dirAstro(ha + Math.PI * 0.92, 0.12); // luna: casi opuesta al sol
    const tarde = hora > NOON ? 1 : 0, P = mezcla(el, tarde);
    // cielo
    U.top.value.copy(P.top); U.mid.value.copy(P.mid); U.bot.value.copy(P.bot); U.uSunDir.value.copy(sd); U.uSunCol.value.copy(P.sol);
    U.uCloudL.value.copy(P.nubL); U.uCloudD.value.copy(P.nubD); U.uHor.value.copy(P.hor); U.uHorA.value = P.hora;
    U.uCloud.value = nubes(dia, hora); U.uGlow.value = P.glow; U.uStars.value = P.est; U.uMoonDir.value.copy(md); U.uMoon.value = Math.max(0, Math.min(1, mel / 6)) * (0.4 + 0.6 * P.est);
    T3.scene.background && T3.scene.background.copy(P.bot);
    if (T3.scene.fog) { T3.scene.fog.color.copy(P.fog); T3.scene.fog.density = baseDens * P.dens * (1 + 0.6 * Math.exp(-Math.pow((hora - 6.2) / 0.9, 2))); } // neblina de madrugada
    // luces: de día el sol; de noche la luna (luz fría y suave); la dirección mueve las sombras
    const deDia = el > -3, L = deDia ? sd : md, elL = deDia ? el : mel;
    const dirL = L.clone(); if (dirL.y < 0.07) { dirL.y = 0.07; dirL.normalize(); } // sombras largas pero sin pasar bajo el horizonte
    T3.sunOff.copy(dirL).multiplyScalar(2600);
    T3.sun.color.copy(P.sol); T3.sun.intensity = deDia ? P.si * Math.max(0, Math.min(1, (el + 3) / 4)) * (1 - U.uCloud.value * 0.35) : 0.14 * Math.max(0, Math.min(1, elL / 8)) + 0.03;
    T3.hemi.color.copy(P.hemi); T3.hemi.groundColor.copy(P.suelo); T3.hemi.intensity = P.hi * (1 - U.uCloud.value * 0.12);
    T3.renderer.toneMappingExposure = P.exp;
    // agua: reflejo del cielo y del sol
    const wu = T3.waterMesh && T3.waterMesh.material && T3.waterMesh.material.uniforms;
    if (wu) { if (wu.uSkyA) wu.uSkyA.value.copy(P.mid).lerp(P.bot, 0.3); if (wu.uSkyB) wu.uSkyB.value.copy(P.bot); if (wu.uSky) wu.uSky.value.copy(P.bot); if (wu.uSun) wu.uSun.value.copy(sd); }
    // foto 3D de Google: brillo y tinte (no se recalcula en cada cuadro: recorre todas las teselas)
    if (T3.maskU && T3.maskU.uTint) T3.maskU.uTint.value.set(P.tinte[0], P.tinte[1], P.tinte[2]);
    if ((tMalla -= dt) <= 0 && Math.abs(P.malla - ultMalla) > 0.015) { tMalla = 0.4; ultMalla = P.malla; luzMalla(T3, P.malla); }
    // noche (0 de día, 1 de noche cerrada): enciende ventanas y luces de los carros, graduado desde la puesta del sol
    const noche = Math.max(0, Math.min(1, (2 - el) / 9)); T3.noche = noche * noche * (3 - 2 * noche);
    const luces = hora >= 17 && hora < 23 ? 0.62 : hora >= 23 ? 0.62 - (hora - 23) * 0.4 : hora < 4.5 ? 0.2 : hora < 6.5 ? 0.2 + (hora - 4.5) * 0.12 : 0.4; // más ventanas prendidas al anochecer, pocas de madrugada
    if (T3.roofU && T3.roofU.uNoche) { T3.roofU.uNoche.value = T3.noche; T3.roofU.uLuces.value = luces; }
    return { hora, el };
  }
  let ult = performance.now();
  const bucle = () => { const a = performance.now(), dt = Math.min(0.2, (a - ult) / 1000); ult = a; try { aplicar(dt); } catch (e) { console.warn('cielo:', e); } requestAnimationFrame(bucle); };
  requestAnimationFrame(bucle);
  return { aplicar };
}
