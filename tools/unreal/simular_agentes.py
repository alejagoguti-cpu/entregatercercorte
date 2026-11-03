"""Simulación de agentes para Kennedy360: dos submodelos acoplados, siguiendo la arquitectura ABM del curso
(Ecosystem_ABM_Architecture_v6: perfil «baseline research», contratos de nivel A).

1. FAUNA del humedal El Burro (tiempo continuo, paso fijo de 1/8 s):
   - Golondrina albiazul (Pygochelidon cyanoleuca): bandada con las tres zonas de Couzin et al. (2002), ángulo ciego y giro
     limitado; caza insectos con un cono de detección como en Lin & Abaid (2013).
   - Torcaza (Zenaida auriculata): bandada de Couzin que huye de la rapaz (repulsión con prioridad máxima).
   - Aguililla caminera (Rupornis magnirostris): rapaz que planea en círculos y ataca a la bandada de torcazas.
   - Enjambre de quironómidos sobre el agua: presas con alineación de Vicsek y ruido (no se dibujan; solo se cuentan).
   - Focha (Fulica americana) y pato zambullidor (Oxyura ferruginea): nadan en grupos pequeños dentro del espejo de agua.
   - Garza blanca (Ardea alba) y garcilla bueyera (Ardea ibis): caminan en la orilla y se alejan de las personas.
   - Abejas (Apis mellifera): visitan flores de las huertas y de la ronda con memoria atractiva/repulsiva (Qu et al., 2013).
     Sus visitas dan el factor de polinización de las huertas, que pasa al submodelo de alimentos (acople entre los dos).
   - Custodios del humedal (personas que agencian por él): recorren el sendero de la ronda.
2. ALIMENTOS (tiempo discreto, un paso = un día, 120 días): tiendas, comedores y colegios compran en Corabastos o en el punto
   de acopio del circuito corto; huertas y distrito de hongos producen; la central responde bajando precios cuando pierde
   volumen; los tenderos ajustan su confianza en el acopio según lo que reciben. Tres escenarios: ACTUAL, PROPUESTO
   (Corabastos con función reducida: cede el 20,8 % al humedal La Vaca y sigue trayendo lo que Kennedy no produce) y
   PROPUESTO_APAGON (falla eléctrica de 4 días en el distrito).

Contratos que se cumplen (numeración del documento del profe): identidades estables (§3.2), un solo dueño de cada valor
(§2), lectura de una instantánea y escritura en un búfer que publica el motor (§5.2), tiempo entero (§5.1), azar con
dirección lógica (semilla, flujo, paso, agente) y no con el orden de llamada (§13.1), resolución serial y atómica de
interacciones con orden estable (§10.2), cuentas cerradas de néctar, insectos y alimentos (§11.5), invariantes (§15.1)
y métricas POM (§15.3). Todo parámetro sin fuente va marcado [SUP] (supuesto declarado); los de la literatura, [PUB].

Salida (en Importar/agentes): fauna.json y alimentos_*.json (claves para las secuencias de Unreal), nodos.json, mallas
.obj, resultados.json y RESULTADOS.md (métricas, cuentas e invariantes).
Mismas coordenadas que exportar_suelo.py: metros al este (x) y al norte (y) del origen de la georreferencia de Unreal.
Uso: python tools/unreal/simular_agentes.py [carpeta_salida]"""
import hashlib, heapq, json, math, os, struct, sys
import numpy as np

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360\Importar\agentes'
os.makedirs(OUT, exist_ok=True)
SEMILLA = 20261102
SUELO = 15.8
MXg = 111320 * math.cos(math.radians(4.63)); MYg = 110540.0
DX = -5193.24 - (-74.149778 + 74.17) * MXg; DY = -2090.06 - (4.640683 - 4.63) * MYg
def en(x, y): return x + DX, y + DY
def ll(lon, lat): return en((lon + 74.17) * MXg + 5193.24, (lat - 4.63) * MYg + 2090.06)

# ---------------------------------------------------------------- azar con dirección lógica (§13.1)
def azar(*clave):
    """Número en [0, 1) que depende solo de (semilla, clave): no cambia si se agregan agentes o se reordena el código."""
    h = hashlib.blake2b(repr((SEMILLA,) + clave).encode(), digest_size=8).digest()
    return struct.unpack('<Q', h)[0] / 2 ** 64
def flujo(*clave):
    """Generador numpy para un flujo lógico (p. ej. ('ruido', 'golondrina', paso))."""
    return np.random.default_rng(int(azar(*clave) * 2 ** 63))

# ---------------------------------------------------------------- geometría
def area(p): return sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p))) / 2
def ccw(p): return p if area(p) > 0 else p[::-1]
def centroide(p):
    a = area(p); cx = cy = 0.0
    for i in range(len(p)):
        x0, y0 = p[i]; x1, y1 = p[(i + 1) % len(p)]; c = x0 * y1 - x1 * y0; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    return cx / (6 * a), cy / (6 * a)
def dentro_np(X, Y, poly):
    P = np.asarray(poly); ax, ay = P[:, 0], P[:, 1]; bx, by = np.roll(ax, 1), np.roll(ay, 1)
    X = np.asarray(X)[..., None]; Y = np.asarray(Y)[..., None]
    cruza = ((ay > Y) != (by > Y)) & (X < (bx - ax) * (Y - ay) / (by - ay + 1e-12) + ax)
    return np.count_nonzero(cruza, axis=-1) % 2 == 1
def dentro(x, y, poly): return bool(dentro_np(np.array([x]), np.array([y]), poly)[0])
def recortar(poly, n, s):
    """Parte del polígono con n·p >= s (Sutherland-Hodgman con un semiplano)."""
    out = []
    for i in range(len(poly)):
        a, b = poly[i - 1], poly[i]; da = a[0] * n[0] + a[1] * n[1] - s; db = b[0] * n[0] + b[1] * n[1] - s
        if db >= 0:
            if da < 0: t = da / (da - db); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            out.append(b)
        elif da >= 0: t = da / (da - db); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out
class Contorno:
    """Recorrido a lo largo del borde de un polígono antihorario: punto y normal hacia afuera a distancia s."""
    def __init__(self, poly):
        self.p = np.asarray(poly, float); d = np.diff(np.vstack([self.p, self.p[:1]]), axis=0)
        self.l = np.hypot(d[:, 0], d[:, 1]); self.acum = np.concatenate([[0], np.cumsum(self.l)]); self.L = self.acum[-1]
        self.t = d / np.maximum(self.l, 1e-9)[:, None]; self.n = np.stack([self.t[:, 1], -self.t[:, 0]], 1)
    def punto(self, s, desp=0.0):
        s = np.mod(s, self.L); i = np.clip(np.searchsorted(self.acum, s, side='right') - 1, 0, len(self.l) - 1)
        f = (s - self.acum[i])[..., None]; base = self.p[i] + self.t[i] * f
        return base + self.n[i] * np.asarray(desp)[..., None], self.t[i]

# ---------------------------------------------------------------- datos del territorio
W = json.load(open(os.path.join(RAIZ, 'data3d', 'water_bodies.json'), encoding='utf-8'))
def cuerpo(nombre):
    cands = [ccw([en(*a) for a in w['pts']][:-1]) for w in W if w.get('nombre') == nombre]
    return max(cands, key=area)
BURRO = cuerpo('Humedal El Burro'); VACA = cuerpo('Humedal La Vaca')
OSM = json.load(open(os.path.join(RAIZ, 'data3d', 'osm_suelo.json'), encoding='utf-8'))
ABASTOS = ccw(max(([ll(*p) for p in s['pts']] for s in OSM if s.get('nombre') == 'Abastos'), key=lambda q: abs(area(q))))
ABASTOS = ABASTOS[:-1] if math.dist(ABASTOS[0], ABASTOS[-1]) < 0.5 else ABASTOS
CORA = centroide(ABASTOS); A_CORA = area(ABASTOS)
# área que Corabastos cede al humedal La Vaca: 20,8 % del lado del humedal (propuesta del grupo, corabastos.js). Aquí se
# aproxima con un corte recto perpendicular a la dirección central -> humedal; en la propuesta el corte sigue las calles internas.
CESION = 0.208
u = np.subtract(centroide(VACA), CORA); u = u / np.linalg.norm(u)
lo, hi = -2000.0, 2000.0
for _ in range(60):
    s = (lo + hi) / 2; a = area(recortar(ABASTOS, u, s)) if len(recortar(ABASTOS, u, s)) > 2 else 0
    lo, hi = (s, hi) if a > CESION * A_CORA else (lo, s)
CEDIDA = recortar(ABASTOS, u, s); CORTE_S = s
print('Corabastos: %.1f ha, cede %.1f ha (%.1f %%) hacia La Vaca' % (A_CORA / 1e4, area(CEDIDA) / 1e4, 100 * area(CEDIDA) / A_CORA))

# ---------------------------------------------------------------- malla vial (net.json) como grafo
N = json.load(open(os.path.join(RAIZ, 'data3d', 'net.json'), encoding='utf-8'))
VEL = {'major': 11.0, 'mid': 8.0, 'local': 5.0}
nodos, adj = {}, {}
def nodo(p):
    k = (round(p[0]), round(p[1]))
    if k not in nodos: nodos[k] = len(nodos); adj[nodos[k]] = []
    return nodos[k]
for cls, e in N['edges']:  # cada vértice es un nodo: las vías se cruzan en vértices compartidos, no solo en sus extremos
    q = [en(*a) for a in e]
    for i in range(len(q) - 1):
        a, b = nodo(q[i]), nodo(q[i + 1]); L = math.dist(q[i], q[i + 1])
        if a == b: continue
        adj[a].append((b, L / VEL[cls], [q[i], q[i + 1]], cls)); adj[b].append((a, L / VEL[cls], [q[i + 1], q[i]], cls))
