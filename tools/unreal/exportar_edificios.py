"""Exporta a Unreal los edificios y árboles de REN3D alrededor del humedal El Burro (vista tipo Umbra para el giro 360):
- edificios.obj: muros (UV en metros: 1 = 12,4 m de ancho x 12 m de alto, 4 módulos de ventana x 4 pisos) y techos triangulados,
  con tres materiales: ladrillo, pintado y techo (misma paleta que la web: conjuntos altos casi todos en ladrillo).
- arbol.obj: copa de varios lóbulos con tronco (1 m de alto), y arboles.json con posición y alto de cada árbol.
- fachada_{ladrillo,pintado}_{color,normal,rugosidad}.png: texturas PBR horneadas (ladrillo fotográfico Poly Haven Brick 4 + ventanas).
Coordenadas: metros al este y al norte del origen de la georreferencia de Unreal (lat 4.640683, lon -74.149778); Unreal: X = este, Y = sur.
Uso: python tools/unreal/exportar_edificios.py [carpeta_salida]"""
import json, math, os, sys
from PIL import Image, ImageDraw

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360\Importar'
os.makedirs(OUT, exist_ok=True)
RADIO = 900.0         # zona del proyecto (igual que la web): afuera queda la malla de Google tal cual
SUELO = 15.8          # m sobre la altura elipsoidal del origen (2548): el asfalto de la malla de Google está ~16 m más arriba
# datos (x, y) del modelo -> este/norte del origen de Unreal (GEO de index.html: EX -5193.24, EY -2090.06, LNG0 -74.17, LAT0 4.63)
MXg, MYg = 111320 * math.cos(math.radians(4.63)), 110540.0
DX = -5193.24 - (-74.149778 + 74.17) * MXg
DY = -2090.06 - (4.640683 - 4.63) * MYg
def en(x, y): return x + DX, y + DY
ZC = en(7437, 3271)   # centro de la zona del proyecto (ZONA de index.html)
def enZona(x, y, m=0): return (x - ZC[0]) ** 2 + (y - ZC[1]) ** 2 < (RADIO + m) ** 2

def hsh(i):
    s = math.sin(i * 127.1 + 311.7) * 43758.5453
    return s - math.floor(s)

# ---------- edificios ----------
B = json.load(open(os.path.join(RAIZ, 'data3d', 'buildings.json'), encoding='utf-8'))
def area2(p):
    return sum(p[i][0] * p[i + 1][1] - p[i + 1][0] * p[i][1] for i in range(len(p) - 1)) / 2  # anillo cerrado

def limpiar(poly):  # quita puntos repetidos y alineados (trababan el recorte de orejas: 16 % de los techos quedaban con huecos)
    p = list(poly); cambio = True
    while cambio and len(p) > 3:
        cambio = False
        for k in range(len(p)):
            a, b, c = p[k - 1], p[k], p[(k + 1) % len(p)]
            if math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05 or abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 0.02:
                p.pop(k); cambio = True; break
    return p

def adentro(poly, d):  # offset hacia adentro de un polígono antihorario (inglete); None si se invierte o se cruza
    n = len(poly); out = []
    for i in range(n):
        a, b, c = poly[i - 1], poly[i], poly[(i + 1) % n]
        l1 = math.hypot(b[0] - a[0], b[1] - a[1]) or 1; l2 = math.hypot(c[0] - b[0], c[1] - b[1]) or 1
        n1 = (-(b[1] - a[1]) / l1, (b[0] - a[0]) / l1); n2 = (-(c[1] - b[1]) / l2, (c[0] - b[0]) / l2)  # normales hacia adentro
        m = (n1[0] + n2[0], n1[1] + n2[1]); k = m[0] * n1[0] + m[1] * n1[1]
        if k < 0.3: return None  # esquina muy aguda
        out.append((b[0] + m[0] * d / k, b[1] + m[1] * d / k))
    a2 = sum(out[i][0] * out[(i + 1) % n][1] - out[(i + 1) % n][0] * out[i][1] for i in range(n)) / 2
    return out if a2 > 1.0 else None
def triangular(poly):  # recorte de orejas (CCW, sin repetir el último punto)
    idx = list(range(len(poly))); tris = []
    def cruz(a, b, c): return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    def dentro(p, a, b, c): return cruz(a, b, p) >= -1e-9 and cruz(b, c, p) >= -1e-9 and cruz(c, a, p) >= -1e-9
    while len(idx) > 3:
        hecho = False
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            a, b, c = poly[i0], poly[i1], poly[i2]
            if cruz(a, b, c) <= 1e-9: continue
            if any(dentro(poly[j], a, b, c) for j in idx if j not in (i0, i1, i2) and poly[j] not in (a, b, c)): continue
            tris.append((i0, i1, i2)); idx.pop(k); hecho = True; break
        if not hecho:  # huella torcida (se cruza a sí misma): se corta la oreja más convexa aunque no sea perfecta
            k = max(range(len(idx)), key=lambda k: cruz(poly[idx[k - 1]], poly[idx[k]], poly[idx[(k + 1) % len(idx)]]))
            tris.append((idx[k - 1], idx[k], idx[(k + 1) % len(idx)])); idx.pop(k)
    if len(idx) == 3: tris.append(tuple(idx))
    return tris

# materiales: fachadas (ladrillo y pañete salmón, crema o blanco, como en los videos de dron del humedal), techo plano,
# lámina de los techos a dos aguas y concreto de los balcones
MATS = ('ladrillo', 'salmon', 'crema', 'blanco', 'techo', 'lamina', 'balcon')
V, VT, F = [], [], {m: [] for m in MATS}
def v(x, y, z):  # este, norte, alto. El importador de UE 5.8 toma el OBJ como (x, -y, z) en cm: así queda (este, sur, alto) sin girar
    V.append((x, y, z)); return len(V)
def vt(u, w):
    VT.append((u, w)); return len(VT)
def quad(mat, a, b, c, d, uv=((0, 0), (1, 0), (1, 1), (0, 1))):
    ia, ib, ic, id_ = (v(*p) for p in (a, b, c, d)); ta, tb, tc, td = (vt(*t) for t in uv)
    F[mat].append(((ia, ta), (ib, tb), (ic, tc))); F[mat].append(((ia, ta), (ic, tc), (id_, td)))
def caja(mat, c, ex, ey, ez):  # caja centrada en c con semiejes ex, ey (horizontales) y ez (vertical): vectores (x, y, z)
    P = [tuple(c[k] + sx * ex[k] + sy * ey[k] + sz * ez[k] for k in range(3)) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)): quad(mat, *(P[i] for i in f))
def dos_aguas(q, h, bi, mat_muro):  # techo a dos aguas en bloques casi rectangulares y alargados de 2 a 7 pisos (igual que la web)
    poly = q[:-1]; n = len(poly)
    if h < 5 or h > 22 or n < 4: return False
    L, ux, uy = 0, 1, 0
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]; l = math.hypot(b[0] - a[0], b[1] - a[1])
        if l > L: L, ux, uy = l, (b[0] - a[0]) / l, (b[1] - a[1]) / l
    vx, vy = -uy, ux
    us = [p[0] * ux + p[1] * uy for p in poly]; vs = [p[0] * vx + p[1] * vy for p in poly]
    Lu, Lv = max(us) - min(us), max(vs) - min(vs)
    if abs(area2(q)) / (Lu * Lv) < 0.86 or Lu / Lv < 1.3 or Lv < 6 or Lv > 22: return False
    o, hr = 0.3, max(1.2, min(3.2, Lv * 0.18)); u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs); vm = (v0 + v1) / 2
    pt = lambda u, w, z: (u * ux + w * vx, u * uy + w * vy, z)
    z1, zr, ze = SUELO + h, SUELO + h + hr, SUELO + h - 0.15
    quad('lamina', pt(u0 - o, v0 - o, ze), pt(u1 + o, v0 - o, ze), pt(u1 + o, vm, zr), pt(u0 - o, vm, zr))
    quad('lamina', pt(u0 - o, v1 + o, ze), pt(u0 - o, vm, zr), pt(u1 + o, vm, zr), pt(u1 + o, v1 + o, ze))
    for u in (u0, u1):  # piñones
        a, b, c = pt(u, v0, z1), pt(u, v1, z1), pt(u, vm, zr - 0.2)
        ia, ib, ic = v(*a), v(*b), v(*c); ta, tb, tc = vt(0, h / 12), vt(Lv / 12.4, h / 12), vt(Lv / 24.8, (h + hr) / 12)
        F[mat_muro].append(((ia, ta), (ib, tb), (ic, tc)))
    return True