XY = np.zeros((len(nodos), 2))
for k, i in nodos.items(): XY[i] = k
# en net.json muchas vías terminan cerca de otra sin compartir vértice: cada extremo suelto se une al vértice más cercano a
# menos de 12 m (con 3 m quedan 508 pedazos; con 12 m casi toda la red queda conectada)
TOL = 12.0; rejilla = {}
for i, (x, y) in enumerate(XY): rejilla.setdefault((int(x // TOL), int(y // TOL)), []).append(i)
for i in [i for i in adj if len(adj[i]) == 1]:
    x, y = XY[i]; vec = {j for j, *_ in adj[i]}; mejor, md = None, TOL
    for gx in (-1, 0, 1):
        for gy in (-1, 0, 1):
            for j in rejilla.get((int(x // TOL) + gx, int(y // TOL) + gy), []):
                d = math.dist(XY[i], XY[j])
                if j != i and j not in vec and d < md: mejor, md = j, d
    if mejor is not None:
        q = [tuple(XY[i]), tuple(XY[mejor])]; adj[i].append((mejor, md / 5.0, q, 'local')); adj[mejor].append((i, md / 5.0, q[::-1], 'local'))
# componente conexa más grande
comp = -np.ones(len(nodos), int); ncomp = 0
for i0 in range(len(nodos)):
    if comp[i0] >= 0: continue
    pila = [i0]; comp[i0] = ncomp
    while pila:
        i = pila.pop()
        for j, *_ in adj[i]:
            if comp[j] < 0: comp[j] = ncomp; pila.append(j)
    ncomp += 1
grande = np.argmax(np.bincount(comp)); EN_RED = comp == grande
def cercano(p, filtro=None):
    m = EN_RED if filtro is None else EN_RED & filtro
    d = np.where(m, np.hypot(XY[:, 0] - p[0], XY[:, 1] - p[1]), np.inf); return int(np.argmin(d))
def dijkstra(fuente):
    dist = {fuente: 0.0}; prev = {}; h = [(0.0, fuente)]
    while h:
        d, i = heapq.heappop(h)
        if d > dist.get(i, 1e18): continue
        for j, w, q, _ in adj[i]:
            nd = d + w
            if nd < dist.get(j, 1e18): dist[j] = nd; prev[j] = (i, q); heapq.heappush(h, (nd, j))
    return dist, prev
def ruta(prev, fuente, destino):
    """Polilínea desde la fuente del árbol hasta el destino (lista de puntos)."""
    if destino != fuente and destino not in prev: return None
    tramos = []; i = destino
    while i != fuente:
        j, q = prev[i]; tramos.append(q); i = j
    pts = []
    for q in reversed(tramos): pts += q if not pts else q[1:]
    return pts
def longitud(pts): return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
print('red vial: %d nodos (%d en la componente principal)' % (len(nodos), EN_RED.sum()))

# ---------------------------------------------------------------- nodos de la red de alimentos
cb = Contorno(BURRO)
NODOS = []  # tipo, nombre, x, y, escenario ('ambos' | 'propuesto'), clase de nodo (corrección 3.6)
def agregar(tipo, nombre, x, y, esc='ambos', clase='infraestructura', **extra):
    d = dict(tipo=tipo, nombre=nombre, x=round(float(x), 1), y=round(float(y), 1), escenario=esc, clase=clase); d.update(extra); NODOS.append(d); return d
agregar('corabastos', 'Corabastos', *CORA, clase='organizacion')
# en el borde nuevo: distrito agro-biotecnológico (norte del corte), compostaje y semillero (centro del corte)
perp = np.array([-u[1], u[0]])
borde = recortar(ABASTOS, -u, -CORTE_S - 5)  # parte que queda, para ubicar el borde nuevo
ext = [float(np.dot(np.subtract(p, CORA), perp)) for p in CEDIDA]
def sobre_corte(f, atras):
    # la recta de corte es {p : u·p = CORTE_S} en coordenadas absolutas; t se mide a lo largo de ella desde la proyección de CORA
    t = min(ext) + (max(ext) - min(ext)) * f
    return u * CORTE_S + perp * (float(np.dot(CORA, perp)) + t) - u * atras  # 'atras' metros hacia dentro de la central que queda
dist_p = sobre_corte(0.78, 45); comp_p = sobre_corte(0.45, 40)
agregar('distrito', 'Distrito agro-biotecnológico (hongos)', *dist_p, 'propuesto', 'infraestructura')
agregar('compostaje', 'Compostaje y semillero', *comp_p, 'propuesto', 'infraestructura')
# punto de acopio del circuito corto: en el borde de la central hacia los barrios del humedal El Burro
hacia = np.subtract((0, 0), CORA); hacia = hacia / np.linalg.norm(hacia)
pa = max(ABASTOS, key=lambda p: np.dot(np.subtract(p, CORA), hacia)); acop = np.array(pa) - hacia * 60
agregar('acopio', 'Punto de acopio y circuito corto', *acop, 'propuesto', 'infraestructura')
# huertas: 6 en la ronda de El Burro (a 30 m del agua) y 4 en el área cedida; área en m² [SUP]
HUERTAS = []
for k in range(6):
    (p,), _ = cb.punto(np.array([cb.L * (k + 0.3) / 6]), np.array([32.0]))
    HUERTAS.append(agregar('huerta', 'Huerta de la ronda El Burro %d' % (k + 1), *p, 'propuesto', 'lugar', area_m2=1500))
xs = [p[0] for p in CEDIDA]; ys = [p[1] for p in CEDIDA]; k = 0; intento = 0
while k < 4 and intento < 5000:
    intento += 1; x = min(xs) + (max(xs) - min(xs)) * azar('huerta_cedida', intento); y = min(ys) + (max(ys) - min(ys)) * azar('huerta_cedida_y', intento)
    if dentro(x, y, CEDIDA) and all(math.dist((x, y), (h['x'], h['y'])) > 90 for h in HUERTAS) and math.dist((x, y), dist_p) > 70 and math.dist((x, y), comp_p) > 70:
        HUERTAS.append(agregar('huerta', 'Huerta del área cedida %d' % (k + 1), x, y, 'propuesto', 'lugar', area_m2=4000)); k += 1
# colegios (OpenStreetMap, dentro de 1,5 km) y tiendas de barrio sobre calles locales, una por celda de 110 m
COLEGIOS = []
for s in OSM:
    if s['tipo'] != 'school': continue
    q = [ll(*p) for p in s['pts']]; c = (sum(p[0] for p in q) / len(q), sum(p[1] for p in q) / len(q))
    if math.hypot(*c) < 1500 and not dentro(*c, ABASTOS): COLEGIOS.append(c)
COLEGIOS = sorted(COLEGIOS, key=lambda c: azar('colegio', round(c[0]), round(c[1])))[:10]
for i, c in enumerate(COLEGIOS): agregar('colegio', 'Colegio %d' % (i + 1), *c, clase='organizacion', raciones=800)
celdas = {}
for cls, e in N['edges']:
    if cls != 'local': continue
    q = [en(*a) for a in e]
    if len(q) < 2: continue
    m = q[len(q) // 2]
    if not (250 < math.hypot(*m) < 1450) or dentro(*m, ABASTOS) or dentro(*m, BURRO): continue
    celdas.setdefault((int(m[0] // 100), int(m[1] // 100)), []).append(m)
TIENDAS = []
for kc in sorted(celdas, key=lambda kc: azar('celda', *kc)):
    if len(TIENDAS) >= 150: break  # 150 tiendas: cifra de la guía del grupo (A15 Borde Cívico)
    m = min(celdas[kc], key=lambda p: azar('tienda', round(p[0]), round(p[1])))
    TIENDAS.append(agregar('tienda', 'Tienda %d' % (len(TIENDAS) + 1), *m, clase='organizacion'))
# 6 comedores comunitarios (500 raciones diarias, guía del grupo): los más repartidos entre las tiendas
COMEDORES = []
for _ in range(6):
    t = max(TIENDAS, key=lambda t: min([math.dist((t['x'], t['y']), (c['x'], c['y'])) for c in COMEDORES] + [9e9]) if t['tipo'] == 'tienda' else -1)
    t['tipo'] = 'comedor'; t['nombre'] = 'Comedor comunitario %d' % (len(COMEDORES) + 1); t['raciones'] = 500; COMEDORES.append(t)
TIENDAS = [t for t in TIENDAS if t['tipo'] == 'tienda']
agregar('humedal', 'Humedal El Burro', *centroide(BURRO), clase='especie_lugar', custodio='Custodios del humedal (aula y sendero)')
agregar('humedal', 'Humedal La Vaca', *centroide(VACA), clase='especie_lugar', custodio='Mesa de la ronda y custodios de La Vaca')
print('nodos: %d tiendas, %d comedores, %d colegios, %d huertas' % (len(TIENDAS), len(COMEDORES), len(COLEGIOS), len(HUERTAS)))

# ================================================================ SUBMODELO 1: FAUNA
DT = 0.125; FPS = 24; PASO_CLAVE = 3              # 1 paso = 3 cuadros a 24 fps
CALENT = int(60 / DT)                              # 60 s de calentamiento (no se exporta) [§1.1 política de calentamiento]
VENTANA = int(40 / DT)                             # 40 s exportados (960 cuadros)
MEDICION = int(10 * 60 / DT)                       # 10 min de simulación para las métricas de polinización y caza
TOTAL = max(CALENT + VENTANA, MEDICION)
agua_xy = np.asarray(BURRO); FOCO = np.array(centroide(BURRO))
# punto sobre el agua más cercano al centroide (el humedal es irregular y el centroide puede caer en la orilla)
gx, gy = np.meshgrid(np.linspace(FOCO[0] - 200, FOCO[0] + 200, 81), np.linspace(FOCO[1] - 200, FOCO[1] + 200, 81))
ok = dentro_np(gx.ravel(), gy.ravel(), BURRO); cand = np.stack([gx.ravel()[ok], gy.ravel()[ok]], 1)
# el foco es el punto de agua con más agua alrededor (radio 60 m)
puntaje = [np.count_nonzero(np.hypot(cand[:, 0] - c[0], cand[:, 1] - c[1]) < 60) for c in cand]
FOCO = cand[int(np.argmax(puntaje))]
print('foco de la fauna (agua): (%.0f, %.0f)' % tuple(FOCO))

def unit(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True); return v / np.maximum(n, 1e-9)
def girar(d, objetivo, maxang):
    """Gira cada dirección unitaria d hacia objetivo como máximo maxang radianes (límite de giro, Couzin 2002)."""
    objetivo = unit(objetivo); c = np.clip(np.sum(d * objetivo, -1), -1, 1); ang = np.arccos(c)
    t = np.where(ang > 1e-6, np.minimum(1.0, maxang / np.maximum(ang, 1e-9)), 1.0)
    s = np.sin(ang); seguro = s > 1e-6
    a = np.where(seguro, np.sin((1 - t) * ang) / np.where(seguro, s, 1), 1 - t)
    b = np.where(seguro, np.sin(t * ang) / np.where(seguro, s, 1), t)
    return unit(a[:, None] * d + b[:, None] * objetivo)

class Bandada:
    """Bandada 3D de Couzin et al. (2002): repulsión (prioridad), orientación y atracción, con ángulo ciego y giro limitado.
    Los parámetros de zona están en metros y son [SUP] (los del artículo son adimensionales, en longitudes de cuerpo)."""
    def __init__(self, nombre, n, rr, ro, ra, ciego, vel, giro, ruido, centro, radio_hab, alt, id0):
        self.nombre, self.n = nombre, n; self.rr, self.ro, self.ra = rr, ro, ra
        self.cos_vis = math.cos(math.radians((360 - ciego) / 2)); self.vel, self.giro, self.ruido = vel, math.radians(giro), ruido
        self.centro, self.radio_hab, self.alt = np.array(centro, float), radio_hab, alt
        self.ids = np.arange(id0, id0 + n)  # identidades estables (§3.2)
        r = flujo('inicio', nombre)
        ang = r.uniform(0, 2 * np.pi, n); rad = r.uniform(0, radio_hab * 0.5, n)
        self.x = np.stack([self.centro[0] + np.cos(ang) * rad, self.centro[1] + np.sin(ang) * rad, r.uniform(*alt, n)], 1)
        base = unit(r.normal(size=3)); base[2] = 0; base = unit(base[None])[0]
        self.d = unit(base + r.normal(scale=0.3, size=(n, 3)) * [1, 1, 0.2]); self.vivo = np.ones(n, bool); self.muerte = np.full(n, -1)
    def deseo(self, paso, amenaza=None):
        X, D = self.x, self.d; dif = X[None, :, :] - X[:, None, :]; dist = np.linalg.norm(dif, axis=-1) + np.eye(self.n) * 1e9
        dif_u = dif / dist[..., None]; vivos = self.vivo[None, :] & self.vivo[:, None]
        visible = (np.einsum('ik,ijk->ij', D, dif_u) >= self.cos_vis) & vivos
        zr = (dist < self.rr) & vivos; zo = (dist >= self.rr) & (dist < self.ro) & visible; za = (dist >= self.ro) & (dist < self.ra) & visible
        dr = -np.einsum('ij,ijk->ik', zr, dif_u); do = np.einsum('ij,jk->ik', zo, D); da = np.einsum('ij,ijk->ik', za, dif_u)
        hay_r = zr.any(1); hay_o = zo.any(1); hay_a = za.any(1)
        des = np.where(hay_r[:, None], dr, np.where((hay_o & hay_a)[:, None], 0.5 * (unit(do) + unit(da)),
                       np.where(hay_o[:, None], do, np.where(hay_a[:, None], da, D))))
        # preferencias (§8.4): volver al hábitat y a la franja de altura; no son restricciones físicas
        h = self.centro[None, :2] - X[:, :2]; fuera = np.linalg.norm(h, axis=1) > self.radio_hab
        des = unit(des) + np.where(fuera[:, None], np.concatenate([unit(h) * 0.9, np.zeros((self.n, 1))], 1), 0)
        des[:, 2] += np.where(X[:, 2] < self.alt[0], 0.6, 0) - np.where(X[:, 2] > self.alt[1], 0.6, 0) - 0.4 * D[:, 2]
        if amenaza is not None:  # huida: repulsión de la rapaz, por encima de todo lo demás
            v = X - amenaza[None]; dd = np.linalg.norm(v, axis=1); cerca = dd < 30
            des = np.where(cerca[:, None], unit(v) * 2 + unit(des) * 0.3, des)
        ruido = flujo('ruido', self.nombre, paso).normal(scale=self.ruido, size=(self.n, 3)) * [1, 1, 0.3]
        return unit(unit(des) + ruido)
    def mover(self, des, vel=None):
        self.d = girar(self.d, des, self.giro * DT); v = self.vel if vel is None else vel
        self.x = self.x + self.d * (np.asarray(v)[..., None] if np.ndim(v) else v) * DT
        self.x[:, 2] = np.maximum(self.x[:, 2], 1.5)  # restricción física: no atraviesa el suelo
    def polarizacion(self):
        m = self.vivo; return float(np.linalg.norm(self.d[m].sum(0)) / max(1, m.sum()))
    def giro_grupo(self):
        m = self.vivo; c = self.x[m].mean(0); r = self.x[m] - c; return float(np.linalg.norm(np.cross(unit(r), self.d[m]).sum(0)) / max(1, m.sum()))

# poblaciones (números [SUP]: escala de una tarde de observación en un sector del humedal)
golond = Bandada('golondrina', 60, 0.6, 5.0, 16.0, 60, 9.0, 220, 0.12, FOCO, 110, (4, 22), 0)
torcaz = Bandada('torcaza', 40, 0.8, 7.0, 24.0, 50, 12.0, 160, 0.08, FOCO + [60, -40], 220, (18, 45), 1000)
# insectos: enjambre de quironómidos (presas de Vicsek) sobre el agua, en el foco
NI = 500; ri = flujo('inicio', 'insectos')
ins_x = np.stack([FOCO[0] + ri.normal(scale=35, size=NI), FOCO[1] + ri.normal(scale=35, size=NI), ri.uniform(1, 8, NI)], 1)
ins_v = unit(ri.normal(size=(NI, 3)) * [1, 1, 0.3]); ins_vivo = np.ones(NI, bool); emergidos = NI; comidos = 0
# rapaz: aguililla caminera
rap = {'x': np.array([FOCO[0] - 150, FOCO[1] + 80, 60.0]), 'd': np.array([1.0, 0, 0]), 'estado': 'planea', 'obj': -1, 't': 0, 'manip': 0,
       'ataques': 0, 'capturas': 0}
# nadadoras (2D en el agua): fochas y patos zambullidores
def nacer_en_agua(n, nombre):
    r = flujo('inicio', nombre); P = []
    while len(P) < n:
        p = FOCO + r.normal(scale=70, size=2)
        if dentro(*p, BURRO): P.append(p)
    return np.array(P)
nad = {'focha': nacer_en_agua(16, 'focha'), 'pato': nacer_en_agua(10, 'pato')}
nad_d = {k: unit(np.concatenate([flujo('dir', k).normal(size=(len(v), 2)), np.zeros((len(v), 1))], 1))[:, :2] for k, v in nad.items()}
# garzas en la orilla: posición sobre el contorno (s) y distancia hacia afuera del agua (d)
s_foco = float(cb.acum[np.argmin(np.hypot(cb.p[:, 0] - FOCO[0], cb.p[:, 1] - FOCO[1]))])
gar = {'s': s_foco + flujo('inicio', 'garza').uniform(-260, 260, 12), 'd': flujo('inicio', 'garza_d').uniform(1, 6, 12),
       'esp': np.array(['garza_blanca'] * 5 + ['garcilla'] * 7), 'v': np.zeros(12)}
# custodios en el sendero de la ronda (45 m del agua), ida y vuelta por el tramo cercano al foco
cus = {'s': s_foco + np.array([-200.0, -60, 80, 220]), 'sentido': np.array([1, -1, 1, -1]), 'v': 1.1}
# flores: parcelas en las huertas de la ronda (cultivos que necesitan polinizador) y en la ronda restaurada [SUP]
def flores(escenario):
    F = []
    if escenario != 'actual':
        for h in HUERTAS[:6]:
            for j in range(18):
                r = flujo('flor', h['nombre'], j); F.append([h['x'] + r.uniform(-18, 18), h['y'] + r.uniform(-18, 18), 0.6, 0.8, 0.7, 1, 0])  # tomate, calabaza, fresa
    (P,), _ = cb.punto(np.array([s_foco]), np.array([10.0]))
    nflor = 24 if escenario == 'actual' else 60  # la ronda degradada tiene menos flores
    ss = s_foco + np.linspace(-500, 500, nflor)
    pts, _ = cb.punto(ss, np.full(nflor, 12.0))
    for j, p in enumerate(pts): F.append([p[0], p[1], 0.3, 0.4, 0.5, 0, 0])  # flora nativa de ronda (no cuenta para cosecha)
    return np.array(F, float)  # x, y, tamaño, color, aroma, es_cultivo, (reservado)

def simular_fauna(escenario, exportar):
    global ins_x, ins_v, ins_vivo, emergidos, comidos
    F = flores(escenario); NF = len(F); nectar = np.full(NF, 1.0); NECTAR_MAX, RECARGA = 1.0, 1.0 / 600  # 1 unidad cada 10 min [SUP]
    produccion = NF * 1.0; consumo = 0.0
    # una colmena por huerta de la ronda; en el escenario actual solo una, en la ronda frente al foco
    colmenas = np.array([[h['x'] + 25, h['y'] + 10] for h in HUERTAS[:6]]) if escenario != 'actual' else cb.punto(np.array([s_foco]), np.array([20.0]))[0]
    NA = 80; ra = flujo('inicio', 'abeja', escenario)
    ab = {'x': np.concatenate([colmenas[np.arange(NA) % len(colmenas)] + ra.normal(scale=2, size=(NA, 2)), np.full((NA, 1), 1.0)], 1),
          'obj': -np.ones(NA, int), 'manip': np.zeros(NA), 'carga': np.zeros(NA), 'mem_pos': ra.uniform(0, 1, (NA, 3)), 'mem_neg': ra.uniform(0, 1, (NA, 3)),
          'ultimo': -np.ones(NA, int), 'col': np.arange(NA) % len(colmenas)}
    visitas = np.zeros(NF); polin = np.zeros(NF); vacias = 0
    claves = {} ; met = {'pol_golond': [], 'giro_golond': [], 'pol_torcaz': [], 'cohesion_ins': [], 'atq': []}
    def guardar(clave, esp, frame, x, y, z, yaw, pitch):
        claves.setdefault(clave, {'esp': esp, 'claves': []})['claves'].append([frame, round(float(x), 2), round(float(y), 2), round(float(z), 2), round(float(yaw), 1), round(float(pitch), 1)])
    for paso in range(TOTAL):
        # ---- fase 1: lectura de la instantánea (nadie escribe todavía) y decisión
        amenaza = rap['x'] if rap['estado'] == 'ataca' else None
        des_g = golond.deseo(paso); des_t = torcaz.deseo(paso, amenaza)
        # golondrinas cazadoras: cono de detección (Lin & Abaid 2013): radio 7 m, semiángulo 35° [SUP]
        vivos_i = np.flatnonzero(ins_vivo)
        rel = ins_x[vivos_i][None, :, :] - golond.x[:, None, :]; dd = np.linalg.norm(rel, axis=-1)
        enc = (dd < 7.0) & (np.einsum('ik,ijk->ij', golond.d, rel / np.maximum(dd[..., None], 1e-9)) > math.cos(math.radians(35)))
        tiene = enc.any(1); objetivo = np.where(tiene, vivos_i[np.argmin(np.where(enc, dd, np.inf), 1)], -1)
        des_g = np.where(tiene[:, None], unit(unit(ins_x[np.maximum(objetivo, 0)] - golond.x) * 0.7 + des_g * 0.3), des_g)
        # insectos: Vicsek (radio 2 m) con ruido alto y atracción suave al foco (el enjambre se queda sobre el agua)
        r_i = flujo('ruido', 'insectos', paso)
        if len(vivos_i):
            P = ins_x[vivos_i]; V = ins_v[vivos_i]; dif = np.linalg.norm(P[None] - P[:, None], axis=-1) < 2.0
            media = unit(dif.astype(float) @ V); centro = np.concatenate([FOCO, [4.0]]) - P
            ins_v_nuevo = unit(media + r_i.normal(scale=0.9, size=V.shape) + unit(centro) * 0.25 * (np.linalg.norm(centro, axis=1) > 45)[:, None])
        # rapaz: planea en círculo; cada 25 s ataca a la torcaza más cercana; captura si llega a 1 m (prob. 0,25) [SUP]
        if rap['estado'] == 'planea':
            c = np.concatenate([FOCO + [-60, 40], [60.0]]); r_ = rap['x'] - c; tang = np.array([-r_[1], r_[0], 0]); rad = np.linalg.norm(r_[:2])
            obj_r = unit(tang[None])[0] + unit(np.array([-r_[0], -r_[1], 0])[None])[0] * (rad - 70) / 70 - [0, 0, 0.02 * (r_[2])]
            vel_r = 9.0
            if paso % int(25 / DT) == int(12 / DT) and torcaz.vivo.any():
                rap['estado'] = 'ataca'; rap['t'] = 0; rap['ataques'] += 1
                rap['obj'] = int(np.flatnonzero(torcaz.vivo)[np.argmin(np.linalg.norm(torcaz.x[torcaz.vivo] - rap['x'], axis=1))])
        elif rap['estado'] == 'ataca':
            obj_r = torcaz.x[rap['obj']] - rap['x']; vel_r = 17.0; rap['t'] += DT
        else:  # manipula la presa: se posa en un árbol de la ronda durante 2 min y vuelve a planear
            (pp,), _ = cb.punto(np.array([s_foco + 300]), np.array([40.0])); obj_r = np.array([pp[0], pp[1], 6.0]) - rap['x']; vel_r = 6.0 if np.linalg.norm(obj_r) > 2 else 0.0
            rap['manip'] += DT
            if rap['manip'] > 120: rap['estado'] = 'planea'; rap['manip'] = 0
        # abejas: elección de flor por atractivo (Qu et al. 2013): ((1 + DNV) / (1 + DPV))² / sqrt(1 + d)
        libres = (ab['obj'] < 0) & (ab['manip'] <= 0) & (ab['carga'] < 10)
        if libres.any():
            dpv = np.linalg.norm(ab['mem_pos'][libres][:, None, :] - F[None, :, 2:5], axis=-1)
            dnv = np.linalg.norm(ab['mem_neg'][libres][:, None, :] - F[None, :, 2:5], axis=-1)
            dist_f = np.linalg.norm(ab['x'][libres][:, None, :2] - F[None, :, :2], axis=-1)
            atr = ((1 + dnv) / (1 + dpv)) ** 2 / np.sqrt(1 + dist_f) * (dist_f < 90)  # rango de percepción 90 m [SUP]
            atr[np.arange(atr.shape[0]), np.maximum(ab['ultimo'][libres], 0)] *= np.where(ab['ultimo'][libres] >= 0, 0.05, 1)  # no repite la misma flor
            ruido_a = flujo('ruido', 'abeja', escenario, paso).uniform(0.7, 1.3, atr.shape)
            ab['obj'][libres] = np.where(atr.max(1) > 0, np.argmax(atr * ruido_a, 1), -1)
        # ---- fase 2: interacciones (resolución serial y atómica con orden estable, §10.2)
        eventos = []
        for i in np.flatnonzero(objetivo >= 0):
            if np.linalg.norm(ins_x[objetivo[i]] - golond.x[i]) < 0.6: eventos.append((azar('orden', paso, 'g', int(golond.ids[i])), 'caza', i, int(objetivo[i])))
        if rap['estado'] == 'ataca':
            if np.linalg.norm(torcaz.x[rap['obj']] - rap['x']) < 1.5: eventos.append((azar('orden', paso, 'r'), 'rapaz', rap['obj'], 0))
            elif rap['t'] > 8.0 or not torcaz.vivo[rap['obj']]: rap['estado'] = 'planea'
        en_flor = (ab['obj'] >= 0) & (np.linalg.norm(ab['x'][:, :2] - F[np.maximum(ab['obj'], 0), :2], axis=1) < 0.5) & (ab['manip'] <= 0)
        for i in np.flatnonzero(en_flor): eventos.append((azar('orden', paso, 'a', int(i)), 'nectar', int(i), int(ab['obj'][i])))
        for _, tipo, i, j in sorted(eventos):
            if tipo == 'caza' and ins_vivo[j]:
                ins_vivo[j] = False; comidos += 1
            elif tipo == 'rapaz' and torcaz.vivo[i] and rap['estado'] == 'ataca':
                if azar('captura', paso) < 0.25:
                    torcaz.vivo[i] = False; torcaz.muerte[i] = paso; rap['estado'] = 'manipula'; rap['capturas'] += 1
                else: rap['estado'] = 'planea'
            elif tipo == 'nectar':
                toma = min(nectar[j], 1.0)
                if toma > 0.05:
                    nectar[j] -= toma; consumo += toma; ab['carga'][i] += 1; ab['mem_pos'][i] = F[j, 2:5]; visitas[j] += 1
                    u_ = ab['ultimo'][i]
                    if F[j, 5] and u_ >= 0 and F[u_, 5]: polin[j] += 1  # llega con polen de otra flor de cultivo
                else:
                    ab['mem_neg'][i] = F[j, 2:5]; vacias += 1
                ab['ultimo'][i] = j; ab['obj'][i] = -1; ab['manip'][i] = 3.0  # 3 s en la flor
        # ---- fase 3: el motor publica (movimiento y recursos)
        golond.mover(des_g); torcaz.mover(des_t, np.where(np.linalg.norm(torcaz.x - rap['x'], axis=1) < 30, 15.0, torcaz.vel))
        if len(vivos_i): ins_v[vivos_i] = ins_v_nuevo; ins_x[vivos_i] += ins_v[vivos_i] * 1.2 * DT; ins_x[:, 2] = np.clip(ins_x[:, 2], 0.5, 12)
        # emergencia: los comidos se reponen en el agua (cuenta de insectos cerrada: vivos + comidos = emergidos)
        muertos = np.flatnonzero(~ins_vivo)
        if len(muertos) and paso % 8 == 0:
            r_e = flujo('emerge', paso); k_ = muertos[:max(1, len(muertos) // 4)]
            ins_x[k_] = np.stack([FOCO[0] + r_e.normal(scale=35, size=len(k_)), FOCO[1] + r_e.normal(scale=35, size=len(k_)), np.full(len(k_), 0.6)], 1)
            ins_vivo[k_] = True; emergidos += len(k_)
        if np.linalg.norm(obj_r) > 1e-3: rap['d'] = girar(rap['d'][None], np.asarray(obj_r, float)[None], math.radians(120) * DT)[0]
        rap['x'] = rap['x'] + rap['d'] * vel_r * DT; rap['x'][2] = max(rap['x'][2], 3.0)
        # nadadoras: grupos pequeños (repulsión 1,5 m, atracción 12 m), 0,35 m/s, giran al tocar la orilla
        for k_, P in nad.items():
            D2 = nad_d[k_]; dif = P[None] - P[:, None]; dist = np.linalg.norm(dif, axis=-1) + np.eye(len(P)) * 1e9
            rep = -(dif / dist[..., None] * (dist < 1.5)[..., None]).sum(1); atr_ = (dif / dist[..., None] * ((dist > 4) & (dist < 12))[..., None]).sum(1)
            des = unit(D2 + rep * 2 + atr_ * 0.3 + flujo('ruido', k_, paso).normal(scale=0.3, size=P.shape))
            nuevo = P + des * 0.35 * DT; fuera = ~dentro_np(nuevo[:, 0], nuevo[:, 1], BURRO)
            des[fuera] = unit(FOCO[None] - P[fuera]); nuevo[fuera] = P[fuera]
            nad[k_] = nuevo; nad_d[k_] = unit(D2 * 0.9 + des * 0.1)
        # garzas: pasos cortos con pausas; se alejan (hacia el agua) si un custodio pasa a menos de 15 m (distancia de huida)
        cpos, _ = cb.punto(cus['s'], np.full(4, 45.0)); gpos, _ = cb.punto(gar['s'], gar['d'])
        dmin = np.min(np.linalg.norm(gpos[:, None] - cpos[None], axis=-1), 1)
        r_g = flujo('ruido', 'garza', paso); camina = r_g.uniform(size=12) < 0.02
        gar['v'] = np.where(camina, r_g.choice([-0.4, 0.4], 12), gar['v'] * 0.995)
        gar['s'] += gar['v'] * DT; gar['d'] = np.clip(gar['d'] + np.where(dmin < 15, -0.8, 0.05) * DT, -3, 8)
        cus['s'] += cus['sentido'] * cus['v'] * DT
        vuelta = np.abs(cus['s'] - s_foco) > 320; cus['sentido'] = np.where(vuelta, -np.sign(cus['s'] - s_foco), cus['sentido'])
        # abejas: vuelo a la flor o a la colmena (6 m/s), recarga de néctar
        ab['manip'] -= DT; vuela = (ab['manip'] <= 0)
        destino = np.where((ab['carga'] >= 10)[:, None], colmenas[ab['col']], np.where((ab['obj'] >= 0)[:, None], F[np.maximum(ab['obj'], 0), :2], ab['x'][:, :2]))
        v2 = destino - ab['x'][:, :2]; dn = np.linalg.norm(v2, axis=1); paso_a = np.minimum(dn, 6.0 * DT)
        ab['x'][:, :2] += np.where(vuela[:, None], v2 / np.maximum(dn, 1e-9)[:, None] * paso_a[:, None], 0)
        ab['x'][:, 2] = np.where(dn > 3, 2.5, 0.8)
        llego = (ab['carga'] >= 10) & (dn < 0.5); ab['carga'][llego] = 0; ab['manip'][llego] = 20.0
        recarga = np.minimum(NECTAR_MAX - nectar, RECARGA * DT); nectar += recarga; produccion += recarga.sum()
        # ---- métricas e invariantes
        if paso % 8 == 0:
            met['pol_golond'].append(golond.polarizacion()); met['giro_golond'].append(golond.giro_grupo()); met['pol_torcaz'].append(torcaz.polarizacion())
            P = ins_x[ins_vivo]; dmn = np.sort(np.linalg.norm(P[None] - P[:, None], axis=-1), 1)[:, 1]; met['cohesion_ins'].append(float(np.exp(-dmn.mean() / 2.0)))
            assert np.count_nonzero(ins_vivo) + comidos == emergidos, 'I: cuenta de insectos'
            assert abs(produccion - consumo - nectar.sum()) < 1e-6, 'I: cuenta de néctar'
        # ---- exportar la ventana (después del calentamiento)
        if exportar and CALENT <= paso < CALENT + VENTANA and ((paso - CALENT) % 2 == 0 or paso == CALENT + VENTANA - 1):
            fr = int(round((paso - CALENT) * DT * FPS))  # una clave cada 2 pasos = 6 cuadros (0,25 s)
            for B, esp in ((golond, 'golondrina'), (torcaz, 'torcaza')):
                for i in range(B.n):
                    if not B.vivo[i] and B.muerte[i] < paso - 1: continue
                    d = B.d[i]; guardar('%s_%03d' % (esp, i), esp, fr, *B.x[i], math.degrees(math.atan2(d[1], d[0])), math.degrees(math.asin(np.clip(d[2], -1, 1))))
            d = rap['d']; guardar('rapaz_0', 'rapaz', fr, *rap['x'], math.degrees(math.atan2(d[1], d[0])), math.degrees(math.asin(np.clip(d[2], -1, 1))))
            for k_, P in nad.items():
                for i in range(len(P)): guardar('%s_%02d' % (k_, i), k_, fr, P[i, 0], P[i, 1], 0.05, math.degrees(math.atan2(nad_d[k_][i, 1], nad_d[k_][i, 0])), 0)
            gpos, gt = cb.punto(gar['s'], gar['d'])
            for i in range(12):
                sg = 1 if gar['v'][i] >= 0 else -1; guardar('garza_%02d' % i, str(gar['esp'][i]), fr, gpos[i, 0], gpos[i, 1], 0.0, math.degrees(math.atan2(gt[i, 1] * sg, gt[i, 0] * sg)), 0)
            cpos, ct = cb.punto(cus['s'], np.full(4, 45.0))
            for i in range(4):
                sg = cus['sentido'][i]; guardar('custodio_%d' % i, 'custodio', fr, cpos[i, 0], cpos[i, 1], 0.0, math.degrees(math.atan2(ct[i, 1] * sg, ct[i, 0] * sg)), 0)
            for i in range(NA):
                if i % 2: continue  # la mitad basta para leer el movimiento
                v = destino[i] - ab['x'][i, :2]; guardar('abeja_%02d' % i, 'abeja', fr, *ab['x'][i], math.degrees(math.atan2(v[1], v[0])), 0)
    seg = TOTAL * DT
    cultivo = F[:, 5] == 1
    res = {'escenario': escenario, 'segundos_simulados': seg, 'pasos': TOTAL, 'flores': int(NF), 'flores_cultivo': int(cultivo.sum()),
           'visitas_por_flor_hora_cultivo': float(visitas[cultivo].sum() / max(1, cultivo.sum()) / (seg / 3600)) if cultivo.any() else 0.0,
           'polinizaciones_por_flor_hora_cultivo': float(polin[cultivo].sum() / max(1, cultivo.sum()) / (seg / 3600)) if cultivo.any() else 0.0,
           'visitas_flora_ronda_hora': float(visitas[~cultivo].sum() / (seg / 3600)), 'visitas_a_flor_vacia': int(vacias),
           'nectar': {'producido': round(produccion, 3), 'consumido': round(consumo, 3), 'en_flores': round(float(nectar.sum()), 3)},
           'insectos': {'emergidos': int(emergidos), 'comidos_por_golondrinas': int(comidos), 'vivos': int(ins_vivo.sum()),
                        'capturas_por_golondrina_min': float(comidos / golond.n / (seg / 60))},
           'rapaz': {'ataques': rap['ataques'], 'capturas': rap['capturas']},
           'bandadas': {'polarizacion_golondrinas_media': float(np.mean(met['pol_golond'])), 'giro_golondrinas_media': float(np.mean(met['giro_golond'])),
                        'polarizacion_torcazas_media': float(np.mean(met['pol_torcaz'])), 'cohesion_enjambre_media': float(np.mean(met['cohesion_ins']))}}
    return res, claves

def reiniciar_fauna():
    global golond, torcaz, ins_x, ins_v, ins_vivo, emergidos, comidos, rap, nad, nad_d, gar, cus
    golond = Bandada('golondrina', 60, 0.6, 5.0, 16.0, 60, 9.0, 220, 0.12, FOCO, 110, (4, 22), 0)
    torcaz = Bandada('torcaza', 40, 0.8, 7.0, 24.0, 50, 12.0, 160, 0.08, FOCO + [60, -40], 220, (18, 45), 1000)
    ri = flujo('inicio', 'insectos')
    ins_x = np.stack([FOCO[0] + ri.normal(scale=35, size=NI), FOCO[1] + ri.normal(scale=35, size=NI), ri.uniform(1, 8, NI)], 1)
    ins_v = unit(ri.normal(size=(NI, 3)) * [1, 1, 0.3]); ins_vivo = np.ones(NI, bool); emergidos = NI; comidos = 0
    rap = {'x': np.array([FOCO[0] - 150, FOCO[1] + 80, 60.0]), 'd': np.array([1.0, 0, 0]), 'estado': 'planea', 'obj': -1, 't': 0, 'manip': 0, 'ataques': 0, 'capturas': 0}
    nad = {'focha': nacer_en_agua(16, 'focha'), 'pato': nacer_en_agua(10, 'pato')}
    nad_d = {k: unit(np.concatenate([flujo('dir', k).normal(size=(len(v), 2)), np.zeros((len(v), 1))], 1))[:, :2] for k, v in nad.items()}
    gar = {'s': s_foco + flujo('inicio', 'garza').uniform(-260, 260, 12), 'd': flujo('inicio', 'garza_d').uniform(1, 6, 12),
           'esp': np.array(['garza_blanca'] * 5 + ['garcilla'] * 7), 'v': np.zeros(12)}
    cus = {'s': s_foco + np.array([-200.0, -60, 80, 220]), 'sentido': np.array([1, -1, 1, -1]), 'v': 1.1}

CACHE = os.path.join(OUT, '_cache_fauna.json')
if os.environ.get('K360_CACHE_FAUNA') and os.path.exists(CACHE):  # para iterar sobre el submodelo de alimentos sin repetir la fauna
    fauna_actual, fauna_prop, CLAVES_FAUNA = json.load(open(CACHE, encoding='utf-8')); print('fauna: desde la caché')
else:
    print('fauna: simulando %d pasos por escenario...' % TOTAL)
    fauna_actual, _ = simular_fauna('actual', False)
    reiniciar_fauna()
    fauna_prop, CLAVES_FAUNA = simular_fauna('propuesto', True)
    json.dump([fauna_actual, fauna_prop, CLAVES_FAUNA], open(CACHE, 'w', encoding='utf-8'))
print('  polinizaciones/flor/h: actual %.2f, propuesto %.2f' % (fauna_actual['polinizaciones_por_flor_hora_cultivo'], fauna_prop['polinizaciones_por_flor_hora_cultivo']))

# ================================================================ SUBMODELO 2: ALIMENTOS (un paso = un día)
GRUPOS = ['hortalizas', 'hongos', 'frutas', 'granos_tuberculos', 'carne_lacteos']
LOCAL = {'hortalizas', 'hongos'}                     # lo que Kennedy puede producir (autonomía relativa, corrección 3.8)
CONJUNTA = {'granos_tuberculos', 'frutas'}           # lo que la federación compra en conjunto a asociaciones de productores
P = {  # parámetros: [SUP] = supuesto declarado para discutir; [GRUPO] = cifra de los documentos del grupo
    'dias': 120,
    'demanda_tienda_kg': {'hortalizas': 30, 'hongos': 0, 'frutas': 25, 'granos_tuberculos': 40, 'carne_lacteos': 25},  # [SUP] kg/día
    'kg_racion': 0.45,                               # [SUP] kg de alimento por ración
    'reparto_racion': {'hortalizas': 0.3, 'hongos': 0.0, 'frutas': 0.15, 'granos_tuberculos': 0.35, 'carne_lacteos': 0.2},  # [SUP]
    'sustitucion_carne_hongos': 0.15,                # [SUP] valor del grupo: 15 % de la carne pasa a proteína de hongos
    'otros_canales': 0.15,                           # [SUP] parte que hoy no viene de Corabastos (distribuidores, supermercados)
    'rend_huerta_kg_m2_dia': 3.0 / 365,              # [SUP] 3 kg/m²/año en huerta urbana intensiva
    'frac_cultivo_polinizado': 0.35,                 # [SUP] parte de la cosecha que depende de polinizadores (tomate, calabaza, fresa)
    'polin_media_saturacion': 20.0,                  # [SUP] polinizaciones por parche floral y hora con las que se logra el 63 % del cuajado
    'compost_bonus': 0.15,                           # [SUP] aumento de rendimiento con compost de los orgánicos de Corabastos
    'hongos_kg_dia_max': 700,                        # [SUP] capacidad del distrito (sustrato de las bodegas, eficiencia 70 %)
    'energia_respaldo': 0.6,                         # [SUP] fracción de producción con respaldo (biogás del compostaje + solar)
    'apagon': (40, 44),                              # días de falla eléctrica en PROPUESTO_APAGON
    'conjunta_cap_kg_dia': 3500,                     # [SUP] lo que las asociaciones de productores alcanzan a despachar al acopio
    'precio_cora': 1.0, 'precio_acopio': 0.97,       # [SUP] precios relativos por kg (el acopio sin intermediarios)
    'costo_viaje_kg_km': 0.012,                      # [SUP] costo relativo del transporte del tendero por kg y km
    'elasticidad_cora': 0.35,                        # [SUP] cuánto baja la central su precio por cada unidad de volumen perdido
    'aprendizaje': 0.15,                             # [SUP] velocidad con la que el tendero ajusta su confianza
    'cesion_area': CESION,                           # [GRUPO] Corabastos cede el 20,8 % al humedal La Vaca
}
COMPRADORES = [dict(t, demanda={g: P['demanda_tienda_kg'][g] for g in GRUPOS}) for t in TIENDAS] + \
              [dict(c, demanda={g: c['raciones'] * P['kg_racion'] * P['reparto_racion'][g] for g in GRUPOS}) for c in COMEDORES] + \
              [dict({'tipo': 'colegio', 'nombre': n['nombre'], 'x': n['x'], 'y': n['y'], 'raciones': n['raciones']}, demanda={g: n['raciones'] * 0.3 * P['reparto_racion'][g] for g in GRUPOS}) for n in NODOS if n['tipo'] == 'colegio']
for c in COMPRADORES:
    c['dist_cora_km'] = math.dist((c['x'], c['y']), CORA) / 1000; c['dist_acopio_km'] = math.dist((c['x'], c['y']), acop) / 1000
    c['barrio'] = (int(c['x'] // 500), int(c['y'] // 500))  # sector de 500 m para la regla de rotación

def simular_alimentos(escenario):
    prop = escenario != 'actual'
    hist = []; confianza = {i: 0.0 for i in range(len(COMPRADORES))}
    precio_cora = P['precio_cora']; V0 = None
    ledger = {'producido_local': 0.0, 'conjunta': 0.0, 'corabastos': 0.0, 'otros': 0.0, 'consumido': 0.0, 'perdido_local': 0.0}
    fp = 1 - math.exp(-fauna_prop['polinizaciones_por_flor_hora_cultivo'] / P['polin_media_saturacion'])  # acople con la fauna
    factor_huerta = (1 - P['frac_cultivo_polinizado']) + P['frac_cultivo_polinizado'] * fp
    area_h = sum(h['area_m2'] for h in HUERTAS)
    for dia in range(P['dias']):
        # ---- oferta local del día
        oferta = {g: 0.0 for g in GRUPOS}
        if prop:
            madurez = min(1.0, dia / 30)  # las huertas y el distrito arrancan en el primer mes
            oferta['hortalizas'] = area_h * P['rend_huerta_kg_m2_dia'] * factor_huerta * (1 + P['compost_bonus']) * madurez
            energia = P['energia_respaldo'] if escenario == 'propuesto_apagon' and P['apagon'][0] <= dia < P['apagon'][1] else 1.0
            oferta['hongos'] = P['hongos_kg_dia_max'] * madurez * energia
            for g in CONJUNTA: oferta[g] = P['conjunta_cap_kg_dia'] / len(CONJUNTA) * min(1.0, dia / 45)
        ledger['producido_local'] += oferta['hortalizas'] + oferta['hongos']; ledger['conjunta'] += sum(oferta[g] for g in CONJUNTA)
        # ---- pedidos (lectura de la instantánea del día anterior)
        pedidos = []
        for i, c in enumerate(COMPRADORES):
            dem = dict(c['demanda'])
            if prop:  # valor del grupo: parte de la carne se reemplaza por proteína de hongos
                s_ = dem['carne_lacteos'] * P['sustitucion_carne_hongos']; dem['carne_lacteos'] -= s_; dem['hongos'] += s_
            costo_cora = precio_cora + P['costo_viaje_kg_km'] * c['dist_cora_km']; costo_acop = P['precio_acopio'] + P['costo_viaje_kg_km'] * c['dist_acopio_km']
            ventaja = (costo_cora - costo_acop) / costo_cora
            querer = min(1.0, max(0.0, confianza[i] + 4 * ventaja)) if prop else 0.0
            pedidos.append((i, dem, querer))
        # ---- regla del acopio (gobernanza, corrección 3.5): reparto por sectores con prioridad rotativa; nadie recibe más
        # de lo que pidió y el turno de los sectores cambia cada día, para que el acopio no concentre ni favorezca
        sectores = sorted({COMPRADORES[i]['barrio'] for i, _, _ in pedidos}, key=lambda b: azar('rotacion', dia, *b))
        orden = sorted(pedidos, key=lambda p: (sectores.index(COMPRADORES[p[0]]['barrio']), azar('turno', dia, p[0])))
        restante = dict(oferta); recibido = {}
        for i, dem, querer in orden:
            r = {}
            for g in GRUPOS:
                if not prop or (g not in LOCAL and g not in CONJUNTA): r[g] = 0.0; continue
                quiere = dem[g] * (1.0 if g == 'hongos' else querer)  # los hongos solo salen del distrito
                r[g] = min(quiere, restante[g]); restante[g] -= r[g]
            recibido[i] = r
        # ---- compras en Corabastos y otros canales (lo que falta) y aprendizaje del tendero
        via_cora = via_otros = via_acop = 0.0; viajes = {'comprador_cora': 0, 'comprador_acopio': 0, 'bicicarga': 0}
        por_grupo = {g: {'cora': 0.0, 'acopio': 0.0, 'otros': 0.0} for g in GRUPOS}
        for i, dem, querer in pedidos:
            c = COMPRADORES[i]; r = recibido[i]; pedido_acop = sum(dem[g] * (1.0 if g == 'hongos' else querer) for g in GRUPOS if prop and (g in LOCAL or g in CONJUNTA))
            for g in GRUPOS:
                falta = dem[g] - r[g]; o = falta * P['otros_canales']; k_ = falta - o
                via_cora += k_; via_otros += o; via_acop += r[g]
                por_grupo[g]['cora'] += k_; por_grupo[g]['otros'] += o; por_grupo[g]['acopio'] += r[g]
            if prop and pedido_acop > 0:
                cumplido = sum(r.values()) / pedido_acop; confianza[i] += P['aprendizaje'] * (cumplido - 0.5) * (1 - confianza[i] if cumplido > 0.5 else confianza[i] + 0.05)
                confianza[i] = min(1.0, max(0.0, confianza[i]))
            # viajes: cada viaje de compra a Corabastos trae en promedio 160 kg; el acopio despacha en bicicarga (120 kg) si
            # el comprador queda a menos de 2,5 km, si no en furgón (400 kg) [SUP]
            kg_cora = sum(dem[g] - r[g] for g in GRUPOS) * (1 - P['otros_canales']); kg_acop = sum(r.values())
            viajes['comprador_cora'] += kg_cora / 160
            if c['dist_acopio_km'] < 2.5: viajes['bicicarga'] += math.ceil(kg_acop / 120) if kg_acop > 5 else 0
            else: viajes['comprador_acopio'] += math.ceil(kg_acop / 400) if kg_acop > 5 else 0
        viajes['comprador_cora'] = int(round(viajes['comprador_cora']))
        ledger['perdido_local'] += sum(restante[g] for g in LOCAL) * 0.5  # la mitad de lo no vendido se pierde (el resto va a compostaje)
        consumo = via_cora + via_otros + via_acop; ledger['consumido'] += consumo; ledger['corabastos'] += via_cora; ledger['otros'] += via_otros
        # ---- respuesta de la central (bucle de compensación): pierde volumen -> baja el precio para retener tenderos
        V0 = V0 or via_cora
        precio_cora = P['precio_cora'] * (1 - P['elasticidad_cora'] * max(0.0, 1 - via_cora / V0)) if prop else P['precio_cora']
        hist.append({'dia': dia, 'consumo_kg': round(consumo, 1), 'via_corabastos_kg': round(via_cora, 1), 'via_acopio_kg': round(via_acop, 1),
                     'otros_canales_kg': round(via_otros, 1), 'dependencia_volumen': round(via_cora / consumo, 4),
                     'local_kg': round(sum(recibido[i][g] for i in recibido for g in LOCAL), 1), 'conjunta_kg': round(sum(recibido[i][g] for i in recibido for g in CONJUNTA), 1),
                     'precio_corabastos': round(precio_cora, 4), 'confianza_media': round(sum(confianza.values()) / len(confianza), 4),
                     'camiones_externos_corabastos': math.ceil(via_cora / 10000 * 1.0), 'camiones_conjunta_acopio': math.ceil(sum(recibido[i][g] for i in recibido for g in CONJUNTA) / 10000),
                     'viajes': viajes, 'por_grupo': {g: {k: round(v, 1) for k, v in d.items()} for g, d in por_grupo.items()},
                     'oferta_local': {g: round(oferta[g], 1) for g in GRUPOS}, 'sobrante': {g: round(restante[g], 1) for g in GRUPOS}})
    # invariante de la cuenta de alimentos: lo consumido = lo que llegó por cada canal
    entregado_acopio = sum(h['via_acopio_kg'] for h in hist)
    assert abs(ledger['consumido'] - ledger['corabastos'] - ledger['otros'] - entregado_acopio) < 1e-3 * ledger['consumido'] + 1, 'I: cuenta de alimentos'
    return hist, ledger, confianza

ESC = ['actual', 'propuesto', 'propuesto_apagon']
ALIM = {}
for e in ESC:
    h, led, conf = simular_alimentos(e); ALIM[e] = (h, led, conf)
    u_ = h[-1]; print('alimentos %-17s dependencia de Corabastos (volumen, día %d): %.1f %%' % (e, u_['dia'], 100 * u_['dependencia_volumen']))

# ---------------------------------------------------------------- viajes del último día para la secuencia de Unreal
# Cada ficha es un viaje real del día del modelo, por la malla vial; el tiempo se comprime: 60 s de video = la mañana de
# distribución (4:00-10:00) y cada ficha recorre su ruta a 220 m/s de video. Convención de diagrama, no de tráfico.
FPS_A, DUR_A, PASO_A, VEL_VIDEO = 24, 60.0, 6, 220.0
print('rutas: calculando árboles de caminos...')
n_cora = cercano(CORA); n_acop = cercano(acop); n_dist = cercano(dist_p); n_comp = cercano(comp_p)
ARBOL = {k: dijkstra(n) for k, n in (('cora', n_cora), ('acopio', n_acop), ('distrito', n_dist), ('compostaje', n_comp))}
# accesos de los camiones externos: nodos de avenida en el borde del área de la red, repartidos por ángulo
mayor = np.zeros(len(nodos), bool)
for i in adj:
    if any(c == 'major' for _, _, _, c in adj[i]): mayor[i] = True
rad = np.hypot(XY[:, 0], XY[:, 1]); cand = np.flatnonzero(mayor & EN_RED & (rad > 2300))
ACCESOS = []
for a0 in np.linspace(-np.pi, np.pi, 7)[:-1]:
    ang = np.arctan2(XY[cand, 1], XY[cand, 0]); dif = np.abs((ang - a0 + np.pi) % (2 * np.pi) - np.pi)
    j = cand[np.argmin(dif - rad[cand] / 1e5)]
    if j in ARBOL['cora'][0] and j not in ACCESOS: ACCESOS.append(int(j))
def claves_ruta(pts, inicio_fr):
    L = longitud(pts); dur = L / VEL_VIDEO * FPS_A; claves = []; acum = [0.0]
    for i in range(len(pts) - 1): acum.append(acum[-1] + math.dist(pts[i], pts[i + 1]))
    fr = inicio_fr; fin = inicio_fr + max(1, int(dur))
    while True:
        s = min(L, (fr - inicio_fr) / max(dur, 1e-9) * L); i = max(0, min(len(pts) - 2, int(np.searchsorted(acum, s, side='right') - 1)))
        f = (s - acum[i]) / max(acum[i + 1] - acum[i], 1e-9); x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f; y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
        claves.append([int(fr), round(x, 1), round(y, 1), round(math.degrees(math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])), 1)])
        if fr >= fin: break
        fr = min(fin, fr + PASO_A)
    return claves, fin
def fichas(escenario):
    h = ALIM[escenario][0][-1]; F_ = []; cuadros = int(DUR_A * FPS_A)
    def nueva(tipo, pts, k):
        if not pts or len(pts) < 2: return
        dur = longitud(pts) / VEL_VIDEO * FPS_A
        ini = int(azar('salida', escenario, tipo, k) * max(1, cuadros - dur))  # salidas repartidas en la mañana
        cl, fin = claves_ruta(pts, ini); F_.append({'tipo': tipo, 'inicio': ini, 'fin': fin, 'claves': cl})
    for k in range(h['camiones_externos_corabastos']):
        a = ACCESOS[k % len(ACCESOS)]; r = ruta(ARBOL['cora'][1], n_cora, a); nueva('camion_externo', r[::-1] if r else None, k)
    for k in range(h['camiones_conjunta_acopio']):
        a = ACCESOS[(k + 3) % len(ACCESOS)]; r = ruta(ARBOL['acopio'][1], n_acop, a); nueva('camion_conjunta', r[::-1] if r else None, k)
    # tenderos que van a Corabastos ese día (ida y vuelta: se muestra la vuelta con la mercancía)
    hoy = [c for i, c in enumerate(COMPRADORES)]
    va_cora = h['viajes']['comprador_cora']; va_acop = h['viajes']['comprador_acopio']; bici = h['viajes']['bicicarga']
    orden = sorted(range(len(COMPRADORES)), key=lambda i: azar('quien', escenario, i))
    for k, i in enumerate(orden[:va_cora]):
        c = COMPRADORES[i]; nueva('comprador', ruta(ARBOL['cora'][1], n_cora, cercano((c['x'], c['y']))), k)
    for k, i in enumerate(orden[va_cora:va_cora + bici]):
        c = COMPRADORES[i]; nueva('bicicarga', ruta(ARBOL['acopio'][1], n_acop, cercano((c['x'], c['y']))), k)
    for k, i in enumerate(orden[va_cora + bici:va_cora + bici + va_acop]):
        c = COMPRADORES[i]; nueva('comprador_acopio', ruta(ARBOL['acopio'][1], n_acop, cercano((c['x'], c['y']))), k)
    if escenario != 'actual':
        for k in range(max(1, int(h['oferta_local']['hongos'] / 150))):  # el distrito lleva hongos al acopio (furgón de 150 kg)
            r = ruta(ARBOL['distrito'][1], n_dist, n_acop); nueva('hongos', r, k)
        for k, hu in enumerate(HUERTAS):  # cosecha de cada huerta al acopio y compost de la estación a cada huerta
            r = ruta(ARBOL['acopio'][1], n_acop, cercano((hu['x'], hu['y']))); nueva('cosecha', r[::-1] if r else None, k)
            nueva('compost', ruta(ARBOL['compostaje'][1], n_comp, cercano((hu['x'], hu['y']))), k)
    return {'fps': FPS_A, 'cuadros': cuadros, 'suelo': SUELO, 'escenario': escenario, 'fichas': F_}
for e in ESC:
    d = fichas(e); json.dump(d, open(os.path.join(OUT, 'alimentos_%s.json' % e), 'w', encoding='utf-8'))
    print('  %s: %d fichas' % (e, len(d['fichas'])))
json.dump({'fps': FPS, 'cuadros': int(VENTANA * DT * FPS), 'suelo': SUELO, 'foco': [float(FOCO[0]), float(FOCO[1])], 'agentes': CLAVES_FAUNA},
          open(os.path.join(OUT, 'fauna.json'), 'w', encoding='utf-8'))
json.dump({'suelo': SUELO, 'nodos': NODOS, 'cedida': [[round(p[0], 1), round(p[1], 1)] for p in CEDIDA], 'corabastos': [[round(p[0], 1), round(p[1], 1)] for p in ABASTOS]},
          open(os.path.join(OUT, 'nodos.json'), 'w', encoding='utf-8'), ensure_ascii=False)

# ---------------------------------------------------------------- mallas (OBJ en metros; Unreal las escala x100)
def obj(nombre, partes):
    """partes: lista de (material, lista de triángulos de 3 vértices (x, y, z)); frente hacia +X, arriba +Z."""
    with open(os.path.join(OUT, nombre + '.obj'), 'w') as f:
        f.write('# REN3D - %s\ng %s\n' % (nombre, nombre)); n = 0
        for m, tris in partes:
            for t in tris:
                for p in t: f.write('v %.4f %.4f %.4f\n' % p)
        for m, tris in partes:  # UV planas (x, y): el importador de OBJ de Unreal exige UV en cada cara
            for t in tris:
                for p in t: f.write('vt %.4f %.4f\n' % (p[0], p[1]))
        for m, tris in partes:
            f.write('usemtl %s\n' % m)
            for t in tris: f.write('f %d/%d %d/%d %d/%d\n' % (n + 1, n + 1, n + 2, n + 2, n + 3, n + 3)); n += 3
def elipsoide(c, r, nu=10, nv=6):
    T = []
    def p(i, j):
        a = 2 * math.pi * i / nu; b = math.pi * j / nv - math.pi / 2
        return (c[0] + r[0] * math.cos(b) * math.cos(a), c[1] + r[1] * math.cos(b) * math.sin(a), c[2] + r[2] * math.sin(b))
    for i in range(nu):
        for j in range(nv):
            a, b, cc, d = p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1); T += [(a, b, cc), (a, cc, d)]
    return T
def caja(c, s):
    v = [(c[0] + sx * s[0], c[1] + sy * s[1], c[2] + sz * s[2]) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]; T = []
    for f in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
        a, b, cc, d = (v[i] for i in f); T += [(a, b, cc), (a, cc, d)]
    return T
def ala(raiz, punta, ancho, z):
    return [((raiz[0] + ancho / 2, raiz[1], z), (raiz[0] - ancho / 2, raiz[1], z), (punta[0], punta[1], z)), ((raiz[0] - ancho / 2, raiz[1], z), (raiz[0] + ancho / 2, raiz[1], z), (punta[0], punta[1], z))]
def cilindro(c, r, h, n=12, z0=0.0):
    T = []
    for i in range(n):
        a, b = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p0, p1 = (c[0] + r * math.cos(a), c[1] + r * math.sin(a)), (c[0] + r * math.cos(b), c[1] + r * math.sin(b))
        T += [((p0[0], p0[1], z0), (p1[0], p1[1], z0), (p1[0], p1[1], z0 + h)), ((p0[0], p0[1], z0), (p1[0], p1[1], z0 + h), (p0[0], p0[1], z0 + h)),
              ((c[0], c[1], z0 + h), (p0[0], p0[1], z0 + h), (p1[0], p1[1], z0 + h))]
    return T
# ave en vuelo (golondrina, torcaza, rapaz): cuerpo, cabeza, cola y alas abiertas; ~0,35 m de envergadura base
obj('ave_vuelo', [('cuerpo', elipsoide((0, 0, 0), (0.09, 0.025, 0.025)) + elipsoide((0.09, 0, 0.005), (0.025, 0.02, 0.02)) +
                   [((-0.08, 0, 0), (-0.17, -0.05, 0), (-0.17, 0.05, 0)), ((-0.08, 0, 0), (-0.17, 0.05, 0), (-0.17, -0.05, 0))]),
                  ('alas', ala((0.01, 0.02), (-0.06, 0.18), 0.07, 0.005) + ala((0.01, -0.02), (-0.06, -0.18), 0.07, 0.005))])
# ave nadando (focha, pato) y garza de pie
obj('ave_agua', [('cuerpo', elipsoide((0, 0, 0.06), (0.18, 0.09, 0.07)) + elipsoide((0.15, 0, 0.17), (0.04, 0.035, 0.04))),
                 ('pico', elipsoide((0.2, 0, 0.165), (0.025, 0.012, 0.01)))])
obj('garza', [('cuerpo', elipsoide((0, 0, 0.62), (0.2, 0.08, 0.1)) + elipsoide((0.12, 0, 0.85), (0.03, 0.03, 0.18)) + elipsoide((0.2, 0, 1.02), (0.05, 0.03, 0.035))),
              ('pico', elipsoide((0.3, 0, 1.01), (0.07, 0.01, 0.01)) + cilindro((0.02, 0.04), 0.008, 0.55, 5) + cilindro((-0.02, -0.04), 0.008, 0.55, 5))])
obj('abeja', [('cuerpo', elipsoide((0, 0, 0), (0.008, 0.005, 0.005), 6, 4)), ('alas', ala((0, 0.004), (-0.004, 0.012), 0.006, 0.004) + ala((0, -0.004), (-0.004, -0.012), 0.006, 0.004))])
obj('persona', [('cuerpo', cilindro((0, 0), 0.2, 1.4, 10)), ('cabeza', elipsoide((0, 0, 1.58), (0.12, 0.12, 0.14)))])
# vehículos-ficha del diagrama de flujos (en metros reales; Unreal los agranda)
obj('camion', [('carga', caja((-0.8, 0, 1.75), (2.6, 1.2, 1.2))), ('cabina', caja((2.6, 0, 1.3), (0.8, 1.15, 0.85))), ('llantas', caja((-1.5, 0, 0.45), (2.4, 1.25, 0.45)))])
obj('furgon', [('carga', caja((-0.3, 0, 1.15), (1.5, 0.9, 0.75))), ('cabina', caja((1.6, 0, 0.9), (0.5, 0.85, 0.5))), ('llantas', caja((0, 0, 0.32), (1.6, 0.92, 0.32)))])
obj('bicicarga', [('carga', caja((0.55, 0, 0.75), (0.45, 0.45, 0.35))), ('cabina', cilindro((-0.35, 0), 0.18, 1.1, 8, 0.5) + elipsoide((-0.35, 0, 1.75), (0.12, 0.12, 0.13))),
                  ('llantas', cilindro((0.55, 0.42), 0.05, 0.4, 8) + cilindro((0.55, -0.42), 0.05, 0.4, 8) + cilindro((-0.7, 0), 0.05, 0.4, 8))])
obj('faro', [('faro', cilindro((0, 0), 1.0, 1.0, 16))])  # columna de un nodo (radio y alto 1 m; se escala)
# área cedida al humedal La Vaca: losa delgada
def triangular(poly):  # recorte de orejas (polígono antihorario), igual que en exportar_suelo.py
    idx = list(range(len(poly))); tris = []
    cruz = lambda a, b, c: (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    den = lambda p, a, b, c: cruz(a, b, p) >= -1e-9 and cruz(b, c, p) >= -1e-9 and cruz(c, a, p) >= -1e-9
    while len(idx) > 3:
        hecho = False
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]; a, b, c = poly[i0], poly[i1], poly[i2]
            if cruz(a, b, c) <= 1e-9 or any(den(poly[j], a, b, c) for j in idx if j not in (i0, i1, i2)): continue
            tris.append((i0, i1, i2)); idx.pop(k); hecho = True; break
        if not hecho:
            k = max(range(len(idx)), key=lambda k: cruz(poly[idx[k - 1]], poly[idx[k]], poly[idx[(k + 1) % len(idx)]])); tris.append((idx[k - 1], idx[k], idx[(k + 1) % len(idx)])); idx.pop(k)
    if len(idx) == 3: tris.append(tuple(idx))
    return tris
c0 = centroide(CEDIDA); cp = [(p[0] - c0[0], p[1] - c0[1]) for p in CEDIDA]
obj('area_cedida', [('cedida', [tuple((cp[i][0], cp[i][1], 0.6) for i in t) for t in triangular(cp)])])
json.dump({'centro_cedida': [round(c0[0], 1), round(c0[1], 1)]}, open(os.path.join(OUT, 'mallas.json'), 'w', encoding='utf-8'))

# ---------------------------------------------------------------- resultados
def resumen(e):
    h, led, conf = ALIM[e]; u_ = h[-1]; ult = h[-30:]
    return {'dependencia_volumen_dia_final': u_['dependencia_volumen'], 'dependencia_volumen_ult30': round(sum(x['dependencia_volumen'] for x in ult) / len(ult), 4),
            'dependencia_minima': min(x['dependencia_volumen'] for x in h),
            'dependencia_en_dias_de_apagon': round(max(x['dependencia_volumen'] for x in h[P['apagon'][0]:P['apagon'][1]]), 4),
            'hongos_entregados_dias_de_apagon_kg': round(sum(x['por_grupo']['hongos']['acopio'] for x in h[P['apagon'][0]:P['apagon'][1]]), 1),
            'factor_polinizacion_huertas': round(1 - math.exp(-fauna_prop['polinizaciones_por_flor_hora_cultivo'] / P['polin_media_saturacion']), 3),'consumo_kg_dia': u_['consumo_kg'], 'via_corabastos_kg_dia': u_['via_corabastos_kg'],
            'via_acopio_kg_dia': u_['via_acopio_kg'], 'local_kg_dia': u_['local_kg'], 'conjunta_kg_dia': u_['conjunta_kg'], 'precio_corabastos_final': u_['precio_corabastos'],
            'confianza_media_final': u_['confianza_media'], 'viajes_dia_final': u_['viajes'], 'camiones_externos_dia_final': u_['camiones_externos_corabastos'],
            'por_grupo_dia_final': u_['por_grupo'], 'cuentas_120_dias': {k: round(v, 1) for k, v in led.items()}}
RES = {'semilla': SEMILLA, 'parametros_alimentos': {k: v for k, v in P.items()}, 'fauna': {'actual': fauna_actual, 'propuesto': fauna_prop},
       'alimentos': {e: resumen(e) for e in ESC}, 'serie_diaria': {e: [{k: x[k] for k in ('dia', 'dependencia_volumen', 'precio_corabastos', 'confianza_media', 'local_kg', 'conjunta_kg', 'via_corabastos_kg')} for x in ALIM[e][0]] for e in ESC},
       'territorio': {'corabastos_ha': round(A_CORA / 1e4, 2), 'cedida_ha': round(area(CEDIDA) / 1e4, 2), 'tiendas': len(TIENDAS), 'comedores': len(COMEDORES),
                      'colegios': len(COLEGIOS), 'huertas': len(HUERTAS), 'huertas_m2': sum(h['area_m2'] for h in HUERTAS), 'accesos_camiones': len(ACCESOS)},
       'invariantes': ['cuenta de insectos (vivos + comidos = emergidos) en cada medición', 'cuenta de néctar (producido = consumido + en flores) en cada medición',
                       'cuenta de alimentos (consumido = Corabastos + otros canales + acopio) por escenario', 'identidades estables y azar por dirección lógica (misma salida con la misma semilla)']}
json.dump(RES, open(os.path.join(OUT, 'resultados.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- RESULTADOS.md (para leer sin abrir el JSON)
A = RES['alimentos']; FAp, FAa = RES['fauna']['propuesto'], RES['fauna']['actual']
def p_(v): return ('%.1f %%' % (100 * v)).replace('.', ',')
def n_(v): return ('{:,.0f}'.format(v)).replace(',', '.')
L = ['# Simulación de agentes · Kennedy360', '',
     'Generado por `tools/unreal/simular_agentes.py` (semilla %d). Todo parámetro marcado [SUP] en el código es un supuesto declarado, no un dato.' % SEMILLA, '',
     '## Dependencia de Corabastos (volumen de alimentos que pasa por la central)', '',
     '| Escenario | Dependencia (prom. últimos 30 días) | kg/día por Corabastos | kg/día por el acopio | de eso, producción local | de eso, compra conjunta | precio relativo de Corabastos |',
     '|---|---|---|---|---|---|---|']
for e in ESC:
    a = A[e]; L.append('| %s | %s | %s | %s | %s | %s | %s |' % (e.replace('_', ' '), p_(a['dependencia_volumen_ult30']), n_(a['via_corabastos_kg_dia']), n_(a['via_acopio_kg_dia']),
                                                              n_(a['local_kg_dia']), n_(a['conjunta_kg_dia']), ('%.3f' % a['precio_corabastos_final']).replace('.', ',')))
L += ['', 'Consumo modelado: %s kg/día (%d tiendas, %d comedores de 500 raciones y %d colegios de 800 raciones).' % (n_(A['actual']['consumo_kg_dia']), len(TIENDAS), len(COMEDORES), len(COLEGIOS)), '',
      '### Por grupo de alimentos, día final del escenario propuesto (kg/día)', '', '| Grupo | Corabastos | Acopio | Otros canales |', '|---|---|---|---|']
for g, d in A['propuesto']['por_grupo_dia_final'].items(): L.append('| %s | %s | %s | %s |' % (g.replace('_', ' '), n_(d['cora']), n_(d['acopio']), n_(d['otros'])))
L += ['', 'Lo que sigue llegando por Corabastos es lo que Kennedy no produce ni compra en conjunto: sobre todo carne y lácteos, y la parte de frutas y granos que supera la capacidad de las asociaciones de productores. La autonomía es relativa (corrección 3.8).', '',
      '### Apagón en el distrito', '',
      'Durante los días %d a %d el distrito trabaja con respaldo (biogás del compostaje + solar, %s de su producción). Dependencia máxima en esos días: %s (sin apagón: %s). Hongos entregados en esos días: %s kg (sin apagón: %s kg).' % (
          P['apagon'][0], P['apagon'][1] - 1, p_(P['energia_respaldo']), p_(A['propuesto_apagon']['dependencia_en_dias_de_apagon']), p_(A['propuesto']['dependencia_en_dias_de_apagon']),
          n_(A['propuesto_apagon']['hongos_entregados_dias_de_apagon_kg']), n_(A['propuesto']['hongos_entregados_dias_de_apagon_kg'])), '',
      '### Viajes del día final', '', '| Escenario | Camiones externos a Corabastos | Compras en Corabastos | Bicicargas del acopio | Furgones del acopio |', '|---|---|---|---|---|']
for e in ESC:
    v = A[e]['viajes_dia_final']; L.append('| %s | %d | %d | %d | %d |' % (e.replace('_', ' '), A[e]['camiones_externos_dia_final'], v['comprador_cora'], v['bicicarga'], v['comprador_acopio']))
L += ['', '## Fauna del humedal El Burro (%d min simulados por escenario)' % round(FAp['segundos_simulados'] / 60), '',
      '| Métrica | Actual | Propuesto |', '|---|---|---|',
      '| Polinizaciones por parche de cultivo y hora | %.1f | %.1f |' % (FAa['polinizaciones_por_flor_hora_cultivo'], FAp['polinizaciones_por_flor_hora_cultivo']),
      '| Visitas de abejas a flora de la ronda por hora | %s | %s |' % (n_(FAa['visitas_flora_ronda_hora']), n_(FAp['visitas_flora_ronda_hora'])),
      '', 'Las bandadas no cambian entre escenarios en este modelo (la propuesta actúa sobre flores y huertas, no sobre el espejo de agua):', '',
      '| Métrica de las bandadas (patrones POM) | Valor |', '|---|---|',
      '| Polarización media de las golondrinas (0 = enjambre, 1 = todas en la misma dirección) | %.2f |' % FAp['bandadas']['polarizacion_golondrinas_media'],
      '| Giro de grupo medio de las golondrinas (1 = remolino) | %.2f |' % FAp['bandadas']['giro_golondrinas_media'],
      '| Polarización media de las torcazas | %.2f |' % FAp['bandadas']['polarizacion_torcazas_media'],
      '| Cohesión del enjambre de quironómidos (Lin & Abaid) | %.2f |' % FAp['bandadas']['cohesion_enjambre_media'],
      '| Insectos cazados por golondrina y minuto | %.2f |' % FAp['insectos']['capturas_por_golondrina_min'],
      '| Ataques / capturas de la aguililla sobre las torcazas | %d / %d |' % (FAp['rapaz']['ataques'], FAp['rapaz']['capturas']), '',
      'Acople entre los dos submodelos: las polinizaciones del escenario propuesto dan un factor de polinización de %s para la parte de la cosecha que depende de polinizadores (%s de las huertas).' % (
          p_(A['propuesto']['factor_polinizacion_huertas']), p_(P['frac_cultivo_polinizado'])), '',
      '## Invariantes comprobadas en cada corrida', ''] + ['- ' + s for s in RES['invariantes']] + ['',
      '## Leyenda de colores en Unreal', '',
      '- Fichas: rojo camión externo a Corabastos · ocre tendero que compra en Corabastos · naranja compra conjunta al acopio · verde bicicarga del acopio · verde oscuro furgón del acopio · morado hongos del distrito · verde claro cosecha de huertas · café compost.',
      '- Columnas (nodos): rojo Corabastos · ocre acopio · morado distrito · café compostaje · verde huertas · amarillo tiendas · verde claro comedores · azul colegios. Losa verde translúcida: área cedida al humedal La Vaca.',
      '- Aves en vuelo a escala x4, aves del agua x2, abejas x12 y fichas de vehículos x10 para que se lean en el render.']
open(os.path.join(OUT, 'RESULTADOS.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('listo: %s' % OUT)