def balcones(q, h, bi):  # torres: losa y antepecho de concreto en módulos alternos de cada fachada larga, piso por piso
    if h < 15: return
    pisos = int(h // 3)
    for i in range(len(q) - 1):
        a, c = q[i], q[i + 1]; L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 8: continue
        dx, dy = (c[0] - a[0]) / L, (c[1] - a[1]) / L; nx, ny = dy, -dx  # normal hacia afuera (anillo antihorario)
        mods = int(L // 3.1); cw = L / mods
        for m in range(mods):
            if (m + bi) % 2: continue
            s = (m + 0.5) * cw
            for fl in range(1, pisos - 1):
                z = SUELO + fl * 3.0; cx, cy = a[0] + dx * s + nx * 0.6, a[1] + dy * s + ny * 0.6
                caja('balcon', (cx, cy, z), (dx * 1.25, dy * 1.25, 0), (nx * 0.6, ny * 0.6, 0), (0, 0, 0.08))           # losa
                caja('balcon', (cx + nx * 0.55, cy + ny * 0.55, z + 0.55), (dx * 1.25, dy * 1.25, 0), (nx * 0.05, ny * 0.05, 0), (0, 0, 0.47))  # antepecho
n = 0
for bi, b in enumerate(B):
    pts, h = b['pts'], float(b.get('h') or 0)
    if h < 2.5 or len(pts) < 4: continue
    q = [en(p[0], p[1]) for p in pts]
    cx = sum(p[0] for p in q) / len(q); cy = sum(p[1] for p in q) / len(q)
    if not enZona(cx, cy): continue
    if area2(q) < 0: q = q[::-1]
    r = hsh(bi * 3.7)
    if h > 7: mat = 'ladrillo' if r < 0.55 else 'salmon' if r < 0.8 else 'crema'
    else: mat = 'ladrillo' if r < 0.4 else 'blanco' if r < 0.65 else 'crema' if r < 0.85 else 'salmon'
    z0, z1 = SUELO - 0.8, SUELO + h
    acum = 0.0
    for i in range(len(q) - 1):
        a, c = q[i], q[i + 1]
        L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 0.05: continue
        u0, u1 = acum / 12.4, (acum + L) / 12.4; acum += L
        w0, w1 = -0.8 / 12.0, h / 12.0
        i1, i2, i3, i4 = v(a[0], a[1], z0), v(c[0], c[1], z0), v(c[0], c[1], z1), v(a[0], a[1], z1)
        t1, t2, t3, t4 = vt(u0, w0), vt(u1, w0), vt(u1, w1), vt(u0, w1)
        F[mat].append(((i1, t1), (i2, t2), (i3, t3))); F[mat].append(((i1, t1), (i3, t3), (i4, t4)))
    poly = limpiar(q[:-1])
    if len(poly) < 3: continue
    if dos_aguas(q, h, bi, mat): zt, techo = z1, poly  # bajo la lámina: losa plana al ras
    else:  # CUBIERTA CON PRETIL: offset de 35 cm hacia adentro y la losa 90 cm más abajo (como una cubierta real)
        ins = adentro(poly, 0.35)
        if ins:
            zt, techo = z1 - 0.9, ins
            for i in range(len(poly)):  # remate del pretil (anillo) y cara interior
                a, b, ai, bi2 = poly[i], poly[(i + 1) % len(poly)], ins[i], ins[(i + 1) % len(ins)]
                quad(mat, (a[0], a[1], z1), (b[0], b[1], z1), (bi2[0], bi2[1], z1), (ai[0], ai[1], z1))
                L = math.hypot(b[0] - a[0], b[1] - a[1])
                quad(mat, (ai[0], ai[1], z1), (bi2[0], bi2[1], z1), (bi2[0], bi2[1], zt), (ai[0], ai[1], zt), ((0, h / 12), (L / 12.4, h / 12), (L / 12.4, (h - 0.9) / 12), (0, (h - 0.9) / 12)))
        else: zt, techo = z1, poly
    ids = [v(p[0], p[1], zt) for p in techo]; tids = [vt(p[0] / 8.0, p[1] / 8.0) for p in techo]
    for (x, y, z) in triangular(techo):
        F['techo'].append(((ids[x], tids[x]), (ids[y], tids[y]), (ids[z], tids[z])))
    balcones(q, h, bi)
    n += 1
with open(os.path.join(OUT, 'edificios.obj'), 'w') as f:
    f.write('# REN3D - edificios alrededor del humedal El Burro\n')
    for p in V: f.write('v %.2f %.2f %.2f\n' % p)
    for t in VT: f.write('vt %.4f %.4f\n' % t)
    for m, fs in F.items():
        f.write('g %s\nusemtl %s\n' % (m, m))
        for tri in fs: f.write('f %s\n' % ' '.join('%d/%d' % c for c in tri))
print('edificios: %d (%d triangulos)' % (n, sum(len(x) for x in F.values())))

# ---------- árboles ----------
T = json.load(open(os.path.join(RAIZ, 'data3d', 'trees.json'), encoding='utf-8'))['t']
# Altura REAL de cada árbol (campo 2 del censo, en m: el 60 % de los de la zona miden 1-2 m: sauco, chicalá, acacias jóvenes).
# Antes se subían todos a 6,5-14 m con copa de jacarandá y la zona parecía un bosque. Se quitan los repetidos (misma posición).
arb, vistos = [], set()
for i, t in enumerate(T):
    x, y = en(t[0], t[1])
    if not enZona(x, y, 100): continue
    clave = (round(x), round(y))
    if clave in vistos: continue
    vistos.add(clave)
    h = max(1.5, min(18.0, float(t[2] or 3) * (0.9 + hsh(i) * 0.2)))
    s = 1 if h < 5 else 0  # pequeños: island tree (copa compacta); medianos y grandes: jacarandá con copa más angosta
    wf = (0.95 + hsh(i * 5) * 0.2) if s else (0.6 + hsh(i * 5) * 0.2)
    arb.append([round(x, 2), round(y, 2), round(h, 2), round(hsh(i * 11) * 360, 1), round(wf, 3), s])
json.dump({'suelo': SUELO, 'arboles': arb}, open(os.path.join(OUT, 'arboles.json'), 'w'))
print('arboles: %d' % len(arb))
# copa de lóbulos (icosaedro subdividido) + tronco, 1 m de alto, normales de esfera
def ico(det):
    t = (1 + 5 ** 0.5) / 2
    P = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    P = [tuple(c / math.sqrt(sum(k * k for k in p)) for c in p) for p in P]
    Fc = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    for _ in range(det):
        cache, nf = {}, []
        def mid(a, b):
            k = (min(a, b), max(a, b))
            if k not in cache:
                m = [(P[a][i] + P[b][i]) / 2 for i in range(3)]; l = math.sqrt(sum(c * c for c in m)); P.append(tuple(c / l for c in m)); cache[k] = len(P) - 1
            return cache[k]
        for a, b, c in Fc:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a); nf += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        Fc = nf
    return P, Fc
P0, F0 = ico(2)
AV, AN, AF = [], [], []
for k in range(5):
    ang = k / 5 * 2 * math.pi + 0.4; r = 0.17 if k else 0; s = (0.24 + hsh(k * 7) * 0.06) if k else 0.3
    c = (math.cos(ang) * r, 0.62 + ((hsh(k * 3) - 0.35) * 0.16 if k else 0.06), math.sin(ang) * r)
    base = len(AV)
    for p in P0:
        bump = 1 + math.sin(p[0] * 9.1 + p[1] * 7.3) * math.cos(p[2] * 8.7 - p[1] * 5.1) * 0.09
        AV.append((c[0] + p[0] * s * bump, c[1] + p[1] * s * 0.92 * bump, c[2] + p[2] * s * bump)); AN.append(p)
    AF += [(base + a, base + b, base + cc) for a, b, cc in F0]
base = len(AV)  # tronco: prisma de 6 lados
for j in range(6):
    a = j / 6 * 2 * math.pi
    AV.append((math.cos(a) * 0.055, 0.0, math.sin(a) * 0.055)); AN.append((math.cos(a), 0, math.sin(a)))
    AV.append((math.cos(a) * 0.035, 0.45, math.sin(a) * 0.035)); AN.append((math.cos(a), 0, math.sin(a)))
for j in range(6):
    a0, a1, b0, b1 = base + 2 * j, base + 2 * j + 1, base + 2 * ((j + 1) % 6), base + 2 * ((j + 1) % 6) + 1
    AF += [(a0, b0, b1), (a0, b1, a1)]
with open(os.path.join(OUT, 'arbol.obj'), 'w') as f:
    f.write('# REN3D - arbol tipo maqueta (copa de lobulos), 1 m de alto\n')
    for p in AV: f.write('v %.4f %.4f %.4f\n' % p)
    for p in AN: f.write('vn %.4f %.4f %.4f\n' % p)
    for p in AV: f.write('vt %.4f %.4f\n' % (p[0] + 0.5, p[1]))  # el importador de UE 5.8 exige coordenadas de textura
    f.write('g copa\nusemtl follaje\n')
    for a, b, c in AF: f.write('f %d/%d/%d %d/%d/%d %d/%d/%d\n' % (a + 1, a + 1, a + 1, c + 1, c + 1, c + 1, b + 1, b + 1, b + 1))

# ---------- texturas de fachada PBR (2048 px = 12,4 m x 12 m) ----------
S = 2048; M = S / 4; pm = M / 3.05
TX = os.path.join(RAIZ, 'data3d', 'textures')
lc, ln, lr = (Image.open(os.path.join(TX, 'ladrillo_%s.jpg' % k)).convert('RGB') for k in ('color', 'normal', 'rugosidad'))
lado = round(1.05 * S / 12.4)
def mosaico(im):
    t = im.resize((lado, lado), Image.LANCZOS); out = Image.new('RGB', (S, S))
    for y in range(0, S, lado):
        for x in range(0, S, lado): out.paste(t, (x, y))
    return out
import random
rnd = random.Random(7)
for tipo in ('ladrillo', 'pintado'):
    if tipo == 'ladrillo': C, N, R = mosaico(lc), mosaico(ln), mosaico(lr)
    else:
        C = Image.new('RGB', (S, S), (241, 238, 232)); N = Image.new('RGB', (S, S), (128, 128, 255)); R = Image.new('RGB', (S, S), (220, 220, 220))
    gc, gn, gr = ImageDraw.Draw(C), ImageDraw.Draw(N), ImageDraw.Draw(R)
    def rect(x, y, w, h, col, rug, nor=(128, 128, 255)):
        b = [round(x), round(y), round(x + w), round(y + h)]
        gc.rectangle(b, fill=col); gr.rectangle(b, fill=(rug, rug, rug)); gn.rectangle(b, fill=nor)
    for fy in range(4):
        piso = fy * M + M
        rect(0, piso - 0.22 * pm, S, 0.22 * pm, (233, 229, 221) if tipo == 'ladrillo' else (217, 212, 202), 180)
        for cx in range(4):
            w, h = 1.35 * pm, 1.4 * pm; x = cx * M + (M - w) / 2; yb = piso - 0.22 * pm - 0.9 * pm; y = yb - h; fr = max(3, 0.07 * pm)
            rect(x - fr, y - fr, w + 2 * fr, h + 2 * fr, (244, 242, 238), 115)
            rect(x - 2 * fr, yb + fr, w + 4 * fr, fr * 1.3, (231, 226, 216), 150, (128, 200, 220))
            cort = rnd.random()
            for k in range(int(h)):
                tt = k / h; top, mid, bot = ((185, 173, 152), (138, 126, 108), (35, 42, 49)) if cort > 0.75 else ((143, 167, 188), (61, 75, 88), (35, 42, 49))
                col = tuple(int(top[i] + (mid[i] - top[i]) * tt / 0.55) if tt < 0.55 else int(mid[i] + (bot[i] - mid[i]) * (tt - 0.55) / 0.45) for i in range(3))
                gc.line([(round(x), round(y + k)), (round(x + w), round(y + k))], fill=col)
            gr.rectangle([round(x), round(y), round(x + w), round(y + h)], fill=(150, 150, 150) if cort > 0.75 else (70, 70, 70))  # vidrio satinado: casi espejo volvía gris toda la fachada
            rect(x + w / 2 - fr / 2, y, fr, h, (244, 242, 238), 115); rect(x, y + h * 0.38, w, fr * 0.8, (244, 242, 238), 115)
    C.save(os.path.join(OUT, 'fachada_%s_color.png' % tipo)); N.save(os.path.join(OUT, 'fachada_%s_normal.png' % tipo)); R.save(os.path.join(OUT, 'fachada_%s_rugosidad.png' % tipo))
print('texturas listas en', OUT)

# ---------- árboles reales (Poly Haven, CC0): versiones sin compresión meshopt (Unreal no la lee) de la carpeta REN3D ----------
import shutil
MOD = r'C:\Users\ACER\REN3D\data3d\models'
for nombre in ('jacaranda_L0_hojas', 'jacaranda_L0_madera', 'island_tree_01_L0_hojas', 'island_tree_01_L0_madera'):
    shutil.copy(os.path.join(MOD, nombre + '.glb'), os.path.join(OUT, nombre + '.glb'))
print('arboles reales copiados')
